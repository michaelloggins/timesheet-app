import { Router } from 'express';
import { authenticate, requireManager, requireAdmin } from '../middleware/authMiddleware';
import * as reportController from '../controllers/reportController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all time entries with filters (managers only)
router.get('/time-entries', requireManager, reportController.getTimeEntries);

// Get filter options (for dropdowns)
router.get('/filter-options', requireManager, reportController.getFilterOptions);

// Get hours by project report
router.get('/hours-by-project', requireManager, reportController.getHoursByProject);

// Get grant report
router.get('/grant-report', requireManager, reportController.getGrantReport);

// Export report to Excel (admin only)
router.post('/export', requireAdmin, reportController.exportToExcel);

// Employee summary report (all users can access their own)
router.get('/employee-summary', reportController.getEmployeeSummary);

export default router;
