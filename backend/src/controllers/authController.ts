import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getPool } from '../config/database';

export const login = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement login logic
  res.status(200).json({
    status: 'success',
    message: 'Login endpoint - to be implemented',
  });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const userId = req.user!.userId;

  // Get extended profile with department and manager info
  const result = await pool.request()
    .input('userId', userId)
    .query(`
      SELECT
        u.UserID,
        u.EntraIDObjectID,
        u.Email,
        u.Name,
        u.DepartmentID,
        u.Role,
        u.ManagerEntraID,
        d.DepartmentName,
        m.Name AS ManagerName
      FROM Users u
      LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
      LEFT JOIN Users m ON u.ManagerEntraID = m.EntraIDObjectID
      WHERE u.UserID = @userId
    `);

  if (result.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'User not found' });
    return;
  }

  const user = result.recordset[0];

  res.status(200).json({
    status: 'success',
    data: {
      userId: user.UserID,
      entraId: user.EntraIDObjectID,
      email: user.Email,
      name: user.Name,
      departmentId: user.DepartmentID,
      departmentName: user.DepartmentName,
      role: user.Role,
      managerName: user.ManagerName,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Logout successful',
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement token refresh
  res.status(200).json({
    status: 'success',
    message: 'Token refresh - to be implemented',
  });
});
