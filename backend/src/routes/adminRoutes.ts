import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import * as adminController from '../controllers/adminController';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate, requireAdmin);

// User management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deactivateUser);

// Department management
router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);

// Excel import
router.post('/import/projects', adminController.importProjects);
router.post('/import/timesheets', adminController.importTimesheets);

// System configuration
router.get('/config', adminController.getSystemConfig);
router.put('/config', adminController.updateSystemConfig);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
