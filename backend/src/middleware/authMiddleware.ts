import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { bearerStrategy } from '../config/auth';
import { AppError, asyncHandler } from './errorHandler';
import { getUserByEntraId, updateLastLogin } from '../repositories/userRepository';

// Initialize passport
passport.use(bearerStrategy);

export interface AuthUser {
  userId: number;
  entraId: string;
  email: string;
  name: string;
  departmentId: number;
  role: 'Employee' | 'Manager' | 'TimesheetAdmin' | 'Leadership';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AuthUser {}
  }
}

export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'oauth-bearer',
      { session: false },
      async (err: Error, user: any, _info: any) => {
        if (err) {
          return next(new AppError(500, 'Authentication error'));
        }

        if (!user) {
          return next(new AppError(401, 'Unauthorized - Invalid or missing token'));
        }

        try {
          // Get user from database using Entra ID
          const dbUser = await getUserByEntraId(user.entraId);

          if (!dbUser) {
            return next(new AppError(401, 'User not found in system'));
          }

          // Update last login timestamp (fire and forget - don't block auth)
          updateLastLogin(dbUser.UserID).catch(() => {
            // Silently ignore errors - login tracking is not critical
          });

          // Attach user to request
          req.user = {
            userId: dbUser.UserID,
            entraId: dbUser.EntraIDObjectID,
            email: dbUser.Email,
            name: dbUser.Name,
            departmentId: dbUser.DepartmentID,
            role: dbUser.Role,
          };

          next();
        } catch (error) {
          return next(new AppError(500, 'Error retrieving user information'));
        }
      }
    )(req, res, next);
  }
);

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, `Access denied. Required role: ${allowedRoles.join(' or ')}`)
      );
    }

    next();
  };
};

export const requireManager = requireRole(['Manager', 'TimesheetAdmin', 'Leadership']);
export const requireAdmin = requireRole(['TimesheetAdmin']);
export const requireLeadership = requireRole(['Leadership', 'TimesheetAdmin']);
