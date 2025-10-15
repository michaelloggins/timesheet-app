/**
 * TypeScript type definitions for MiraVista Timesheet System
 */

// User Types
export interface User {
  UserID: number;
  EntraIDObjectID: string;
  Email: string;
  Name: string;
  DepartmentID: number;
  Role: 'Employee' | 'Manager' | 'TimesheetAdmin' | 'Leadership';
  IsActive: boolean;
  CreatedDate: Date;
  LastLoginDate?: Date;
}

// Department Types
export interface Department {
  DepartmentID: number;
  DepartmentCode: string;
  DepartmentName: string;
  IsActive: boolean;
}

// Project Types
export interface Project {
  ProjectID: number;
  ProjectNumber: string;
  ProjectName: string;
  DepartmentID: number;
  ProjectType: 'Work' | 'PTO' | 'Holiday';
  GrantIdentifier?: string;
  IsActive: boolean;
  CreatedDate: Date;
}

// Timesheet Types
export interface Timesheet {
  TimesheetID: number;
  UserID: number;
  PeriodStartDate: Date;
  PeriodEndDate: Date;
  Status: 'Draft' | 'Submitted' | 'Approved' | 'Returned';
  SubmittedDate?: Date;
  ApprovedDate?: Date;
  ApprovedByUserID?: number;
  ReturnReason?: string;
  IsLocked: boolean;
  CreatedDate: Date;
  ModifiedDate: Date;
}

// Time Entry Types
export interface TimeEntry {
  TimeEntryID: number;
  TimesheetID: number;
  UserID: number;
  ProjectID: number;
  WorkDate: Date;
  HoursWorked: number;
  WorkLocation: 'Office' | 'WFH';
  Notes?: string;
  CreatedDate: Date;
  ModifiedDate: Date;
}

// Timesheet History Types
export interface TimesheetHistory {
  HistoryID: number;
  TimesheetID: number;
  Action: 'Created' | 'Submitted' | 'Approved' | 'Returned' | 'Unlocked' | 'Modified';
  ActionByUserID: number;
  ActionDate: Date;
  Notes?: string;
  PreviousStatus?: string;
  NewStatus?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Approval Types
export interface ApprovalRequest {
  timesheetId: number;
  employeeName: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  submittedDate: Date;
  daysWaiting: number;
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

export interface GrantReport {
  grantIdentifier: string;
  projectName: string;
  employeeName: string;
  department: string;
  date: Date;
  hours: number;
}
