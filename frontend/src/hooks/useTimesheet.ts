/**
 * useTimesheet Hook
 * Custom hook for managing timesheet state and operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTimesheetForWeek,
  getOrCreateTimesheetForWeek,
  updateTimesheet,
  submitTimesheet,
  withdrawTimesheet,
  deleteTimeEntry,
  getCurrentWeekStart,
  getPreviousWeekStart,
  getNextWeekStart,
  formatDate,
  getWeekDates,
  calculateTotalHours,
  calculateHoursByDate,
} from '../services/timesheetService';
import { Timesheet, TimeEntry, Project } from '../types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseTimesheetOptions {
  projects?: Project[];
  initialWeekStart?: Date | string;
  autoSave?: boolean; // Enable auto-save (default: true)
  autoSaveDelay?: number; // Delay in ms (default: 1500)
  lazyCreate?: boolean; // Only create timesheet when user adds entry (default: false)
}

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
  isWithdrawing: boolean;
  error: Error | null;
  saveStatus: SaveStatus;
  hasUnsavedChanges: boolean;

  // Actions
  navigateToPreviousWeek: () => void;
  navigateToNextWeek: () => void;
  navigateToCurrentWeek: () => void;
  addOrUpdateEntry: (entry: Partial<TimeEntry>) => void;
  removeEntry: (entryId: number) => void;
  saveDraft: () => Promise<void>;
  submit: () => Promise<void>;
  withdraw: () => Promise<void>;
  canSubmit: boolean;
  canWithdraw: boolean;
  submitBlockedReason: string | null;
}

export const useTimesheet = (options: UseTimesheetOptions = {}) => {
  const { projects = [], initialWeekStart, autoSave = true, autoSaveDelay = 1500, lazyCreate = false } = options;
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedEntriesRef = useRef<string>('');

  // Parse date string as local time (not UTC) to avoid timezone shift
  const parseLocalDate = (dateStr: string | Date): Date => {
    if (dateStr instanceof Date) return dateStr;
    const str = dateStr.split('T')[0];
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Determine initial week start
  const getInitialWeekStart = (): Date => {
    if (initialWeekStart) {
      const date = parseLocalDate(initialWeekStart);
      // Normalize to Sunday of that week (consistent with timesheetService)
      const day = date.getDay();
      const diff = -day; // Sunday is 0, so subtract day to get to Sunday
      const sunday = new Date(date);
      sunday.setDate(date.getDate() + diff);
      sunday.setHours(0, 0, 0, 0);
      return sunday;
    }
    return getCurrentWeekStart();
  };

  const [weekStart, setWeekStart] = useState<Date>(getInitialWeekStart);
  const [localEntries, setLocalEntries] = useState<TimeEntry[]>([]);

  // Get week dates
  const weekDates = getWeekDates(weekStart);

  // Fetch timesheet for current week
  // If lazyCreate is true, just check if it exists (don't create)
  const {
    data: timesheet,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['timesheet', formatDate(weekStart), lazyCreate],
    queryFn: () => lazyCreate
      ? getTimesheetForWeek(formatDate(weekStart))
      : getOrCreateTimesheetForWeek(formatDate(weekStart)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to create timesheet when needed (for lazy create mode)
  const createTimesheetMutation = useMutation({
    mutationFn: () => getOrCreateTimesheetForWeek(formatDate(weekStart)),
    onSuccess: (data) => {
      queryClient.setQueryData(['timesheet', formatDate(weekStart), lazyCreate], data);
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });

  // Update local entries when timesheet data changes
  useEffect(() => {
    if (timesheet?.entries) {
      setLocalEntries(timesheet.entries);
      // Track initial state for change detection
      lastSavedEntriesRef.current = JSON.stringify(timesheet.entries);
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
    }
  }, [timesheet]);

  // Track unsaved changes
  useEffect(() => {
    const currentState = JSON.stringify(localEntries);
    const hasChanges = currentState !== lastSavedEntriesRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [localEntries]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges || !timesheet || timesheet.status !== 'Draft') {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await updateTimesheet(timesheet.timesheetId, localEntries);
        lastSavedEntriesRef.current = JSON.stringify(localEntries);
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        // Reset to idle after showing "saved" briefly
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSave, hasUnsavedChanges, timesheet, localEntries, autoSaveDelay, queryClient]);

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

  // Withdraw mutation (return submitted timesheet to draft)
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!timesheet) throw new Error('No timesheet loaded');
      return withdrawTimesheet(timesheet.timesheetId);
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
  const addOrUpdateEntry = useCallback(async (entry: Partial<TimeEntry>) => {
    // In lazy create mode, create timesheet if it doesn't exist
    if (lazyCreate && !timesheet) {
      await createTimesheetMutation.mutateAsync();
    }

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
  }, [timesheet, lazyCreate, createTimesheetMutation]);

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

  // Withdraw (return submitted timesheet to draft)
  const withdraw = useCallback(async () => {
    await withdrawMutation.mutateAsync();
  }, [withdrawMutation]);

  // Calculate totals
  const totalHours = calculateTotalHours(localEntries);
  const hoursByDate = calculateHoursByDate(localEntries);

  // Check if all entries are PTO or Holiday (no time restriction for these)
  const isAllPtoOrHoliday = localEntries.length > 0 && localEntries.every((entry) => {
    const project = projects.find((p) => p.projectId === entry.projectId);
    return project?.projectType === 'PTO' || project?.projectType === 'Holiday';
  });

  // Check if we're past Friday 12pm of the timesheet week
  const canSubmitByTime = (): { allowed: boolean; reason: string | null } => {
    if (isAllPtoOrHoliday) {
      return { allowed: true, reason: null };
    }

    const now = new Date();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    // Get Friday 12pm of the timesheet week
    const friday = new Date(weekStart);
    friday.setDate(weekStart.getDate() + 4); // Friday (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4)
    friday.setHours(12, 0, 0, 0);

    if (now < friday) {
      const fridayStr = friday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      return {
        allowed: false,
        reason: `Cannot submit until Friday 12:00 PM (${fridayStr}). Exception: PTO/Holiday-only timesheets can be submitted anytime.`,
      };
    }

    return { allowed: true, reason: null };
  };

  const submitTimeCheck = canSubmitByTime();

  // Can submit validation
  const canSubmit =
    timesheet?.status === 'Draft' &&
    !timesheet?.isLocked &&
    localEntries.length > 0 &&
    totalHours > 0 &&
    submitTimeCheck.allowed;

  const submitBlockedReason = submitTimeCheck.reason;

  // Can withdraw (only if submitted, not yet approved)
  const canWithdraw = timesheet?.status === 'Submitted';

  return {
    // State
    timesheet,
    entries: localEntries,
    weekStart,
    weekDates,
    totalHours,
    hoursByDate,
    isLoading,
    isSaving: saveMutation.isPending || saveStatus === 'saving',
    isSubmitting: submitMutation.isPending,
    isWithdrawing: withdrawMutation.isPending,
    error: error as Error | null,
    saveStatus,
    hasUnsavedChanges,

    // Actions
    navigateToPreviousWeek,
    navigateToNextWeek,
    navigateToCurrentWeek,
    addOrUpdateEntry,
    removeEntry,
    saveDraft,
    submit,
    withdraw,
    canSubmit,
    canWithdraw,
    submitBlockedReason,
  };
};
