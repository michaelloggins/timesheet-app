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

// Get a specific delegation by ID
router.get('/:id', delegationController.getDelegation);

// Create a new delegation
router.post('/', delegationController.createDelegation);

// Revoke/cancel a delegation
router.delete('/:id', delegationController.revokeDelegation);

export default router;
