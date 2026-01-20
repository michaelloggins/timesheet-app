/**
 * Legacy Import Hook
 * React Query hooks for legacy SharePoint data import
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import * as legacyImportService from '../services/legacyImportService';
import type {
  LegacyImportStatus,
  BatchImportResult,
  ImportHistoryEntry,
  FailedImportEntry,
  PreviewData,
  LegacyImportConfig,
  SharePointListInfo,
  SharePointColumnInfo,
} from '../services/legacyImportService';

// Query keys
export const LEGACY_IMPORT_KEYS = {
  status: ['legacy-import', 'status'] as const,
  history: ['legacy-import', 'history'] as const,
  failed: ['legacy-import', 'failed'] as const,
  preview: ['legacy-import', 'preview'] as const,
  autoSyncCheck: ['legacy-import', 'auto-sync-check'] as const,
};

/**
 * Hook to get legacy import status (admin only)
 */
export const useLegacyImportStatus = () => {
  return useQuery<LegacyImportStatus>({
    queryKey: LEGACY_IMPORT_KEYS.status,
    queryFn: () => legacyImportService.getStatus(),
    staleTime: 1000 * 30, // Cache for 30 seconds
  });
};

/**
 * Hook to get import history (admin only)
 */
export const useLegacyImportHistory = (limit?: number) => {
  return useQuery<ImportHistoryEntry[]>({
    queryKey: [...LEGACY_IMPORT_KEYS.history, limit],
    queryFn: () => legacyImportService.getHistory(limit),
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to get failed imports (admin only)
 */
export const useFailedImports = () => {
  return useQuery<FailedImportEntry[]>({
    queryKey: LEGACY_IMPORT_KEYS.failed,
    queryFn: () => legacyImportService.getFailedImports(),
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to preview import data (admin only)
 */
export const useImportPreview = (enabled: boolean = true) => {
  return useQuery<PreviewData>({
    queryKey: LEGACY_IMPORT_KEYS.preview,
    queryFn: () => legacyImportService.previewImport(),
    enabled,
    staleTime: 1000 * 60, // Cache for 1 minute
  });
};

/**
 * Hook to run manual import (admin only)
 */
export const useRunManualImport = () => {
  const queryClient = useQueryClient();

  return useMutation<BatchImportResult, Error>({
    mutationFn: () => legacyImportService.runManualImport(),
    onSuccess: () => {
      // Invalidate all legacy import queries
      queryClient.invalidateQueries({ queryKey: ['legacy-import'] });
    },
  });
};

/**
 * Hook to update legacy import configuration (admin only)
 */
export const useUpdateLegacyImportConfig = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, LegacyImportConfig>({
    mutationFn: (config) => legacyImportService.updateConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEGACY_IMPORT_KEYS.status });
    },
  });
};

/**
 * Hook to get SharePoint site info (admin only)
 */
export const useSharePointSite = (siteUrl: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['sharepoint', 'site', siteUrl],
    queryFn: () => legacyImportService.getSharePointSite(siteUrl),
    enabled: enabled && !!siteUrl,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
  });
};

/**
 * Hook to get SharePoint lists (admin only)
 */
export const useSharePointLists = (siteId: string, enabled: boolean = true) => {
  return useQuery<SharePointListInfo[]>({
    queryKey: ['sharepoint', 'lists', siteId],
    queryFn: () => legacyImportService.getSharePointLists(siteId),
    enabled: enabled && !!siteId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to get SharePoint list columns (admin only)
 */
export const useSharePointColumns = (siteId: string, listId: string, enabled: boolean = true) => {
  return useQuery<SharePointColumnInfo[]>({
    queryKey: ['sharepoint', 'columns', siteId, listId],
    queryFn: () => legacyImportService.getSharePointColumns(siteId, listId),
    enabled: enabled && !!siteId && !!listId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to handle auto-sync on app load
 * This should be called once when the app initializes
 */
export const useLegacyAutoSync = () => {
  const hasTriggeredRef = useRef(false);
  const queryClient = useQueryClient();

  // Check if auto-sync should run
  const { data: checkResult, isLoading: isChecking } = useQuery({
    queryKey: LEGACY_IMPORT_KEYS.autoSyncCheck,
    queryFn: () => legacyImportService.checkAutoSync(),
    staleTime: 1000 * 60 * 5, // Only check once every 5 minutes
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Trigger auto-sync mutation
  const { mutate: triggerSync, isPending: isSyncing } = useMutation({
    mutationFn: () => legacyImportService.triggerAutoSync(),
    onSuccess: (result) => {
      if (result.ran) {
        // Invalidate status to show updated import info
        queryClient.invalidateQueries({ queryKey: LEGACY_IMPORT_KEYS.status });
      }
    },
    onError: (error) => {
      // Silently fail - auto-sync is not critical
      console.warn('Legacy auto-sync failed:', error);
    },
  });

  // Trigger sync if needed (only once per session)
  useEffect(() => {
    if (checkResult?.shouldSync && !hasTriggeredRef.current && !isSyncing) {
      hasTriggeredRef.current = true;
      triggerSync();
    }
  }, [checkResult?.shouldSync, isSyncing, triggerSync]);

  return {
    isChecking,
    shouldSync: checkResult?.shouldSync ?? false,
    isSyncing,
  };
};

/**
 * Combined hook for admin legacy import management
 */
export const useLegacyImportAdmin = () => {
  const status = useLegacyImportStatus();
  const history = useLegacyImportHistory(10);
  const runImport = useRunManualImport();
  const updateConfig = useUpdateLegacyImportConfig();

  return {
    // Status
    status: status.data,
    isLoadingStatus: status.isLoading,
    statusError: status.error,
    refetchStatus: status.refetch,

    // History
    history: history.data ?? [],
    isLoadingHistory: history.isLoading,

    // Actions
    runImport: runImport.mutate,
    isRunningImport: runImport.isPending,
    importResult: runImport.data,
    importError: runImport.error,

    // Config
    updateConfig: updateConfig.mutate,
    isUpdatingConfig: updateConfig.isPending,
  };
};
