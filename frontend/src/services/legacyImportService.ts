/**
 * Legacy Import Service
 * API calls for SharePoint legacy data import
 */

import { apiClient } from './api';

/**
 * Legacy import status
 */
export interface LegacyImportStatus {
  enabled: boolean;
  lastSyncDate: string | null;
  autoSyncOnLogin: boolean;
  pendingItems: number;
  importedItems: number;
  failedItems: number;
  lastBatch: {
    batchId: number;
    status: string;
    startDate: string;
    endDate: string | null;
    totalItems: number;
    importedItems: number;
  } | null;
}

/**
 * Auto-sync check result
 */
export interface AutoSyncCheckResult {
  shouldSync: boolean;
}

/**
 * Auto-sync trigger result
 */
export interface AutoSyncTriggerResult {
  ran: boolean;
}

/**
 * Import batch result
 */
export interface BatchImportResult {
  batchId: number;
  status: 'Completed' | 'Failed';
  totalItems: number;
  importedItems: number;
  skippedItems: number;
  failedItems: number;
  userNotFoundItems: number;
  duplicateItems: number;
  errors: string[];
}

/**
 * Import history entry
 */
export interface ImportHistoryEntry {
  batchId: number;
  triggerType: string;
  triggerUserName: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  totalItems: number;
  importedItems: number;
  skippedItems: number;
  failedItems: number;
}

/**
 * Failed import entry
 */
export interface FailedImportEntry {
  importId: number;
  sharePointItemId: string;
  status: string;
  errorMessage: string | null;
  sourceData: Record<string, unknown>;
}

/**
 * SharePoint list info
 */
export interface SharePointListInfo {
  id: string;
  displayName: string;
  webUrl: string;
  description?: string;
}

/**
 * SharePoint column info
 */
export interface SharePointColumnInfo {
  name: string;
  displayName: string;
  type: string;
}

/**
 * Preview data
 */
export interface PreviewData {
  totalItems: number;
  previewItems: Array<{
    id: string;
    fields: Record<string, unknown>;
    createdDateTime?: string;
    lastModifiedDateTime?: string;
  }>;
  currentStatus: LegacyImportStatus;
}

/**
 * Legacy import configuration
 */
export interface LegacyImportConfig {
  enabled?: boolean;
  siteId?: string;
  listId?: string;
  autoSyncOnLogin?: boolean;
}

// ======================================
// PUBLIC API CALLS (for all users)
// ======================================

/**
 * Check if auto-sync should run
 */
export async function checkAutoSync(): Promise<AutoSyncCheckResult> {
  const response = await apiClient.get('/legacy-import/check');
  return response.data.data;
}

/**
 * Trigger auto-sync (runs in background)
 */
export async function triggerAutoSync(): Promise<AutoSyncTriggerResult> {
  const response = await apiClient.post('/legacy-import/auto-sync');
  return response.data.data;
}

// ======================================
// ADMIN API CALLS
// ======================================

/**
 * Get legacy import status
 */
export async function getStatus(): Promise<LegacyImportStatus> {
  const response = await apiClient.get('/admin/legacy-import/status');
  return response.data.data;
}

/**
 * Run manual import
 */
export async function runManualImport(): Promise<BatchImportResult> {
  const response = await apiClient.post('/admin/legacy-import/run');
  return response.data.data;
}

/**
 * Get import history
 */
export async function getHistory(limit?: number): Promise<ImportHistoryEntry[]> {
  const params = limit ? { limit } : {};
  const response = await apiClient.get('/admin/legacy-import/history', { params });
  return response.data.data;
}

/**
 * Get failed imports
 */
export async function getFailedImports(): Promise<FailedImportEntry[]> {
  const response = await apiClient.get('/admin/legacy-import/failed');
  return response.data.data;
}

/**
 * Update legacy import configuration
 */
export async function updateConfig(config: LegacyImportConfig): Promise<void> {
  await apiClient.put('/admin/legacy-import/config', config);
}

/**
 * Get SharePoint site info
 */
export async function getSharePointSite(siteUrl: string): Promise<{ id: string; displayName: string; webUrl: string }> {
  const response = await apiClient.get('/admin/legacy-import/sharepoint/sites', {
    params: { siteUrl },
  });
  return response.data.data;
}

/**
 * Get SharePoint lists
 */
export async function getSharePointLists(siteId: string): Promise<SharePointListInfo[]> {
  const response = await apiClient.get('/admin/legacy-import/sharepoint/lists', {
    params: { siteId },
  });
  return response.data.data;
}

/**
 * Get SharePoint list columns
 */
export async function getSharePointColumns(siteId: string, listId: string): Promise<SharePointColumnInfo[]> {
  const response = await apiClient.get('/admin/legacy-import/sharepoint/columns', {
    params: { siteId, listId },
  });
  return response.data.data;
}

/**
 * Preview import data
 */
export async function previewImport(): Promise<PreviewData> {
  const response = await apiClient.get('/admin/legacy-import/preview');
  return response.data.data;
}

/**
 * Batch log details
 */
export interface BatchLogData {
  batch: {
    batchId: number;
    triggerType: string;
    triggerUserName: string | null;
    status: string;
    startDate: string;
    endDate: string | null;
    totalItems: number;
    importedItems: number;
    skippedItems: number;
    failedItems: number;
    errorMessage: string | null;
  };
  summary: {
    imported: number;
    skipped: number;
    failed: number;
    userNotFound: number;
    duplicate: number;
  };
  failuresByUser: Array<{ userName: string; count: number }>;
  recentErrors: Array<{ itemId: string; status: string; error: string | null }>;
}

/**
 * Get batch log details
 */
export async function getBatchLog(batchId: number): Promise<BatchLogData> {
  const response = await apiClient.get(`/admin/legacy-import/batch/${batchId}/log`);
  return response.data.data;
}

/**
 * Import from CSV content
 */
export async function importCsv(csvContent: string): Promise<BatchImportResult> {
  const response = await apiClient.post('/admin/legacy-import/csv', { csvContent });
  return response.data.data;
}
