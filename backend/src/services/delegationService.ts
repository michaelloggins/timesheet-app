/**
 * Delegation Service
 * Business logic for managing approval authority delegations
 */

import { getPool } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface Delegation {
  DelegationID: number;
  DelegatorUserID: number;
  DelegateUserID: number;
  StartDate: Date;
  EndDate: Date;
  Reason: string | null;
  IsActive: boolean;
  CreatedDate: Date;
  CreatedByUserID: number;
  RevokedDate: Date | null;
  RevokedByUserID: number | null;
}

export interface DelegationWithNames extends Delegation {
  DelegatorName: string;
  DelegatorEmail: string;
  DelegateName: string;
  DelegateEmail: string;
  CreatedByName: string;
  RevokedByName: string | null;
}

export interface CreateDelegationInput {
  delegatorId: number;
  delegateId: number;
  startDate: Date;
  endDate: Date;
  reason?: string;
  createdById: number;
}

/**
 * Create a new delegation
 */
export const createDelegation = async (input: CreateDelegationInput): Promise<Delegation> => {
  const { delegatorId, delegateId, startDate, endDate, reason, createdById } = input;

  // Validation: Cannot delegate to yourself
  if (delegatorId === delegateId) {
    throw new AppError(400, 'Cannot delegate approval authority to yourself');
  }

  // Validation: StartDate must be before or equal to EndDate
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) {
    throw new AppError(400, 'Start date must be before or equal to end date');
  }

  const pool = getPool();

  // Verify both users exist and are active
  const usersCheck = await pool.request()
    .input('delegatorId', delegatorId)
    .input('delegateId', delegateId)
    .query(`
      SELECT UserID, Name, Role
      FROM Users
      WHERE UserID IN (@delegatorId, @delegateId) AND IsActive = 1
    `);

  if (usersCheck.recordset.length < 2) {
    throw new AppError(400, 'Both delegator and delegate must be active users');
  }

  // Verify delegate has manager-level role (can approve timesheets)
  const delegate = usersCheck.recordset.find(u => u.UserID === delegateId);
  if (!['Manager', 'TimesheetAdmin', 'Leadership'].includes(delegate.Role)) {
    throw new AppError(400, 'Delegate must have Manager, TimesheetAdmin, or Leadership role');
  }

  // Check for overlapping active delegations from the same delegator
  const overlapCheck = await pool.request()
    .input('delegatorId', delegatorId)
    .input('startDate', start)
    .input('endDate', end)
    .query(`
      SELECT DelegationID, StartDate, EndDate
      FROM ApprovalDelegation
      WHERE DelegatorUserID = @delegatorId
        AND IsActive = 1
        AND (
          (StartDate <= @endDate AND EndDate >= @startDate)
        )
    `);

  if (overlapCheck.recordset.length > 0) {
    const existing = overlapCheck.recordset[0];
    const existingStart = new Date(existing.StartDate).toLocaleDateString();
    const existingEnd = new Date(existing.EndDate).toLocaleDateString();
    throw new AppError(
      400,
      `Overlapping delegation already exists (${existingStart} - ${existingEnd}). Please revoke it first or choose different dates.`
    );
  }

  // Create the delegation
  const result = await pool.request()
    .input('delegatorId', delegatorId)
    .input('delegateId', delegateId)
    .input('startDate', start)
    .input('endDate', end)
    .input('reason', reason || null)
    .input('createdById', createdById)
    .query(`
      INSERT INTO ApprovalDelegation
        (DelegatorUserID, DelegateUserID, StartDate, EndDate, Reason, IsActive, CreatedByUserID)
      OUTPUT INSERTED.*
      VALUES
        (@delegatorId, @delegateId, @startDate, @endDate, @reason, 1, @createdById)
    `);

  const delegation = result.recordset[0] as Delegation;

  // Log the creation
  await logDelegationAudit({
    delegationId: delegation.DelegationID,
    action: 'CREATED',
    actionByUserId: createdById,
    delegatorId,
    delegateId,
    startDate: start,
    endDate: end,
    reason,
  });

  logger.info(`Delegation created: ${delegatorId} -> ${delegateId} (${start.toISOString()} to ${end.toISOString()})`);

  return delegation;
};

/**
 * Revoke an existing delegation
 */
