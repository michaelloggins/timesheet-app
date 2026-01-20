/**
 * useWorkWeek Hook
 * Custom hook for accessing user's work week pattern information
 */

import { useQuery } from '@tanstack/react-query';
import {
  getWorkWeekInfo,
  getDefaultEntries,
  WorkWeekInfo,
  DefaultTimeEntry,
} from '../services/timesheetService';

/**
 * Hook to get the current user's work week pattern info
 *
 * Returns work week pattern based on Entra ID security group membership:
 * - MondayFriday: Default 8 hours Mon-Fri (SG-MVD-Timesheet-WorkWeekMF)
 * - TuesdaySaturday: Default 8 hours Tue-Sat (SG-MVD-Timesheet-WorkWeekTS)
 */
export const useWorkWeekInfo = () => {
  const query = useQuery({
    queryKey: ['workWeekInfo'],
    queryFn: getWorkWeekInfo,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (work week pattern rarely changes)
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });

  return {
    workWeekInfo: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Hook to get default entries for a specific week
 *
 * @param weekStartDate - The Sunday start date of the week (YYYY-MM-DD)
 * @param enabled - Whether to fetch (default: true)
 */
export const useDefaultEntries = (weekStartDate: string, enabled: boolean = true) => {
  const query = useQuery({
    queryKey: ['defaultEntries', weekStartDate],
    queryFn: () => getDefaultEntries(weekStartDate),
    enabled: enabled && !!weekStartDate,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    defaultEntries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Helper to check if a date is a work day for the given pattern
 */
export const isWorkDay = (
  date: Date | string,
  workDays: number[]
): boolean => {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const dayOfWeek = d.getDay();
  return workDays.includes(dayOfWeek);
};

/**
 * Helper to get day names for a work week pattern
 */
export const getWorkDayNames = (pattern: 'MondayFriday' | 'TuesdaySaturday'): string[] => {
  if (pattern === 'TuesdaySaturday') {
    return ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  }
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
};

/**
 * Export types for use in components
 */
export type { WorkWeekInfo, DefaultTimeEntry };
