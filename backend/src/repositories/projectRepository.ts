import { getPool } from '../config/database';
import { Project } from '../models/types';

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

export const createProject = async (project: Partial<Project>): Promise<number> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('projectNumber', project.ProjectNumber)
    .input('projectName', project.ProjectName)
    .input('departmentId', project.DepartmentID)
    .input('projectType', project.ProjectType)
    .input('grantIdentifier', project.GrantIdentifier)
    .query(`
      INSERT INTO Projects (ProjectNumber, ProjectName, DepartmentID, ProjectType, GrantIdentifier, IsActive)
      VALUES (@projectNumber, @projectName, @departmentId, @projectType, @grantIdentifier, 1);
      SELECT SCOPE_IDENTITY() AS ProjectID;
    `);

  return result.recordset[0].ProjectID;
};