export const revokeDelegation = async (
  delegationId: number,
  userId: number,
  userRole: string
): Promise<void> => {
  const pool = getPool();

  // Get the delegation
  const delegationResult = await pool.request()
    .input('delegationId', delegationId)
    .query(`
      SELECT d.*,
        delegator.Name as DelegatorName,
        delegate.Name as DelegateName
      FROM ApprovalDelegation d
      INNER JOIN Users delegator ON d.DelegatorUserID = delegator.UserID
      INNER JOIN Users delegate ON d.DelegateUserID = delegate.UserID
      WHERE d.DelegationID = @delegationId
    `);

  if (delegationResult.recordset.length === 0) {
    throw new AppError(404, 'Delegation not found');
  }

  const delegation = delegationResult.recordset[0];

  if (!delegation.IsActive) {
    throw new AppError(400, 'Delegation is already revoked');
  }

  // Authorization: Only the delegator or an admin can revoke
  const isAdmin = userRole === 'TimesheetAdmin';
  const isDelegator = delegation.DelegatorUserID === userId;

  if (!isAdmin && !isDelegator) {
    throw new AppError(403, 'Only the delegator or an admin can revoke this delegation');
  }

  // Revoke the delegation
  await pool.request()
    .input('delegationId', delegationId)
    .input('revokedById', userId)
    .query(`
      UPDATE ApprovalDelegation
      SET IsActive = 0,
          RevokedDate = GETUTCDATE(),
          RevokedByUserID = @revokedById
      WHERE DelegationID = @delegationId
    `);

  // Log the revocation
  await logDelegationAudit({
    delegationId,
    action: 'REVOKED',
    actionByUserId: userId,
    delegatorId: delegation.DelegatorUserID,
    delegateId: delegation.DelegateUserID,
    startDate: delegation.StartDate,
    endDate: delegation.EndDate,
  });

  logger.info(`Delegation ${delegationId} revoked by user ${userId}`);
};

/**
 * Get all delegations given by a user
 */
export const getDelegationsGivenByUser = async (userId: number): Promise<DelegationWithNames[]> => {
  const pool = getPool();

  const result = await pool.request()
    .input('userId', userId)
    .query(`
      SELECT
        d.DelegationID,
        d.DelegatorUserID,
        d.DelegateUserID,
        d.StartDate,
        d.EndDate,
        d.Reason,
        d.IsActive,
        d.CreatedDate,
        d.CreatedByUserID,
        d.RevokedDate,
        d.RevokedByUserID,
        delegator.Name as DelegatorName,
        delegator.Email as DelegatorEmail,
        delegate.Name as DelegateName,
        delegate.Email as DelegateEmail,
        creator.Name as CreatedByName,
        revoker.Name as RevokedByName
      FROM ApprovalDelegation d
      INNER JOIN Users delegator ON d.DelegatorUserID = delegator.UserID
      INNER JOIN Users delegate ON d.DelegateUserID = delegate.UserID
      INNER JOIN Users creator ON d.CreatedByUserID = creator.UserID
      LEFT JOIN Users revoker ON d.RevokedByUserID = revoker.UserID
      WHERE d.DelegatorUserID = @userId
      ORDER BY d.CreatedDate DESC
    `);

  return result.recordset as DelegationWithNames[];
};

/**
 * Get all delegations received by a user
 */
export const getDelegationsReceivedByUser = async (userId: number): Promise<DelegationWithNames[]> => {
  const pool = getPool();

  const result = await pool.request()
    .input('userId', userId)
    .query(`
      SELECT
        d.DelegationID,
        d.DelegatorUserID,
        d.DelegateUserID,
        d.StartDate,
        d.EndDate,
        d.Reason,
        d.IsActive,
        d.CreatedDate,
        d.CreatedByUserID,
        d.RevokedDate,
        d.RevokedByUserID,
        delegator.Name as DelegatorName,
        delegator.Email as DelegatorEmail,
        delegate.Name as DelegateName,
        delegate.Email as DelegateEmail,
        creator.Name as CreatedByName,
        revoker.Name as RevokedByName
      FROM ApprovalDelegation d
      INNER JOIN Users delegator ON d.DelegatorUserID = delegator.UserID
      INNER JOIN Users delegate ON d.DelegateUserID = delegate.UserID
      INNER JOIN Users creator ON d.CreatedByUserID = creator.UserID
      LEFT JOIN Users revoker ON d.RevokedByUserID = revoker.UserID
      WHERE d.DelegateUserID = @userId
      ORDER BY d.CreatedDate DESC
    `);

  return result.recordset as DelegationWithNames[];
};

/**
 * Get currently active delegations for a user (where they are the delegate)
 * This is used when checking if a user can approve on behalf of someone else
 */
