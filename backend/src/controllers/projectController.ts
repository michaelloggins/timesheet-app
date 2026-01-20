import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import { logAdminAction } from '../utils/adminAuditLogger';
import * as projectRepository from '../repositories/projectRepository';

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { active, departmentId, forUser } = req.query;

  // If forUser is specified, return only projects accessible to that user
  if (forUser === 'true') {
    const user = req.user!;
    const projects = await projectRepository.findProjectsForUser(user.userId);
    res.status(200).json({ status: 'success', data: projects });
    return;
  }

  let query = `
    SELECT p.ProjectID, p.ProjectNumber, p.ProjectName, p.DepartmentID,
           p.ProjectType, p.GrantIdentifier, p.IsActive,
           p.CreatedDate, p.ModifiedDate, p.DeactivatedDate, p.DeactivatedReason,
           d.DepartmentName
    FROM Projects p
    LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
    WHERE 1=1
  `;

  if (active === 'true') {
    query += ' AND p.IsActive = 1';
  }
  if (departmentId) {
    query += ` AND p.DepartmentID = ${parseInt(departmentId as string)}`;
  }

  query += ' ORDER BY p.ProjectNumber';

  const result = await pool.request().query(query);
  res.status(200).json({ status: 'success', data: result.recordset });
});

export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  const { includeAssignments } = req.query;

  if (includeAssignments === 'true') {
    // Get project with full assignments
    const project = await projectRepository.findProjectWithAssignments(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', message: 'Project not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: project });
    return;
  }

  // Get project without assignments (original behavior)
  const pool = getPool();
  const result = await pool.request()
    .input('id', projectId)
    .query(`
      SELECT p.*, d.DepartmentName
      FROM Projects p
      LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
      WHERE p.ProjectID = @id
    `);

  if (result.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Project not found' });
    return;
  }

  res.status(200).json({ status: 'success', data: result.recordset[0] });
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const user = req.user!;
  const {
    projectNumber,
    projectName,
    departmentId,
    projectType,
    grantIdentifier,
    isActive = true,
    assignedDepartmentIds,
    assignedEmployeeIds,
  } = req.body;

  // departmentId is optional - NULL means universal/all departments (legacy support)
  if (!projectNumber || !projectName) {
    res.status(400).json({ status: 'error', message: 'Project number and name are required' });
    return;
  }

  // Check for duplicate project number
  const existing = await pool.request()
    .input('num', projectNumber)
    .query('SELECT ProjectID FROM Projects WHERE ProjectNumber = @num');

  if (existing.recordset.length > 0) {
    res.status(400).json({ status: 'error', message: 'Project number already exists' });
    return;
  }

  const result = await pool.request()
    .input('num', projectNumber)
    .input('name', projectName)
    .input('deptId', departmentId || null) // NULL = universal/all departments
    .input('type', projectType || 'Work')
    .input('grant', grantIdentifier || null)
    .input('active', isActive)
    .query(`
      INSERT INTO Projects (ProjectNumber, ProjectName, DepartmentID, ProjectType, GrantIdentifier, IsActive)
      VALUES (@num, @name, @deptId, @type, @grant, @active);
      SELECT SCOPE_IDENTITY() AS ProjectID;
    `);

  const projectId = result.recordset[0].ProjectID;

  // Handle multi-department assignments
  if (assignedDepartmentIds && Array.isArray(assignedDepartmentIds)) {
    await projectRepository.setProjectDepartments(projectId, assignedDepartmentIds);
  }

  // Handle employee assignments
  if (assignedEmployeeIds && Array.isArray(assignedEmployeeIds)) {
    await projectRepository.setProjectEmployees(projectId, assignedEmployeeIds);
  }

  logger.info(`Created project: ${projectName} (${projectNumber})`);

  // Log admin action
  await logAdminAction({
    actionType: 'PROJECT_CREATE',
    actionByUserId: user.userId,
    entityType: 'Project',
    entityId: projectId,
    entityName: `${projectNumber} - ${projectName}`,
    details: {
      projectNumber,
      projectName,
      departmentId,
      projectType,
      grantIdentifier,
      assignedDepartmentIds,
      assignedEmployeeIds,
    },
    ipAddress: req.ip || req.socket.remoteAddress,
  });

  // Return the full project with assignments
  const createdProject = await projectRepository.findProjectWithAssignments(projectId);

  res.status(201).json({
    status: 'success',
    data: createdProject,
  });
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const user = req.user!;
  const projectId = parseInt(req.params.id);
  const {
    projectNumber,
    projectName,
    departmentId,
    projectType,
    grantIdentifier,
    isActive,
    assignedDepartmentIds,
    assignedEmployeeIds,
  } = req.body;

  // Check if project exists
  const existing = await pool.request()
    .input('id', projectId)
    .query('SELECT ProjectID, IsActive, ProjectName FROM Projects WHERE ProjectID = @id');

  if (existing.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Project not found' });
    return;
  }

  // Check for duplicate project number (excluding current)
  if (projectNumber) {
    const duplicate = await pool.request()
      .input('num', projectNumber)
      .input('id', projectId)
      .query('SELECT ProjectID FROM Projects WHERE ProjectNumber = @num AND ProjectID != @id');

    if (duplicate.recordset.length > 0) {
      res.status(400).json({ status: 'error', message: 'Project number already exists' });
      return;
    }
  }

  // If reactivating, clear deactivation fields
  const wasDeactivated = !existing.recordset[0].IsActive;
  const isReactivating = wasDeactivated && isActive === true;

  // Handle departmentId - use undefined to keep existing value, null to clear it
  const deptIdValue = departmentId === undefined ? undefined : (departmentId === null ? null : departmentId);

  await pool.request()
    .input('id', projectId)
    .input('num', projectNumber)
    .input('name', projectName)
    .input('deptId', deptIdValue)
    .input('type', projectType)
    .input('grant', grantIdentifier)
    .input('active', isActive)
    .query(`
      UPDATE Projects
      SET ProjectNumber = COALESCE(@num, ProjectNumber),
          ProjectName = COALESCE(@name, ProjectName),
          DepartmentID = ${departmentId === undefined ? 'DepartmentID' : '@deptId'},
          ProjectType = COALESCE(@type, ProjectType),
          GrantIdentifier = @grant,
          IsActive = COALESCE(@active, IsActive),
          DeactivatedDate = ${isReactivating ? 'NULL' : 'DeactivatedDate'},
          DeactivatedReason = ${isReactivating ? 'NULL' : 'DeactivatedReason'},
          ModifiedDate = GETUTCDATE()
      WHERE ProjectID = @id
    `);

  // Handle multi-department assignments (if provided)
  if (assignedDepartmentIds !== undefined && Array.isArray(assignedDepartmentIds)) {
    await projectRepository.setProjectDepartments(projectId, assignedDepartmentIds);
  }

  // Handle employee assignments (if provided)
  if (assignedEmployeeIds !== undefined && Array.isArray(assignedEmployeeIds)) {
    await projectRepository.setProjectEmployees(projectId, assignedEmployeeIds);
  }

  logger.info(`Updated project ${projectId}`);

  // Fetch updated project with assignments
  const updatedProject = await projectRepository.findProjectWithAssignments(projectId);

  // Log admin action
  await logAdminAction({
    actionType: 'PROJECT_UPDATE',
    actionByUserId: user.userId,
    entityType: 'Project',
    entityId: projectId,
    entityName: updatedProject?.ProjectName || existing.recordset[0].ProjectName,
    details: {
      projectNumber,
      projectName,
      departmentId,
      projectType,
      grantIdentifier,
      isActive,
      assignedDepartmentIds,
      assignedEmployeeIds,
    },
    ipAddress: req.ip || req.socket.remoteAddress,
  });

  res.status(200).json({ status: 'success', data: updatedProject });
});

