import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as timesheetController from '../controllers/timesheetController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user's timesheets
router.get('/', timesheetController.getUserTimesheets);

// Get specific timesheet by ID
router.get('/:id', timesheetController.getTimesheetById);

// Create new timesheet
router.post('/', timesheetController.createTimesheet);

// Update timesheet
router.put('/:id', timesheetController.updateTimesheet);

// Delete timesheet (draft only)
router.delete('/:id', timesheetController.deleteTimesheet);

// Submit timesheet for approval
router.post('/:id/submit', timesheetController.submitTimesheet);

// Time entry operations
router.post('/:id/entries', timesheetController.addTimeEntry);
router.put('/:id/entries/:entryId', timesheetController.updateTimeEntry);
router.delete('/:id/entries/:entryId', timesheetController.deleteTimeEntry);

// Bulk entry operations
router.post('/:id/bulk-entries', timesheetController.bulkAddEntries);

export default router;
