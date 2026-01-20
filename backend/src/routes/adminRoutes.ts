import { Router } from 'express';
import { authenticate, requireAdmin, requireAuditReviewer } from '../middleware/authMiddleware';
import * as adminController from '../controllers/adminController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User management - TimesheetAdmin only
router.get('/users', requireAdmin, adminController.getUsers);
router.post('/users', requireAdmin, adminController.createUser);
router.put('/users/:id', requireAdmin, adminController.updateUser);
router.delete('/users/:id', requireAdmin, adminController.deactivateUser);
router.post('/users/sync', requireAdmin, adminController.syncUsersFromEntra);

// Department management - TimesheetAdmin only
router.get('/departments', requireAdmin, adminController.getDepartments);
router.post('/departments', requireAdmin, adminController.createDepartment);
router.put('/departments/:id', requireAdmin, adminController.updateDepartment);

// Excel import - TimesheetAdmin only
router.post('/import/projects', requireAdmin, adminController.importProjects);
router.post('/import/timesheets', requireAdmin, adminController.importTimesheets);

// System configuration - TimesheetAdmin only
router.get('/config', requireAdmin, adminController.getSystemConfig);
router.put('/config', requireAdmin, adminController.updateSystemConfig);

// Audit logs - Timesheet Activity accessible by TimesheetAdmin and AuditReviewer
router.get('/audit-logs', requireAuditReviewer, adminController.getAuditLogs);
// Admin audit logs - TimesheetAdmin only
router.get('/admin-audit-logs', requireAdmin, adminController.getAdminAuditLogs);

// Holiday management - TimesheetAdmin only
router.get('/holidays', requireAdmin, adminController.getHolidays);
router.post('/holidays', requireAdmin, adminController.createHoliday);
router.put('/holidays/:id', requireAdmin, adminController.updateHoliday);
router.delete('/holidays/:id', requireAdmin, adminController.deleteHoliday);

// Note: Project management is handled in projectRoutes.ts with requireProjectAdmin middleware
// ProjectAdmin role users access projects through /api/projects endpoints

export default router;