export const getActiveDelegationsForUser = async (userId: number): Promise<DelegationWithNames[]> => {
  const pool = getPool();

  const result = await pool.request()
    .input('userId', userId)
    .query(`
      SELECT
        d.DelegationID,
        d.DelegatorUserID,
        d.DelegateUserID,
        d.StartDate,
        d.EndDate,
        d.Reason,
        d.IsActive,
        d.CreatedDate,
        d.CreatedByUserID,
        d.RevokedDate,
        d.RevokedByUserID,
        delegator.Name as DelegatorName,
        delegator.Email as DelegatorEmail,
        delegate.Name as DelegateName,
        delegate.Email as DelegateEmail,
        creator.Name as CreatedByName,
        revoker.Name as RevokedByName
      FROM ApprovalDelegation d
      INNER JOIN Users delegator ON d.DelegatorUserID = delegator.UserID
      INNER JOIN Users delegate ON d.DelegateUserID = delegate.UserID
      INNER JOIN Users creator ON d.CreatedByUserID = creator.UserID
      LEFT JOIN Users revoker ON d.RevokedByUserID = revoker.UserID
      WHERE d.DelegateUserID = @userId
        AND d.IsActive = 1
        AND CAST(GETUTCDATE() AS DATE) BETWEEN d.StartDate AND d.EndDate
      ORDER BY d.StartDate ASC
    `);

  return result.recordset as DelegationWithNames[];
};

/**
 * Get a single delegation by ID
 */
export const getDelegationById = async (delegationId: number): Promise<DelegationWithNames | null> => {
  const pool = getPool();

  const result = await pool.request()
    .input('delegationId', delegationId)
    .query(`
      SELECT
        d.DelegationID,
        d.DelegatorUserID,
        d.DelegateUserID,
        d.StartDate,
        d.EndDate,
        d.Reason,
        d.IsActive,
        d.CreatedDate,
        d.CreatedByUserID,
        d.RevokedDate,
        d.RevokedByUserID,
        delegator.Name as DelegatorName,
        delegator.Email as DelegatorEmail,
        delegate.Name as DelegateName,
        delegate.Email as DelegateEmail,
        creator.Name as CreatedByName,
        revoker.Name as RevokedByName
      FROM ApprovalDelegation d
      INNER JOIN Users delegator ON d.DelegatorUserID = delegator.UserID
      INNER JOIN Users delegate ON d.DelegateUserID = delegate.UserID
      INNER JOIN Users creator ON d.CreatedByUserID = creator.UserID
      LEFT JOIN Users revoker ON d.RevokedByUserID = revoker.UserID
      WHERE d.DelegationID = @delegationId
    `);

  return result.recordset.length > 0 ? result.recordset[0] as DelegationWithNames : null;
};

/**
 * Get users eligible to be delegates (Manager, Leadership, TimesheetAdmin roles)
 * Excludes the current user since you can't delegate to yourself
 */
export const getEligibleDelegates = async (
  currentUserId: number
): Promise<{ userId: number; name: string; email: string }[]> => {
  const pool = getPool();

  const result = await pool.request()
    .input('currentUserId', currentUserId)
    .query(`
      SELECT UserID as userId, Name as name, Email as email
      FROM Users
      WHERE IsActive = 1
        AND UserID != @currentUserId
        AND Role IN ('Manager', 'Leadership', 'TimesheetAdmin')
      ORDER BY Name
    `);

  return result.recordset;
};

/**
 * Check if a user can approve on behalf of another user via delegation
 */
export const canApproveOnBehalfOf = async (
  delegateUserId: number,
  delegatorUserId: number
): Promise<boolean> => {
  const pool = getPool();

  const result = await pool.request()
    .input('delegateId', delegateUserId)
    .input('delegatorId', delegatorUserId)
    .query(`
      SELECT COUNT(*) as count
      FROM ApprovalDelegation
      WHERE DelegateUserID = @delegateId
        AND DelegatorUserID = @delegatorId
        AND IsActive = 1
        AND CAST(GETUTCDATE() AS DATE) BETWEEN StartDate AND EndDate
    `);

  return result.recordset[0].count > 0;
};

// Audit logging for delegations
interface DelegationAuditEntry {
  delegationId: number;
  action: 'CREATED' | 'REVOKED';
  actionByUserId: number;
  delegatorId: number;
  delegateId: number;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

const logDelegationAudit = async (entry: DelegationAuditEntry): Promise<void> => {
  try {
    const pool = getPool();

    await pool.request()
      .input('delegationId', entry.delegationId)
      .input('action', entry.action)
      .input('actionByUserId', entry.actionByUserId)
      .input('delegatorId', entry.delegatorId)
      .input('delegateId', entry.delegateId)
      .input('startDate', entry.startDate)
      .input('endDate', entry.endDate)
      .input('reason', entry.reason || null)
      .query(`
        INSERT INTO DelegationAuditLog
          (DelegationID, Action, ActionByUserID, DelegatorUserID, DelegateUserID,
           StartDate, EndDate, Reason, ActionDate)
        VALUES
          (@delegationId, @action, @actionByUserId, @delegatorId, @delegateId,
           @startDate, @endDate, @reason, GETUTCDATE())
      `);

    logger.info(`Delegation audit: ${entry.action} delegation ${entry.delegationId} by user ${entry.actionByUserId}`);
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    logger.error('Failed to log delegation audit entry:', error);
  }
};
