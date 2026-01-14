/**
 * useApprovals Hook
 * React Query hook for managing approval state and operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApprovals,
  getTimesheetEntries,
  approveTimesheet,
  returnTimesheet,
  ApprovalStatus,
  ApprovalEntry,
} from '../services/approvalService';

export interface UseApprovalsOptions {
  statuses?: ApprovalStatus[];
}

export const useApprovals = (options: UseApprovalsOptions = {}) => {
  const { statuses = ['Submitted'] } = options;
  const queryClient = useQueryClient();

  // Fetch approvals with status filter
  const {
    data: approvals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['approvals', statuses.sort().join(',')],
    queryFn: () => getApprovals(statuses),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (timesheetId: number) => approveTimesheet(timesheetId),
    onSuccess: () => {
      // Invalidate all approval queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Return mutation
  const returnMutation = useMutation({
    mutationFn: ({ timesheetId, reason }: { timesheetId: number; reason: string }) =>
      returnTimesheet(timesheetId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Helper to approve
  const approve = async (timesheetId: number) => {
    await approveMutation.mutateAsync(timesheetId);
  };

  // Helper to return
  const sendBack = async (timesheetId: number, reason: string) => {
    await returnMutation.mutateAsync({ timesheetId, reason });
  };

  // Stats
  const pendingCount = approvals.filter((a) => a.status === 'Submitted').length;
  const approvedCount = approvals.filter((a) => a.status === 'Approved').length;
  const returnedCount = approvals.filter((a) => a.status === 'Returned').length;
  const urgentCount = approvals.filter(
    (a) => a.status === 'Submitted' && a.daysWaiting >= 7
  ).length;
  const criticalCount = approvals.filter(
    (a) => a.status === 'Submitted' && a.daysWaiting >= 28
  ).length;

  return {
    approvals,
    isLoading,
    error: error as Error | null,
    refetch,
    approve,
    sendBack,
    isApproving: approveMutation.isPending,
    isReturning: returnMutation.isPending,
    approveError: approveMutation.error as Error | null,
    returnError: returnMutation.error as Error | null,
    stats: {
      pendingCount,
      approvedCount,
      returnedCount,
      urgentCount,
      criticalCount,
    },
  };
};

/**
 * Hook to fetch entries for a specific timesheet
 */
/**
 * Lightweight hook just for pending approval count (for sidebar badge)
 */
export const usePendingApprovalCount = () => {
  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approvals', 'Submitted'],
    queryFn: () => getApprovals(['Submitted']),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes in background
  });

  return {
    count: approvals.length,
    isLoading,
  };
};

/**
 * Hook to fetch entries for a specific timesheet
 */
export const useTimesheetEntries = (timesheetId: number | null) => {
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['approvalEntries', timesheetId],
    queryFn: () => (timesheetId ? getTimesheetEntries(timesheetId) : Promise.resolve([])),
    enabled: !!timesheetId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Group entries by date
  const entriesByDate = entries.reduce((acc, entry) => {
    const date = entry.workDate.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, ApprovalEntry[]>);

  // Calculate total hours
  const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);

  return {
    entries,
    entriesByDate,
    totalHours,
    isLoading,
    error: error as Error | null,
  };
};
