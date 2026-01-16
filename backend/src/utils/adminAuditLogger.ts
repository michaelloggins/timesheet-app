/**
 * Admin Audit Logger Utility
 * Logs administrative actions to the AdminAuditLog table
 */

import { getPool } from '../config/database';
import { logger } from './logger';

export type AdminActionType =
  | 'USER_SYNC'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DEACTIVATE'
  | 'PROJECT_CREATE'
  | 'PROJECT_UPDATE'
  | 'PROJECT_DEACTIVATE'
  | 'DEPARTMENT_CREATE'
  | 'DEPARTMENT_UPDATE'
  | 'HOLIDAY_CREATE'
  | 'HOLIDAY_UPDATE'
  | 'HOLIDAY_DELETE'
  | 'SYSTEM_CONFIG_UPDATE';

export type EntityType = 'User' | 'Project' | 'Department' | 'Holiday' | 'SystemConfig' | null;

export interface AdminAuditEntry {
  actionType: AdminActionType;
  actionByUserId: number;
  entityType?: EntityType;
  entityId?: number | null;
  entityName?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Log an administrative action to the AdminAuditLog table
 */
export const logAdminAction = async (entry: AdminAuditEntry): Promise<void> => {
  try {
    const pool = getPool();
    await pool.request()
      .input('actionType', entry.actionType)
      .input('actionByUserId', entry.actionByUserId)
      .input('entityType', entry.entityType || null)
      .input('entityId', entry.entityId || null)
      .input('entityName', entry.entityName || null)
      .input('details', entry.details ? JSON.stringify(entry.details) : null)
      .input('ipAddress', entry.ipAddress || null)
      .query(`
        INSERT INTO AdminAuditLog
          (ActionType, ActionByUserID, EntityType, EntityID, EntityName, Details, IPAddress)
        VALUES
          (@actionType, @actionByUserId, @entityType, @entityId, @entityName, @details, @ipAddress)
      `);

    logger.info(`Admin audit: ${entry.actionType} by user ${entry.actionByUserId}${entry.entityName ? ` on ${entry.entityName}` : ''}`);
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    logger.error('Failed to log admin audit entry:', error);
  }
};

/**
 * Log a user sync action with detailed results
 */
export const logUserSync = async (
  actionByUserId: number,
  syncResult: {
    created: number;
    updated: number;
    deactivated: number;
    departmentsCreated: number;
    departmentsUpdated: number;
    conflicts: string[];
    errors: string[];
  },
  ipAddress?: string
): Promise<void> => {
  await logAdminAction({
    actionType: 'USER_SYNC',
    actionByUserId,
    entityType: 'User',
    entityName: 'Entra ID Sync',
    details: {
      usersCreated: syncResult.created,
      usersUpdated: syncResult.updated,
      usersDeactivated: syncResult.deactivated,
      departmentsCreated: syncResult.departmentsCreated,
      departmentsUpdated: syncResult.departmentsUpdated,
      conflictCount: syncResult.conflicts.length,
      errorCount: syncResult.errors.length,
      conflicts: syncResult.conflicts.slice(0, 10), // Limit to first 10 for storage
      errors: syncResult.errors.slice(0, 10),
    },
    ipAddress,
  });
};
