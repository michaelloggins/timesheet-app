/**
 * TypeScript type definitions for MiraVista Timesheet Frontend
 */

// User Types
export interface User {
  userId: number;
  entraId: string;
  email: string;
  name: string;
  departmentId: number;
  role: 'Employee' | 'Manager' | 'TimesheetAdmin' | 'Leadership';
}

// Department Types
export interface Department {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  isActive: boolean;
}

// Project Types
export interface Project {
  projectId: number;
  projectNumber: string;
  projectName: string;
  departmentId: number | null; // NULL = universal/all departments
  departmentName?: string | null;
  projectType: 'Work' | 'PTO' | 'Holiday';
  grantIdentifier?: string;
  isActive: boolean;
}

// Timesheet Types
export interface Timesheet {
  timesheetId: number;
  userId: number;
  periodStartDate: string;
  periodEndDate: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Returned';
  submittedDate?: string;
  approvedDate?: string;
  approvedByUserId?: number;
  returnReason?: string;
  isLocked: boolean;
  entries: TimeEntry[];
}

// Time Entry Types
export interface TimeEntry {
  timeEntryId: number;
  timesheetId: number;
  projectId: number;
  workDate: string;
  hoursWorked: number;
  workLocation: 'Office' | 'WFH' | 'Other';
  notes?: string;
}

// Approval Types
export interface ApprovalRequest {
  timesheetId: number;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  submittedDate: string;
  daysWaiting: number;
  entries: TimeEntry[];
}

// Dashboard Types
export interface DashboardStats {
  totalTimesheets: number;
  pendingApprovals: number;
  completedThisWeek: number;
  complianceRate: number;
}

export interface ScoreboardDepartment {
  departmentName: string;
  totalEmployees: number;
  submittedCount: number;
  completionRate: number;
  ragStatus: 'green' | 'amber' | 'red';
}

// Report Types
export interface HoursByProjectReport {
  projectName: string;
  projectNumber: string;
  departmentName: string;
  totalHours: number;
  employeeCount: number;
  month: string;
}

// Form Types
export interface TimesheetFormData {
  periodStartDate: string;
  periodEndDate: string;
  entries: TimeEntryFormData[];
}

export interface TimeEntryFormData {
  projectId: number;
  workDate: string;
  hoursWorked: number;
  workLocation: 'Office' | 'WFH' | 'Other';
  notes?: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface ApiError {
  status: 'error';
  message: string;
  statusCode?: number;
}

// Approval Type for Cascading Approvals
export type ApprovalType = 'Primary' | 'Delegate' | 'Escalated';

// Delegation Types for Cascading Approvals
export interface Delegation {
  delegationId: number;
  delegatorUserId: number;
  delegatorName: string;
  delegatorEmail: string;
  delegateUserId: number;
  delegateName: string;
  delegateEmail: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isActive: boolean;
  createdDate: string;
  revokedDate?: string;
  revokedByUserId?: number;
}

export interface CreateDelegationRequest {
  delegateUserId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface DelegationSummary {
  given: Delegation[];
  received: Delegation[];
}
