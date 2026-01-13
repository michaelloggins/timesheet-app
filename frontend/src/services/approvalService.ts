/**
 * Approval Service
 * API calls for manager approval workflows
 */

import { apiClient } from './api';

export type ApprovalStatus = 'Submitted' | 'Approved' | 'Returned';

export interface ApprovalTimesheet {
  timesheetId: number;
  userId: number;
  employeeName: string;
  employeeEmail: string;
  periodStart: string;
  periodEnd: string;
  status: ApprovalStatus;
  totalHours: number;
  submittedDate: string | null;
  approvedDate: string | null;
  returnReason: string | null;
  daysWaiting: number;
  approvedByName?: string;
}

export interface ApprovalEntry {
  timeEntryId: number;
  timesheetId: number;
  projectId: number;
  projectNumber: string;
  projectName: string;
  projectType: 'Work' | 'PTO' | 'Holiday';
  workDate: string;
  hoursWorked: number;
  workLocation: 'Office' | 'WFH';
  notes?: string;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

/**
 * Get timesheets for approval with optional status filter
 */
export const getApprovals = async (
  statuses: ApprovalStatus[] = ['Submitted']
): Promise<ApprovalTimesheet[]> => {
  const statusParam = statuses.join(',');
  const response = await apiClient.get<ApiResponse<ApprovalTimesheet[]>>(
    `/approvals?status=${statusParam}`
  );
  return response.data.data || [];
};

/**
 * Get pending approvals (convenience function)
 */
export const getPendingApprovals = async (): Promise<ApprovalTimesheet[]> => {
  return getApprovals(['Submitted']);
};

/**
 * Get approval history (last 90 days)
 */
export const getApprovalHistory = async (): Promise<ApprovalTimesheet[]> => {
  const response = await apiClient.get<ApiResponse<ApprovalTimesheet[]>>('/approvals/history');
  return response.data.data || [];
};

/**
 * Get time entries for a specific timesheet
 */
export const getTimesheetEntries = async (timesheetId: number): Promise<ApprovalEntry[]> => {
  const response = await apiClient.get<ApiResponse<ApprovalEntry[]>>(
    `/approvals/${timesheetId}/entries`
  );
  return response.data.data || [];
};

/**
 * Approve a timesheet
 */
export const approveTimesheet = async (timesheetId: number): Promise<void> => {
  await apiClient.post(`/approvals/${timesheetId}/approve`);
};

/**
 * Return a timesheet to the employee
 */
export const returnTimesheet = async (
  timesheetId: number,
  reason: string
): Promise<void> => {
  await apiClient.post(`/approvals/${timesheetId}/return`, { reason });
};

/**
 * Unlock an approved timesheet
 */
export const unlockTimesheet = async (
  timesheetId: number,
  reason: string
): Promise<void> => {
  await apiClient.post(`/approvals/${timesheetId}/unlock`, { reason });
};

/**
 * Calculate RAG status based on days waiting
 * - Normal (no highlight): < 7 days
 * - Amber: 7-28 days (1-4 weeks)
 * - Red: > 28 days (4+ weeks)
 * - Green: Approved
 */
export const getRagStatus = (
  status: ApprovalStatus,
  daysWaiting: number
): 'green' | 'amber' | 'red' | 'normal' => {
  if (status === 'Approved') return 'green';
  if (daysWaiting >= 28) return 'red';
  if (daysWaiting >= 7) return 'amber';
  return 'normal';
};

/**
 * Format date range for display
 */
export const formatDateRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};
