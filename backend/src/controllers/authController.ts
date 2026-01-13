import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getPool } from '../config/database';
import { avatarService } from '../services/avatarService';

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

/**
 * Get current user's avatar
 * GET /api/auth/avatar
 */
export const getMyAvatar = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Try to get cached avatar first (fast path - no Graph API call)
  const cachedPath = avatarService.getCachedAvatarPath(userId);
  if (cachedPath) {
    res.sendFile(cachedPath);
    return;
  }

  // No cached avatar, try to fetch and cache
  const result = await avatarService.getAvatar(userId);
  if (result) {
    res.sendFile(result.path);
    return;
  }

  // No avatar available
  res.status(404).json({ status: 'error', message: 'No avatar available' });
});

/**
 * Get avatar for a specific user
 * GET /api/auth/avatar/:userId
 */
export const getUserAvatar = asyncHandler(async (req: Request, res: Response) => {
  const targetUserId = parseInt(req.params.userId);

  // Try to get cached avatar first (fast path - no Graph API call)
  const cachedPath = avatarService.getCachedAvatarPath(targetUserId);
  if (cachedPath) {
    res.sendFile(cachedPath);
    return;
  }

  // No cached avatar, try to fetch and cache
  const result = await avatarService.getAvatar(targetUserId);
  if (result) {
    res.sendFile(result.path);
    return;
  }

  // No avatar available
  res.status(404).json({ status: 'error', message: 'No avatar available' });
});

/**
 * Sync avatar using user's Graph token
 * POST /api/auth/avatar/sync
 * Body: { accessToken: string } - the user's Graph API access token
 */
export const syncMyAvatar = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { accessToken } = req.body;

  if (!accessToken) {
    res.status(400).json({ status: 'error', message: 'accessToken is required' });
    return;
  }

  const success = await avatarService.syncAvatarWithUserToken(userId, accessToken);

  if (success) {
    res.status(200).json({ status: 'success', message: 'Avatar synced' });
  } else {
    res.status(200).json({ status: 'success', message: 'No avatar available or sync failed' });
  }
});
