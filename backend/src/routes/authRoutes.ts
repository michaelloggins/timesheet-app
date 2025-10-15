import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as authController from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Login endpoint - exchange Entra ID token for session
router.post('/login', authRateLimiter, authController.login);

// Get current user profile
router.get('/profile', authenticate, authController.getProfile);

// Logout endpoint
router.post('/logout', authenticate, authController.logout);

// Refresh token
router.post('/refresh', authRateLimiter, authController.refreshToken);

export default router;
