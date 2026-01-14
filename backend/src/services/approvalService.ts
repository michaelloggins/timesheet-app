/**
 * Approval Service
 * Business logic for timesheet approval workflows
 * Supports cascading approvals via org chart (ManagerEntraID)
 */

import * as timesheetRepo from '../repositories/timesheetRepository';
import { AppError } from '../middleware/errorHandler';
import { logAuditEntry, AuditLogEntry } from '../utils/auditLogger';
import { getPool } from '../config/database';

export type ApprovalType = 'Primary' | 'Delegate' | 'Escalated' | 'Admin';

export interface ApprovalAuthResult {
  isAuthorized: boolean;
  approvalType: ApprovalType | null;
  onBehalfOfUserId?: number;  // For delegate approvals
}

/**
 * Determine if a user can approve a timesheet and what type of approval it is
 */
export const getApprovalAuthorization = async (
  timesheetId: number,
  approverId: number,
  approverEntraId: string,
  approverRole: string,
  approverManagerEntraId: string | null
): Promise<ApprovalAuthResult> => {
  const pool = await getPool();

  // Get the timesheet owner's info
  const timesheetResult = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT t.UserID, u.EntraIDObjectID, u.ManagerEntraID, u.Name
      FROM Timesheets t
      INNER JOIN Users u ON t.UserID = u.UserID
      WHERE t.TimesheetID = @timesheetId
    `);

  if (timesheetResult.recordset.length === 0) {
    return { isAuthorized: false, approvalType: null };
  }

  const employee = timesheetResult.recordset[0];

  // Check 1: TimesheetAdmin can approve anyone
  if (approverRole === 'TimesheetAdmin') {
    return { isAuthorized: true, approvalType: 'Admin' };
  }

  // Check 2: Top executive (Leadership with NULL ManagerEntraID) can approve anyone
  if (approverRole === 'Leadership' && !approverManagerEntraId) {
    // Determine if this is Primary (direct report) or Escalated
    if (employee.ManagerEntraID === approverEntraId) {
      return { isAuthorized: true, approvalType: 'Primary' };
    }
    return { isAuthorized: true, approvalType: 'Escalated' };
  }

  // Check 3: Direct manager (Primary approval)
  if (employee.ManagerEntraID === approverEntraId) {
    return { isAuthorized: true, approvalType: 'Primary' };
  }

  // Check 4: In management chain (Escalated approval)
  const chainResult = await pool.request()
    .input('employeeEntraId', employee.EntraIDObjectID)
    .input('approverEntraId', approverEntraId)
    .query(`
      ;WITH ManagementChain AS (
        -- Start with the employee's direct manager
        SELECT
          u.EntraIDObjectID,
          u.ManagerEntraID,
          1 as Level
        FROM Users u
        WHERE u.EntraIDObjectID = @employeeEntraId

        UNION ALL

        -- Walk up the chain
        SELECT
          mgr.EntraIDObjectID,
          mgr.ManagerEntraID,
          mc.Level + 1
        FROM Users mgr
        INNER JOIN ManagementChain mc ON mgr.EntraIDObjectID = mc.ManagerEntraID
        WHERE mc.Level < 10  -- Prevent infinite loops
      )
      SELECT 1 as InChain
      FROM ManagementChain
      WHERE ManagerEntraID = @approverEntraId
    `);

  if (chainResult.recordset.length > 0) {
    return { isAuthorized: true, approvalType: 'Escalated' };
  }

  // Check 5: Delegate approval (someone delegated to this approver)
  const delegateResult = await pool.request()
    .input('approverId', approverId)
    .input('employeeManagerEntraId', employee.ManagerEntraID)
    .query(`
      SELECT ad.DelegatorUserID
      FROM ApprovalDelegation ad
      INNER JOIN Users delegator ON ad.DelegatorUserID = delegator.UserID
      WHERE ad.DelegateUserID = @approverId
        AND ad.IsActive = 1
        AND CAST(GETUTCDATE() AS DATE) BETWEEN ad.StartDate AND ad.EndDate
        AND delegator.EntraIDObjectID = @employeeManagerEntraId
    `);

  if (delegateResult.recordset.length > 0) {
    return {
      isAuthorized: true,
      approvalType: 'Delegate',
      onBehalfOfUserId: delegateResult.recordset[0].DelegatorUserID
    };
  }

  // Not authorized
  return { isAuthorized: false, approvalType: null };
};

/**
 * Log audit entry with approval type information
 */
export const logApprovalAuditEntry = async (
  entry: AuditLogEntry & { approvalType?: ApprovalType; onBehalfOfUserId?: number }
): Promise<void> => {
  const pool = await getPool();

  try {
    await pool.request()
      .input('timesheetId', entry.timesheetId)
      .input('action', entry.action)
      .input('actionByUserId', entry.actionByUserId)
      .input('notes', entry.notes || null)
      .input('previousStatus', entry.previousStatus || null)
      .input('newStatus', entry.newStatus || null)
      .input('approvalType', entry.approvalType || null)
      .input('onBehalfOfUserId', entry.onBehalfOfUserId || null)
      .query(`
        INSERT INTO TimesheetHistory
          (TimesheetID, Action, ActionByUserID, Notes, PreviousStatus, NewStatus, ApprovalType, OnBehalfOfUserID)
        VALUES
          (@timesheetId, @action, @actionByUserId, @notes, @previousStatus, @newStatus, @approvalType, @onBehalfOfUserId)
      `);
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('Failed to log approval audit entry:', error);
  }
};

export const approveTimesheet = async (
  timesheetId: number,
  managerId: number,
  managerEntraId: string,
  managerRole?: string,
  managerManagerEntraId?: string | null
): Promise<void> => {
  // 1. Get timesheet
  const timesheet = await timesheetRepo.findTimesheetById(timesheetId);

  if (!timesheet) {
    throw new AppError(404, 'Timesheet not found');
  }

  if (timesheet.Status !== 'Submitted') {
    throw new AppError(400, 'Only submitted timesheets can be approved');
  }

  // 2. Verify manager relationship via org chart
  const authResult = await getApprovalAuthorization(
    timesheetId,
    managerId,
    managerEntraId,
    managerRole || 'Manager',
    managerManagerEntraId ?? null
  );

  if (!authResult.isAuthorized) {
    throw new AppError(403, 'You are not authorized to approve this timesheet');
  }

  // 3. Update timesheet status
  await timesheetRepo.updateTimesheet(timesheetId, {
    Status: 'Approved',
    ApprovedDate: new Date(),
    ApprovedByUserID: managerId,
    IsLocked: true,
  });

  // 4. Log audit entry with approval type
  await logApprovalAuditEntry({
    timesheetId,
    action: 'Approved',
    actionByUserId: managerId,
    previousStatus: 'Submitted',
    newStatus: 'Approved',
    approvalType: authResult.approvalType!,
    onBehalfOfUserId: authResult.onBehalfOfUserId,
  });

  // TODO: Send notification
  // await notificationService.sendTimesheetApproved(employee.email, timesheet);
};

export const returnTimesheet = async (
  timesheetId: number,
  managerId: number,
  returnReason: string,
  managerEntraId?: string,
  managerRole?: string,
  managerManagerEntraId?: string | null
): Promise<void> => {
  if (!returnReason || returnReason.trim().length === 0) {
    throw new AppError(400, 'Return reason is required');
  }

  const timesheet = await timesheetRepo.findTimesheetById(timesheetId);

  if (!timesheet) {
    throw new AppError(404, 'Timesheet not found');
  }

  if (timesheet.Status !== 'Submitted') {
    throw new AppError(400, 'Only submitted timesheets can be returned');
  }

  // Verify manager relationship via org chart (if entra info provided)
  let approvalType: ApprovalType | null = null;
  let onBehalfOfUserId: number | undefined;

  if (managerEntraId) {
    const authResult = await getApprovalAuthorization(
      timesheetId,
      managerId,
      managerEntraId,
      managerRole || 'Manager',
      managerManagerEntraId ?? null
    );

    if (!authResult.isAuthorized) {
      throw new AppError(403, 'You are not authorized to return this timesheet');
    }

    approvalType = authResult.approvalType;
    onBehalfOfUserId = authResult.onBehalfOfUserId;
  }

  // Update timesheet status
  await timesheetRepo.updateTimesheet(timesheetId, {
    Status: 'Returned',
    ReturnReason: returnReason,
  });

  // Log audit entry with approval type
  await logApprovalAuditEntry({
    timesheetId,
    action: 'Returned',
    actionByUserId: managerId,
    notes: returnReason,
    previousStatus: 'Submitted',
    newStatus: 'Returned',
    approvalType: approvalType || undefined,
    onBehalfOfUserId,
  });

  // TODO: Send notification with notes
  // await notificationService.sendTimesheetReturned(employee.email, timesheet, returnReason);
};

export const unlockTimesheet = async (
  timesheetId: number,
  adminId: number,
  reason: string
): Promise<void> => {
  if (!reason || reason.trim().length === 0) {
    throw new AppError(400, 'Unlock reason is required');
  }

  const timesheet = await timesheetRepo.findTimesheetById(timesheetId);

  if (!timesheet) {
    throw new AppError(404, 'Timesheet not found');
  }

  // Unlock the timesheet
  await timesheetRepo.updateTimesheet(timesheetId, {
    IsLocked: false,
  });

  // Log audit entry
  await logAuditEntry({
    timesheetId,
    action: 'Unlocked',
    actionByUserId: adminId,
    notes: reason,
    previousStatus: timesheet.Status,
    newStatus: timesheet.Status,
  });
};
