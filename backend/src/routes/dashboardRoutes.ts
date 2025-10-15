import { Router } from 'express';
import { authenticate, requireLeadership } from '../middleware/authMiddleware';
import * as dashboardController from '../controllers/dashboardController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get scoreboard data (public for all authenticated users)
router.get('/scoreboard', dashboardController.getScoreboard);

// Leadership KPIs (restricted)
router.get('/leadership-kpis', requireLeadership, dashboardController.getLeadershipKPIs);

// Employee dashboard stats
router.get('/employee-stats', dashboardController.getEmployeeStats);

// Manager dashboard stats
router.get('/manager-stats', dashboardController.getManagerStats);

export default router;
