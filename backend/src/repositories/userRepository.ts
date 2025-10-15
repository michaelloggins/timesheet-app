import { getPool } from '../config/database';
import { User } from '../models/types';

export const getUserByEntraId = async (entraId: string): Promise<User | null> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('entraId', entraId)
    .query(`
      SELECT UserID, EntraIDObjectID, Email, Name, DepartmentID, Role, IsActive,
             CreatedDate, LastLoginDate
      FROM Users
      WHERE EntraIDObjectID = @entraId AND IsActive = 1
    `);

  return result.recordset[0] || null;
};

export const getUserById = async (userId: number): Promise<User | null> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('userId', userId)
    .query(`
      SELECT UserID, EntraIDObjectID, Email, Name, DepartmentID, Role, IsActive,
             CreatedDate, LastLoginDate
      FROM Users
      WHERE UserID = @userId
    `);

  return result.recordset[0] || null;
};

export const createUser = async (user: Partial<User>): Promise<number> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('entraId', user.EntraIDObjectID)
    .input('email', user.Email)
    .input('name', user.Name)
    .input('departmentId', user.DepartmentID)
    .input('role', user.Role || 'Employee')
    .query(`
      INSERT INTO Users (EntraIDObjectID, Email, Name, DepartmentID, Role)
      VALUES (@entraId, @email, @name, @departmentId, @role);
      SELECT SCOPE_IDENTITY() AS UserID;
    `);

  return result.recordset[0].UserID;
};

export const updateLastLogin = async (userId: number): Promise<void> => {
  const pool = getPool();
  await pool
    .request()
    .input('userId', userId)
    .query(`
      UPDATE Users
      SET LastLoginDate = GETUTCDATE()
      WHERE UserID = @userId
    `);
};
