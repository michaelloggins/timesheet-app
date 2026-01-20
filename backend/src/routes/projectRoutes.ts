import { Router } from 'express';
import { authenticate, requireProjectAdmin } from '../middleware/authMiddleware';
import * as projectController from '../controllers/projectController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get projects (filtered by department, or for current user with ?forUser=true)
router.get('/', projectController.getProjects);

// Get employees by departments (for project targeting UI)
// Example: /api/projects/employees-by-departments?departmentIds=1,2,3
router.get('/employees-by-departments', projectController.getEmployeesByDepartments);

// Get project by ID (with assignments using ?includeAssignments=true)
router.get('/:id', projectController.getProjectById);

// Get project assignments (departments and employees)
router.get('/:id/assignments', projectController.getProjectAssignments);

// Project management routes - accessible by TimesheetAdmin and ProjectAdmin
router.post('/', requireProjectAdmin, projectController.createProject);
router.put('/:id', requireProjectAdmin, projectController.updateProject);
router.delete('/:id', requireProjectAdmin, projectController.deactivateProject);

export default router;
