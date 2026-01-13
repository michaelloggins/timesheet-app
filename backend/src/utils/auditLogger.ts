/**
 * Audit Logger Utility
 * Logs actions to the TimesheetHistory table
 */

import { getPool } from '../config/database';
import { logger } from './logger';

export type AuditAction = 'Created' | 'Submitted' | 'Approved' | 'Returned' | 'Unlocked' | 'Modified' | 'Withdrawn';

export interface AuditLogEntry {
  timesheetId: number;
  action: AuditAction;
  actionByUserId: number;
  notes?: string;
  previousStatus?: string;
  newStatus?: string;
}

/**
 * Log an action to the TimesheetHistory table
 */
export const logAuditEntry = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const pool = getPool();
    await pool.request()
      .input('timesheetId', entry.timesheetId)
      .input('action', entry.action)
      .input('actionByUserId', entry.actionByUserId)
      .input('notes', entry.notes || null)
      .input('previousStatus', entry.previousStatus || null)
      .input('newStatus', entry.newStatus || null)
      .query(`
        INSERT INTO TimesheetHistory
          (TimesheetID, Action, ActionByUserID, Notes, PreviousStatus, NewStatus)
        VALUES
          (@timesheetId, @action, @actionByUserId, @notes, @previousStatus, @newStatus)
      `);

    logger.info(`Audit log: ${entry.action} on timesheet ${entry.timesheetId} by user ${entry.actionByUserId}`);
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    logger.error('Failed to log audit entry:', error);
  }
};
