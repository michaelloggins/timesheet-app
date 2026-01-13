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
