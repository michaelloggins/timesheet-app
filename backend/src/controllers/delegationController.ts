/**
 * Delegation Controller
 * HTTP request handlers for approval delegation management
 */

import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import * as delegationService from '../services/delegationService';

/**
 * GET /api/delegations
 * List all delegations for the current user (both given and received)
 */
export const listDelegations = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  const [given, received] = await Promise.all([
    delegationService.getDelegationsGivenByUser(user.userId),
    delegationService.getDelegationsReceivedByUser(user.userId),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      given: given.map(formatDelegationResponse),
      received: received.map(formatDelegationResponse),
    },
  });
});

/**
 * GET /api/delegations/active
 * Get currently active delegations where the current user is the delegate
 * Used by approval queries to determine what timesheets the user can approve
 */
export const getActiveDelegations = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  const activeDelegations = await delegationService.getActiveDelegationsForUser(user.userId);

  res.status(200).json({
    status: 'success',
    data: activeDelegations.map(formatDelegationResponse),
  });
});

/**
 * POST /api/delegations
 * Create a new delegation
 */
export const createDelegation = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { delegateId, startDate, endDate, reason } = req.body;

  // Validate required fields
  if (!delegateId) {
    throw new AppError(400, 'Delegate ID is required');
  }
  if (!startDate) {
    throw new AppError(400, 'Start date is required');
  }
  if (!endDate) {
    throw new AppError(400, 'End date is required');
  }

  // Validate date formats
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (isNaN(parsedStartDate.getTime())) {
    throw new AppError(400, 'Invalid start date format');
  }
  if (isNaN(parsedEndDate.getTime())) {
    throw new AppError(400, 'Invalid end date format');
  }

  // Create the delegation
  // The delegator is the current user (they are delegating their own authority)
  const delegation = await delegationService.createDelegation({
    delegatorId: user.userId,
    delegateId: parseInt(delegateId, 10),
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    reason: reason || undefined,
    createdById: user.userId,
  });

  // Fetch the full delegation with names
  const fullDelegation = await delegationService.getDelegationById(delegation.DelegationID);

  res.status(201).json({
    status: 'success',
    message: 'Delegation created successfully',
    data: fullDelegation ? formatDelegationResponse(fullDelegation) : delegation,
  });
});

/**
 * DELETE /api/delegations/:id
 * Revoke/cancel a delegation
 */
export const revokeDelegation = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  const delegationId = parseInt(id, 10);
  if (isNaN(delegationId)) {
    throw new AppError(400, 'Invalid delegation ID');
  }

  await delegationService.revokeDelegation(delegationId, user.userId, user.role);

  res.status(200).json({
    status: 'success',
    message: 'Delegation revoked successfully',
  });
});

/**
 * GET /api/delegations/:id
 * Get a specific delegation by ID
 */
export const getDelegation = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  const delegationId = parseInt(id, 10);
  if (isNaN(delegationId)) {
    throw new AppError(400, 'Invalid delegation ID');
  }

  const delegation = await delegationService.getDelegationById(delegationId);

  if (!delegation) {
    throw new AppError(404, 'Delegation not found');
  }

  // Only allow viewing if user is involved or is an admin
  const isAdmin = user.role === 'TimesheetAdmin';
  const isDelegator = delegation.DelegatorUserID === user.userId;
  const isDelegate = delegation.DelegateUserID === user.userId;

  if (!isAdmin && !isDelegator && !isDelegate) {
    throw new AppError(403, 'You do not have access to this delegation');
  }

  res.status(200).json({
    status: 'success',
    data: formatDelegationResponse(delegation),
  });
});

/**
 * GET /api/delegations/eligible-delegates
 * Get list of users eligible to be delegates (Manager, Leadership, TimesheetAdmin roles)
 */
export const getEligibleDelegates = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  const eligibleDelegates = await delegationService.getEligibleDelegates(user.userId);

  res.status(200).json({
    status: 'success',
    data: eligibleDelegates,
  });
});

/**
 * Helper function to format delegation response
 */
function formatDelegationResponse(delegation: delegationService.DelegationWithNames) {
  return {
    delegationId: delegation.DelegationID,
    delegator: {
      userId: delegation.DelegatorUserID,
      name: delegation.DelegatorName,
      email: delegation.DelegatorEmail,
    },
    delegate: {
      userId: delegation.DelegateUserID,
      name: delegation.DelegateName,
      email: delegation.DelegateEmail,
    },
    startDate: delegation.StartDate,
    endDate: delegation.EndDate,
    reason: delegation.Reason,
    isActive: delegation.IsActive,
    createdDate: delegation.CreatedDate,
    createdBy: {
      userId: delegation.CreatedByUserID,
      name: delegation.CreatedByName,
    },
    revokedDate: delegation.RevokedDate,
    revokedBy: delegation.RevokedByUserID ? {
      userId: delegation.RevokedByUserID,
      name: delegation.RevokedByName,
    } : null,
  };
}
