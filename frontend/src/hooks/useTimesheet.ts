/**
 * useTimesheet Hook
 * Custom hook for managing timesheet state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrCreateTimesheetForWeek,
  updateTimesheet,
  submitTimesheet,
  deleteTimeEntry,
  getCurrentWeekStart,
  getPreviousWeekStart,
  getNextWeekStart,
  formatDate,
  getWeekDates,
  calculateTotalHours,
  calculateHoursByDate,
} from '../services/timesheetService';
import { Timesheet, TimeEntry } from '../types';

export interface UseTimesheetReturn {
  // State
  timesheet: Timesheet | null;
  entries: TimeEntry[];
  weekStart: Date;
  weekDates: Date[];
  totalHours: number;
  hoursByDate: Record<string, number>;
  isLoading: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  error: Error | null;

  // Actions
  navigateToPreviousWeek: () => void;
  navigateToNextWeek: () => void;
  navigateToCurrentWeek: () => void;
  addOrUpdateEntry: (entry: Partial<TimeEntry>) => void;
  removeEntry: (entryId: number) => void;
  saveDraft: () => Promise<void>;
  submit: () => Promise<void>;
  canSubmit: boolean;
}

export const useTimesheet = () => {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState<Date>(getCurrentWeekStart());
  const [localEntries, setLocalEntries] = useState<TimeEntry[]>([]);

  // Get week dates
  const weekDates = getWeekDates(weekStart);

  // Fetch timesheet for current week
  const {
    data: timesheet,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['timesheet', formatDate(weekStart)],
    queryFn: () => getOrCreateTimesheetForWeek(formatDate(weekStart)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update local entries when timesheet data changes
  useEffect(() => {
    if (timesheet?.entries) {
      setLocalEntries(timesheet.entries);
    }
  }, [timesheet]);

  // Save draft mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!timesheet) throw new Error('No timesheet loaded');
      return updateTimesheet(timesheet.timesheetId, localEntries);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['timesheet', formatDate(weekStart)], data);
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!timesheet) throw new Error('No timesheet loaded');
      // Save first, then submit
      await updateTimesheet(timesheet.timesheetId, localEntries);
      return submitTimesheet(timesheet.timesheetId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['timesheet', formatDate(weekStart)], data);
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      if (!timesheet) throw new Error('No timesheet loaded');
      await deleteTimeEntry(timesheet.timesheetId, entryId);
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Navigate to previous week
  const navigateToPreviousWeek = useCallback(() => {
    setWeekStart((current) => getPreviousWeekStart(current));
  }, []);

  // Navigate to next week
  const navigateToNextWeek = useCallback(() => {
    setWeekStart((current) => getNextWeekStart(current));
  }, []);

  // Navigate to current week
  const navigateToCurrentWeek = useCallback(() => {
    setWeekStart(getCurrentWeekStart());
  }, []);

  // Add or update entry
  const addOrUpdateEntry = useCallback((entry: Partial<TimeEntry>) => {
    setLocalEntries((current) => {
      // Check if entry exists for this project and date
      const existingIndex = current.findIndex(
        (e) => e.projectId === entry.projectId && e.workDate === entry.workDate
      );

      if (existingIndex >= 0) {
        // Update existing entry
        const updated = [...current];
        updated[existingIndex] = { ...updated[existingIndex], ...entry };
        return updated;
      } else {
        // Add new entry
        const newEntry: TimeEntry = {
          timeEntryId: Date.now(), // Temporary ID for optimistic updates
          timesheetId: timesheet?.timesheetId || 0,
          projectId: entry.projectId || 0,
          workDate: entry.workDate || '',
          hoursWorked: entry.hoursWorked || 0,
          workLocation: entry.workLocation || 'Office',
          notes: entry.notes,
        };
        return [...current, newEntry];
      }
    });
  }, [timesheet]);

  // Remove entry
  const removeEntry = useCallback((entryId: number) => {
    setLocalEntries((current) => current.filter((e) => e.timeEntryId !== entryId));
    deleteEntryMutation.mutate(entryId);
  }, [deleteEntryMutation]);

  // Save draft
  const saveDraft = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);

  // Submit
  const submit = useCallback(async () => {
    await submitMutation.mutateAsync();
  }, [submitMutation]);

  // Calculate totals
  const totalHours = calculateTotalHours(localEntries);
  const hoursByDate = calculateHoursByDate(localEntries);

  // Can submit validation
  const canSubmit =
    timesheet?.status === 'Draft' &&
    !timesheet?.isLocked &&
    localEntries.length > 0 &&
    totalHours > 0;

  return {
    // State
    timesheet,
    entries: localEntries,
    weekStart,
    weekDates,
    totalHours,
    hoursByDate,
    isLoading,
    isSaving: saveMutation.isPending,
    isSubmitting: submitMutation.isPending,
    error: error as Error | null,

    // Actions
    navigateToPreviousWeek,
    navigateToNextWeek,
    navigateToCurrentWeek,
    addOrUpdateEntry,
    removeEntry,
    saveDraft,
    submit,
    canSubmit,
  };
};
