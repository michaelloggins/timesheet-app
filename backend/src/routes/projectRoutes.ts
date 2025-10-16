import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import * as projectController from '../controllers/projectController';

const router = Router();

// All routes require authentication (disabled in development for testing)
if (process.env.NODE_ENV !== 'development') {
  router.use(authenticate);
}

// Get projects (filtered by department)
router.get('/', projectController.getProjects);

// Get project by ID
router.get('/:id', projectController.getProjectById);

// Admin-only routes
router.post('/', requireAdmin, projectController.createProject);
router.put('/:id', requireAdmin, projectController.updateProject);
router.delete('/:id', requireAdmin, projectController.deactivateProject);

export default router;
