/**
 * Authentication Service
 * Handles user authentication and token management
 */

import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth';
import { getUserByEntraId, updateLastLogin } from '../repositories/userRepository';
import { AuthUser } from '../middleware/authMiddleware';

export const generateToken = (user: AuthUser): string => {
  const payload = {
    userId: user.userId,
    entraId: user.entraId,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const authenticateUser = async (entraId: string): Promise<AuthUser | null> => {
  const user = await getUserByEntraId(entraId);

  if (!user) {
    return null;
  }

  // Update last login timestamp
  await updateLastLogin(user.UserID);

  return {
    userId: user.UserID,
    entraId: user.EntraIDObjectID,
    email: user.Email,
    name: user.Name,
    departmentId: user.DepartmentID,
    role: user.Role,
  };
};
