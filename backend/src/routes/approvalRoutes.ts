import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/authMiddleware';
import * as approvalController from '../controllers/approvalController';

const router = Router();

// All routes require authentication and manager role
router.use(authenticate, requireManager);

// Get pending approvals
router.get('/pending', approvalController.getPendingApprovals);

// Get approval history
router.get('/history', approvalController.getApprovalHistory);

// Approve timesheet
router.post('/:timesheetId/approve', approvalController.approveTimesheet);

// Return timesheet with notes
router.post('/:timesheetId/return', approvalController.returnTimesheet);

// Unlock approved timesheet
router.post('/:timesheetId/unlock', approvalController.unlockTimesheet);

export default router;
