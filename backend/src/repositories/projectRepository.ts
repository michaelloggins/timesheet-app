import { getPool } from '../config/database';
import { Project, ProjectDepartment, ProjectEmployee, ProjectWithAssignments } from '../models/types';

export const findProjectsByDepartment = async (departmentId: number): Promise<Project[]> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('departmentId', departmentId)
    .query(`
      SELECT * FROM Projects
      WHERE DepartmentID = @departmentId AND IsActive = 1
      ORDER BY ProjectName
    `);

  return result.recordset;
};

export const findProjectById = async (projectId: number): Promise<Project | null> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('projectId', projectId)
    .query(`
      SELECT * FROM Projects
      WHERE ProjectID = @projectId
    `);

  return result.recordset[0] || null;
};

/**
 * Get a project with all its assignments (departments and employees)
 */
export const findProjectWithAssignments = async (projectId: number): Promise<ProjectWithAssignments | null> => {
  const pool = getPool();

  // Get project with primary department name
  const projectResult = await pool
    .request()
    .input('projectId', projectId)
    .query(`
      SELECT p.*, d.DepartmentName
      FROM Projects p
      LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
      WHERE p.ProjectID = @projectId
    `);

  if (projectResult.recordset.length === 0) {
    return null;
  }

  const project = projectResult.recordset[0] as ProjectWithAssignments;

  // Get assigned departments
  const deptResult = await pool
    .request()
    .input('projectId', projectId)
    .query(`
      SELECT pd.ProjectDepartmentID, pd.ProjectID, pd.DepartmentID, d.DepartmentName, pd.CreatedDate
      FROM ProjectDepartments pd
      INNER JOIN Departments d ON pd.DepartmentID = d.DepartmentID
      WHERE pd.ProjectID = @projectId
      ORDER BY d.DepartmentName
    `);

  project.AssignedDepartments = deptResult.recordset;

  // Get assigned employees
  const empResult = await pool
    .request()
    .input('projectId', projectId)
    .query(`
      SELECT pe.ProjectEmployeeID, pe.ProjectID, pe.UserID, u.Name as UserName, u.Email as UserEmail,
             u.DepartmentID, d.DepartmentName, pe.CreatedDate
      FROM ProjectEmployees pe
      INNER JOIN Users u ON pe.UserID = u.UserID
      LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
      WHERE pe.ProjectID = @projectId
      ORDER BY u.Name
    `);

  project.AssignedEmployees = empResult.recordset;

  return project;
};

/**
 * Get projects accessible to a specific user based on:
 * 1. Universal projects (no department assignments AND no employee assignments)
 * 2. Projects assigned to the user's department
 * 3. Projects directly assigned to the user
 */
export const findProjectsForUser = async (userId: number): Promise<Project[]> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('userId', userId)
    .query(`
      SELECT DISTINCT p.ProjectID, p.ProjectNumber, p.ProjectName, p.DepartmentID,
             p.ProjectType, p.GrantIdentifier, p.IsActive, p.CreatedDate, p.ModifiedDate,
             d.DepartmentName
      FROM Projects p
      LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
      INNER JOIN Users u ON u.UserID = @userId
      WHERE p.IsActive = 1
        AND (
          -- Universal project: no departments assigned AND no employees assigned
          (
            NOT EXISTS (SELECT 1 FROM ProjectDepartments pd WHERE pd.ProjectID = p.ProjectID)
            AND NOT EXISTS (SELECT 1 FROM ProjectEmployees pe WHERE pe.ProjectID = p.ProjectID)
          )
          -- OR user's department is assigned to the project
          OR EXISTS (
            SELECT 1 FROM ProjectDepartments pd
            WHERE pd.ProjectID = p.ProjectID AND pd.DepartmentID = u.DepartmentID
          )
          -- OR user is directly assigned to the project
          OR EXISTS (
            SELECT 1 FROM ProjectEmployees pe
            WHERE pe.ProjectID = p.ProjectID AND pe.UserID = @userId
          )
        )
      ORDER BY p.ProjectNumber
    `);

  return result.recordset;
};

/**
 * Get departments assigned to a project
 */
