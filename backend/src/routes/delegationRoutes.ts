/**
 * Delegation Routes
 * API routes for managing approval authority delegations
 */

import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/authMiddleware';
import * as delegationController from '../controllers/delegationController';

const router = Router();

// All delegation routes require authentication and manager role
// (only managers and above can delegate/receive delegations)
router.use(authenticate, requireManager);

// List all delegations for current user (given and received)
router.get('/', delegationController.listDelegations);

// Get currently active delegations (where current user is delegate)
router.get('/active', delegationController.getActiveDelegations);

// Get eligible users who can be delegates (for dropdown)
router.get('/eligible-delegates', delegationController.getEligibleDelegates);

// Get direct reports for scoping delegations to specific employees
router.get('/direct-reports', delegationController.getDirectReports);

// Get a specific delegation by ID
router.get('/:id', delegationController.getDelegation);

// Get scoped employees for a delegation
router.get('/:id/employees', delegationController.getScopedEmployees);

// Create a new delegation
router.post('/', delegationController.createDelegation);

// Update an existing delegation
router.put('/:id', delegationController.updateDelegation);

// Add employees to a delegation's scope
router.post('/:id/employees', delegationController.addEmployees);

// Remove employees from a delegation's scope
router.delete('/:id/employees', delegationController.removeEmployees);

// Revoke/cancel a delegation
router.delete('/:id', delegationController.revokeDelegation);

export default router;
