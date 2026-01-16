/**
 * Audit Service
 * API calls for audit log operations
 */

import { apiClient } from './api';

export interface AuditLogEntry {
  historyId: number;
  timesheetId: number;
  action: 'Created' | 'Submitted' | 'Approved' | 'Returned' | 'Unlocked' | 'Modified' | 'Withdrawn';
  actionDate: string;
  notes?: string;
  previousStatus?: string;
  newStatus?: string;
  actionBy: {
    userId: number;
    name: string;
    email: string;
  };
  timesheetOwner: {
    userId: number;
    name: string;
  } | null;
  periodStartDate?: string;
  periodEndDate?: string;
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface AuditLogFilters {
  days?: number;
  userId?: number;
  action?: string;
  limit?: number;
}

/**
 * Get audit logs with optional filters
 */
export const getAuditLogs = async (filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> => {
  const params = new URLSearchParams();
  if (filters.days) params.append('days', filters.days.toString());
  if (filters.userId) params.append('userId', filters.userId.toString());
  if (filters.action) params.append('action', filters.action);
  if (filters.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString();
  const url = `/admin/audit-logs${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<ApiResponse<AuditLogEntry[]>>(url);
  return response.data.data || [];
};

/**
 * Admin Audit Log Entry (for admin actions like sync, CRUD operations)
 */
export interface AdminAuditLogEntry {
  auditId: number;
  actionType: string;
  actionDate: string;
  entityType: string | null;
  entityId: number | null;
  entityName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  actionBy: {
    userId: number;
    name: string;
    email: string;
  };
}

export interface AdminAuditLogFilters {
  days?: number;
  actionType?: string;
  limit?: number;
}

/**
 * Get admin audit logs (admin actions like sync, project/dept CRUD)
 */
export const getAdminAuditLogs = async (filters: AdminAuditLogFilters = {}): Promise<AdminAuditLogEntry[]> => {
  const params = new URLSearchParams();
  if (filters.days) params.append('days', filters.days.toString());
  if (filters.actionType) params.append('actionType', filters.actionType);
  if (filters.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString();
  const url = `/admin/admin-audit-logs${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<ApiResponse<AdminAuditLogEntry[]>>(url);
  return response.data.data || [];
};

/**
 * Get admin action display text and color
 */
export const getAdminActionInfo = (actionType: string): { label: string; color: 'informative' | 'success' | 'warning' | 'danger' | 'important' } => {
  const actionMap: Record<string, { label: string; color: 'informative' | 'success' | 'warning' | 'danger' | 'important' }> = {
    'USER_SYNC': { label: 'User Sync', color: 'informative' },
    'USER_CREATE': { label: 'User Created', color: 'success' },
    'USER_UPDATE': { label: 'User Updated', color: 'informative' },
    'USER_DEACTIVATE': { label: 'User Deactivated', color: 'danger' },
    'PROJECT_CREATE': { label: 'Project Created', color: 'success' },
    'PROJECT_UPDATE': { label: 'Project Updated', color: 'informative' },
    'PROJECT_DEACTIVATE': { label: 'Project Deactivated', color: 'danger' },
    'DEPARTMENT_CREATE': { label: 'Dept Created', color: 'success' },
    'DEPARTMENT_UPDATE': { label: 'Dept Updated', color: 'informative' },
    'HOLIDAY_CREATE': { label: 'Holiday Created', color: 'success' },
    'HOLIDAY_UPDATE': { label: 'Holiday Updated', color: 'informative' },
    'HOLIDAY_DELETE': { label: 'Holiday Deleted', color: 'danger' },
    'SYSTEM_CONFIG_UPDATE': { label: 'Config Updated', color: 'warning' },
  };
  return actionMap[actionType] || { label: actionType, color: 'informative' };
};

/**
 * Get action display text and color
 */
export const getActionInfo = (action: AuditLogEntry['action']): { label: string; color: 'informative' | 'success' | 'warning' | 'danger' | 'important' } => {
  switch (action) {
    case 'Created':
      return { label: 'Created', color: 'informative' };
    case 'Submitted':
      return { label: 'Submitted', color: 'warning' };
    case 'Approved':
      return { label: 'Approved', color: 'success' };
    case 'Returned':
      return { label: 'Returned', color: 'danger' };
    case 'Withdrawn':
      return { label: 'Withdrawn', color: 'important' };
    case 'Unlocked':
      return { label: 'Unlocked', color: 'warning' };
    case 'Modified':
      return { label: 'Modified', color: 'informative' };
    default:
      return { label: action, color: 'informative' };
  }
};