export const findProjectDepartments = async (projectId: number): Promise<ProjectDepartment[]> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('projectId', projectId)
    .query(`
      SELECT pd.ProjectDepartmentID, pd.ProjectID, pd.DepartmentID, d.DepartmentName, pd.CreatedDate
      FROM ProjectDepartments pd
      INNER JOIN Departments d ON pd.DepartmentID = d.DepartmentID
      WHERE pd.ProjectID = @projectId
      ORDER BY d.DepartmentName
    `);

  return result.recordset;
};

/**
 * Get employees assigned to a project
 */
export const findProjectEmployees = async (projectId: number): Promise<ProjectEmployee[]> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('projectId', projectId)
    .query(`
      SELECT pe.ProjectEmployeeID, pe.ProjectID, pe.UserID, u.Name as UserName, u.Email as UserEmail,
             u.DepartmentID, d.DepartmentName, pe.CreatedDate
      FROM ProjectEmployees pe
      INNER JOIN Users u ON pe.UserID = u.UserID
      LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
      WHERE pe.ProjectID = @projectId
      ORDER BY u.Name
    `);

  return result.recordset;
};

/**
 * Set departments for a project (replaces existing assignments)
 */
export const setProjectDepartments = async (projectId: number, departmentIds: number[]): Promise<void> => {
  const pool = getPool();

  // Delete existing assignments
  await pool
    .request()
    .input('projectId', projectId)
    .query('DELETE FROM ProjectDepartments WHERE ProjectID = @projectId');

  // Insert new assignments
  for (const departmentId of departmentIds) {
    await pool
      .request()
      .input('projectId', projectId)
      .input('departmentId', departmentId)
      .query(`
        INSERT INTO ProjectDepartments (ProjectID, DepartmentID)
        VALUES (@projectId, @departmentId)
      `);
  }
};

/**
 * Set employees for a project (replaces existing assignments)
 */
export const setProjectEmployees = async (projectId: number, userIds: number[]): Promise<void> => {
  const pool = getPool();

  // Delete existing assignments
  await pool
    .request()
    .input('projectId', projectId)
    .query('DELETE FROM ProjectEmployees WHERE ProjectID = @projectId');

  // Insert new assignments
  for (const userId of userIds) {
    await pool
      .request()
      .input('projectId', projectId)
      .input('userId', userId)
      .query(`
        INSERT INTO ProjectEmployees (ProjectID, UserID)
        VALUES (@projectId, @userId)
      `);
  }
};

/**
 * Get employees from specific departments (for employee targeting UI)
 */
export const findEmployeesByDepartments = async (departmentIds: number[]): Promise<{
  userId: number;
  name: string;
  email: string;
  departmentId: number;
  departmentName: string;
}[]> => {
  if (departmentIds.length === 0) {
    return [];
  }

  const pool = getPool();

  // Build IN clause with parameterized values
  const deptParams = departmentIds.map((_, i) => `@dept${i}`).join(', ');
  const request = pool.request();
  departmentIds.forEach((id, i) => request.input(`dept${i}`, id));

  const result = await request.query(`
    SELECT u.UserID as userId, u.Name as name, u.Email as email,
           u.DepartmentID as departmentId, d.DepartmentName as departmentName
    FROM Users u
    INNER JOIN Departments d ON u.DepartmentID = d.DepartmentID
    WHERE u.IsActive = 1
      AND u.DepartmentID IN (${deptParams})
    ORDER BY d.DepartmentName, u.Name
  `);

  return result.recordset;
};

export const createProject = async (project: Partial<Project>): Promise<number> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('projectNumber', project.ProjectNumber)
    .input('projectName', project.ProjectName)
    .input('departmentId', project.DepartmentID || null)
    .input('projectType', project.ProjectType)
    .input('grantIdentifier', project.GrantIdentifier)
    .query(`
      INSERT INTO Projects (ProjectNumber, ProjectName, DepartmentID, ProjectType, GrantIdentifier, IsActive)
      VALUES (@projectNumber, @projectName, @departmentId, @projectType, @grantIdentifier, 1);
      SELECT SCOPE_IDENTITY() AS ProjectID;
    `);

  return result.recordset[0].ProjectID;
};