/**
 * Deactivate project (soft delete)
 * Projects are NEVER hard deleted - only deactivated for future archive process
 */
export const deactivateProject = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const user = req.user!;
  const projectId = parseInt(req.params.id);
  const { reason } = req.body;

  const existing = await pool.request()
    .input('id', projectId)
    .query('SELECT ProjectID, ProjectName FROM Projects WHERE ProjectID = @id');

  if (existing.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Project not found' });
    return;
  }

  await pool.request()
    .input('id', projectId)
    .input('reason', reason || 'Deactivated by administrator')
    .query(`
      UPDATE Projects
      SET IsActive = 0,
          DeactivatedDate = GETUTCDATE(),
          DeactivatedReason = @reason,
          ModifiedDate = GETUTCDATE()
      WHERE ProjectID = @id
    `);

  logger.info(`Deactivated project ${projectId}: ${existing.recordset[0].ProjectName}`);

  // Log admin action
  await logAdminAction({
    actionType: 'PROJECT_DEACTIVATE',
    actionByUserId: user.userId,
    entityType: 'Project',
    entityId: projectId,
    entityName: existing.recordset[0].ProjectName,
    details: { reason },
    ipAddress: req.ip || req.socket.remoteAddress,
  });

  res.status(200).json({
    status: 'success',
    message: 'Project deactivated',
    data: { projectId, deactivated: true },
  });
});

/**
 * Get employees by departments
 * Used for employee targeting UI when selecting specific employees for a project
 */
export const getEmployeesByDepartments = asyncHandler(async (req: Request, res: Response) => {
  const { departmentIds } = req.query;

  if (!departmentIds) {
    res.status(400).json({ status: 'error', message: 'departmentIds query parameter is required' });
    return;
  }

  // Parse comma-separated department IDs
  const deptIdArray = (departmentIds as string)
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));

  if (deptIdArray.length === 0) {
    res.status(200).json({ status: 'success', data: [] });
    return;
  }

  const employees = await projectRepository.findEmployeesByDepartments(deptIdArray);
  res.status(200).json({ status: 'success', data: employees });
});

/**
 * Get project assignments (departments and employees)
 */
export const getProjectAssignments = asyncHandler(async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);

  const departments = await projectRepository.findProjectDepartments(projectId);
  const employees = await projectRepository.findProjectEmployees(projectId);

  res.status(200).json({
    status: 'success',
    data: {
      departments,
      employees,
    },
  });
});
