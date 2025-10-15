import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/authMiddleware';
import * as reportController from '../controllers/reportController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get hours by project report
router.get('/hours-by-project', requireManager, reportController.getHoursByProject);

// Get grant report
router.get('/grant-report', requireManager, reportController.getGrantReport);

// Export report to Excel
router.post('/export', requireManager, reportController.exportToExcel);

// Employee summary report
router.get('/employee-summary', reportController.getEmployeeSummary);

export default router;
