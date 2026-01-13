import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/authMiddleware';
import * as approvalController from '../controllers/approvalController';

const router = Router();

// All routes require authentication and manager role
router.use(authenticate, requireManager);

// Get approvals (supports status filter via query param: ?status=Submitted,Approved,Returned)
router.get('/', approvalController.getPendingApprovals);

// Get pending approvals (convenience endpoint)
router.get('/pending', approvalController.getPendingApprovals);

// Get approval history
router.get('/history', approvalController.getApprovalHistory);

// Get timesheet entries for detail view
router.get('/:timesheetId/entries', approvalController.getTimesheetEntries);

// Approve timesheet
router.post('/:timesheetId/approve', approvalController.approveTimesheet);

// Return timesheet with notes
router.post('/:timesheetId/return', approvalController.returnTimesheet);

// Unlock approved timesheet
router.post('/:timesheetId/unlock', approvalController.unlockTimesheet);

export default router;
