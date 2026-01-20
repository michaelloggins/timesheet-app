/**
 * Timesheet Service
 * API calls for timesheet management
 */

import { apiClient } from './api';
import { Timesheet, TimeEntry } from '../types';

export interface CreateTimesheetDto {
  periodStartDate: string;
  periodEndDate: string;
}

export type WorkWeekPattern = 'MondayFriday' | 'TuesdaySaturday';

export interface WorkWeekInfo {
  pattern: WorkWeekPattern;
  workDays: number[];
  defaultHoursPerDay: number;
  defaultProjectId: number | null;
  description: string;
}

export interface DefaultTimeEntry {
  workDate: string;
  projectId: number;
  hoursWorked: number;
  workLocation: 'Office' | 'WFH' | 'Other';
}

export interface UpdateTimesheetDto {
  entries: TimeEntry[];
}

export interface SubmitTimesheetDto {
  timesheetId: number;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

/**
 * Get current user's timesheets
 */
export const getMyTimesheets = async (): Promise<Timesheet[]> => {
  const response = await apiClient.get<ApiResponse<Timesheet[]>>('/timesheets/my');
  return response.data.data || [];
};

/**
 * Get user's work week pattern info
 * Returns the user's schedule pattern based on Entra ID security group membership
 */
export const getWorkWeekInfo = async (): Promise<WorkWeekInfo> => {
  const response = await apiClient.get<ApiResponse<WorkWeekInfo>>('/timesheets/work-week');
  return response.data.data;
};

/**
 * Get default entries for a specific week based on user's work week pattern
 * Useful for previewing what entries would be auto-created
 */
export const getDefaultEntries = async (weekStartDate: string): Promise<DefaultTimeEntry[]> => {
  const response = await apiClient.post<ApiResponse<DefaultTimeEntry[]>>('/timesheets/default-entries', {
    weekStartDate,
  });
  return response.data.data || [];
};

/**
 * Get a specific timesheet by ID
 */
export const getTimesheet = async (timesheetId: number): Promise<Timesheet> => {
  const response = await apiClient.get<ApiResponse<Timesheet>>(`/timesheets/${timesheetId}`);
  return response.data.data;
};

/**
 * Get timesheet for a specific week (returns null if doesn't exist)
 */
export const getTimesheetForWeek = async (weekStartDate: string): Promise<Timesheet | null> => {
  const response = await apiClient.get<ApiResponse<Timesheet | null>>(`/timesheets/week/${weekStartDate}`);
  return response.data.data;
};

/**
 * Get or create timesheet for a specific week
 *
 * When creating a new timesheet, auto-populates default entries based on the
 * user's work week pattern (Monday-Friday or Tuesday-Saturday) unless
 * skipDefaultEntries is true.
 *
 * @param weekStartDate - The Sunday start date of the week (YYYY-MM-DD)
 * @param skipDefaultEntries - If true, skip auto-populating default entries (default: false)
 */
export const getOrCreateTimesheetForWeek = async (
  weekStartDate: string,
  skipDefaultEntries: boolean = false
): Promise<Timesheet> => {
  const response = await apiClient.post<ApiResponse<Timesheet>>('/timesheets/week', {
    weekStartDate,
    skipDefaultEntries,
  });
  return response.data.data;
};

/**
 * Create a new timesheet
 */
export const createTimesheet = async (data: CreateTimesheetDto): Promise<Timesheet> => {
  const response = await apiClient.post<ApiResponse<Timesheet>>('/timesheets', data);
  return response.data.data;
};

/**
 * Update timesheet entries (save draft)
 */
export const updateTimesheet = async (
  timesheetId: number,
  entries: TimeEntry[]
): Promise<Timesheet> => {
  const response = await apiClient.put<ApiResponse<Timesheet>>(`/timesheets/${timesheetId}`, {
    entries,
  });
  return response.data.data;
};

/**
 * Submit timesheet for approval
 */
export const submitTimesheet = async (timesheetId: number): Promise<Timesheet> => {
  const response = await apiClient.post<ApiResponse<Timesheet>>(`/timesheets/${timesheetId}/submit`);
  return response.data.data;
};

/**
 * Withdraw a submitted timesheet (return to draft)
 */
export const withdrawTimesheet = async (timesheetId: number): Promise<Timesheet> => {
  const response = await apiClient.post<ApiResponse<Timesheet>>(`/timesheets/${timesheetId}/withdraw`);
  return response.data.data;
};

/**
 * Delete a timesheet (only if draft)
 */
export const deleteTimesheet = async (timesheetId: number): Promise<void> => {
  await apiClient.delete(`/timesheets/${timesheetId}`);
};

/**
 * Add a time entry to a timesheet
 */
export const addTimeEntry = async (
  timesheetId: number,
  entry: Omit<TimeEntry, 'timeEntryId' | 'timesheetId'>
): Promise<TimeEntry> => {
  const response = await apiClient.post<ApiResponse<TimeEntry>>(`/timesheets/${timesheetId}/entries`, entry);
  return response.data.data;
};

/**
 * Update a time entry
 */
export const updateTimeEntry = async (
  timesheetId: number,
  entryId: number,
  entry: Partial<TimeEntry>
): Promise<void> => {
  await apiClient.put(
    `/timesheets/${timesheetId}/entries/${entryId}`,
    entry
  );
};

/**
 * Delete a time entry
 */
export const deleteTimeEntry = async (timesheetId: number, entryId: number): Promise<void> => {
  await apiClient.delete(`/timesheets/${timesheetId}/entries/${entryId}`);
};

/**
 * Calculate total hours for entries
 */
export const calculateTotalHours = (entries: TimeEntry[]): number => {
  return entries.reduce((total, entry) => total + entry.hoursWorked, 0);
};

/**
 * Calculate total hours by date
 */
export const calculateHoursByDate = (entries: TimeEntry[]): Record<string, number> => {
  return entries.reduce((acc, entry) => {
    // Normalize workDate to YYYY-MM-DD format
    const date = typeof entry.workDate === 'string'
      ? entry.workDate.split('T')[0]
      : formatDate(new Date(entry.workDate));
    acc[date] = (acc[date] || 0) + entry.hoursWorked;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Get week dates (Sunday - Saturday)
 */
export const getWeekDates = (startDate: Date): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);

  // Ensure start is Sunday
  const day = start.getDay();
  const diff = -day; // Sunday is 0, so subtract day to get to Sunday
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }

  return dates;
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get current week start (Sunday)
 */
export const getCurrentWeekStart = (): Date => {
  const today = new Date();
  const day = today.getDay();
  const diff = -day; // Sunday is 0, so subtract day to get to Sunday
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + diff);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
};

/**
 * Navigate to previous week
 */
export const getPreviousWeekStart = (currentStart: Date): Date => {
  const newStart = new Date(currentStart);
  newStart.setDate(currentStart.getDate() - 7);
  return newStart;
};

/**
 * Navigate to next week
 */
export const getNextWeekStart = (currentStart: Date): Date => {
  const newStart = new Date(currentStart);
  newStart.setDate(currentStart.getDate() + 7);
  return newStart;
};
