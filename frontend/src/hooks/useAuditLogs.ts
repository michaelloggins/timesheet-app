/**
 * useAuditLogs Hook
 * React Query hook for fetching audit log data
 */

import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, AuditLogFilters, AuditLogEntry } from '../services/auditService';

export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  const {
    data: logs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => getAuditLogs(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  return {
    logs,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

export type { AuditLogEntry, AuditLogFilters };
