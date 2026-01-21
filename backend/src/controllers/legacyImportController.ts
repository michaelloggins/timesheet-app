/**
 * Legacy Import Controller
 * API endpoints for managing SharePoint legacy data import
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { legacyImportService } from '../services/legacyImportService';
import { sharePointService } from '../services/sharePointService';
import { logger } from '../utils/logger';

/**
 * Get legacy import status
 * GET /api/admin/legacy-import/status
 */
export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await legacyImportService.getStatus();

  res.status(200).json({
    status: 'success',
    data: status,
  });
});

/**
 * Check if auto-sync should run (called on app load)
 * GET /api/legacy-import/check
 * This endpoint is available to all authenticated users
 */
export const checkAutoSync = asyncHandler(async (req: Request, res: Response) => {
  const shouldSync = await legacyImportService.shouldAutoSync();

  res.status(200).json({
    status: 'success',
    data: {
      shouldSync,
    },
  });
});

/**
 * Trigger auto-sync import (called from frontend on app load)
 * POST /api/legacy-import/auto-sync
 * This endpoint is available to all authenticated users
 */
export const triggerAutoSync = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Check if we should sync
  const shouldSync = await legacyImportService.shouldAutoSync();
  if (!shouldSync) {
    res.status(200).json({
      status: 'success',
      message: 'Auto-sync not needed at this time',
      data: {
        ran: false,
      },
    });
    return;
  }

  logger.info(`Starting auto-sync triggered by user ${userId}`);

  // Run import in background - don't wait for completion
  legacyImportService.runImport(userId, 'Auto')
    .then(result => {
      logger.info(`Auto-sync completed: ${result.importedItems} items imported`);
    })
    .catch(error => {
      logger.error('Auto-sync failed:', error);
    });

  res.status(202).json({
    status: 'success',
    message: 'Import started in background',
    data: {
      ran: true,
    },
  });
});

/**
 * Trigger manual import (admin only)
 * POST /api/admin/legacy-import/run
 */
export const runImport = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  logger.info(`Starting manual import triggered by admin ${userId}`);

  // Run import synchronously for manual trigger
  const result = await legacyImportService.runImport(userId, 'Manual');

  res.status(200).json({
    status: 'success',
    message: `Import completed: ${result.importedItems} items imported`,
    data: result,
  });
});

/**
 * Get import history (admin only)
 * GET /api/admin/legacy-import/history
 */
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const history = await legacyImportService.getImportHistory(limit);

  res.status(200).json({
    status: 'success',
    data: history,
  });
});

/**
 * Get failed imports for review (admin only)
 * GET /api/admin/legacy-import/failed
 */
export const getFailedImports = asyncHandler(async (req: Request, res: Response) => {
  const failed = await legacyImportService.getFailedImports();

  res.status(200).json({
    status: 'success',
    data: failed,
  });
});

/**
 * Update legacy import configuration (admin only)
 * PUT /api/admin/legacy-import/config
 */
export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
  const { enabled, siteId, listId, autoSyncOnLogin } = req.body;

  await legacyImportService.updateConfig({
    enabled,
    siteId,
    listId,
    autoSyncOnLogin,
  });

  res.status(200).json({
    status: 'success',
    message: 'Configuration updated',
  });
});

/**
 * Get available SharePoint sites (admin only)
 * Used for configuration UI
 * GET /api/admin/legacy-import/sharepoint/sites
 */
export const getSharePointSites = asyncHandler(async (req: Request, res: Response) => {
  const { siteUrl } = req.query;

  if (!sharePointService.isAvailable()) {
    res.status(503).json({
      status: 'error',
      message: 'SharePoint service is not available. Check Azure AD credentials.',
    });
    return;
  }

  if (siteUrl) {
    // Get specific site info
    const site = await sharePointService.getSiteInfo(siteUrl as string);
    if (!site) {
      res.status(404).json({
        status: 'error',
        message: 'Site not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: site,
    });
  } else {
    res.status(400).json({
      status: 'error',
      message: 'siteUrl query parameter is required',
    });
  }
});

/**
 * Get lists from a SharePoint site (admin only)
 * GET /api/admin/legacy-import/sharepoint/lists
 */
export const getSharePointLists = asyncHandler(async (req: Request, res: Response) => {
  const { siteId } = req.query;

  if (!siteId) {
    res.status(400).json({
      status: 'error',
      message: 'siteId query parameter is required',
    });
    return;
  }

  if (!sharePointService.isAvailable()) {
    res.status(503).json({
      status: 'error',
      message: 'SharePoint service is not available. Check Azure AD credentials.',
    });
    return;
  }

  const lists = await sharePointService.getLists(siteId as string);

  res.status(200).json({
    status: 'success',
    data: lists,
  });
});

/**
 * Get columns from a SharePoint list (admin only)
 * GET /api/admin/legacy-import/sharepoint/columns
 */
export const getSharePointColumns = asyncHandler(async (req: Request, res: Response) => {
  const { siteId, listId } = req.query;

  if (!siteId || !listId) {
    res.status(400).json({
      status: 'error',
      message: 'siteId and listId query parameters are required',
    });
    return;
  }

  if (!sharePointService.isAvailable()) {
    res.status(503).json({
      status: 'error',
      message: 'SharePoint service is not available. Check Azure AD credentials.',
    });
    return;
  }

  const columns = await sharePointService.getListColumns(siteId as string, listId as string);

  res.status(200).json({
    status: 'success',
    data: columns,
  });
});

/**
 * Preview items from SharePoint list (admin only)
 * GET /api/admin/legacy-import/preview
 */
export const previewItems = asyncHandler(async (req: Request, res: Response) => {
  if (!sharePointService.isAvailable()) {
    res.status(503).json({
      status: 'error',
      message: 'SharePoint service is not available. Check Azure AD credentials.',
    });
    return;
  }

  const status = await legacyImportService.getStatus();

  // Get current config
  const pool = (await import('../config/database')).getPool();
  const configResult = await pool.request().query(`
    SELECT ConfigKey, ConfigValue
    FROM SystemConfig
    WHERE ConfigKey IN ('LegacyImport.SharePointSiteId', 'LegacyImport.SharePointListId')
  `);

  const config: Record<string, string> = {};
  for (const row of configResult.recordset) {
    config[row.ConfigKey] = row.ConfigValue;
  }

  const siteId = config['LegacyImport.SharePointSiteId'];
  const listId = config['LegacyImport.SharePointListId'];

  if (!siteId || !listId) {
    res.status(400).json({
      status: 'error',
      message: 'SharePoint site and list must be configured first',
    });
    return;
  }

  // Fetch preview items (first 10)
  const items = await sharePointService.fetchTimesheetItems({
    siteId,
    listId,
    top: 10,
  });

  // Get item count
  const totalCount = await sharePointService.getItemCount(siteId, listId);

  res.status(200).json({
    status: 'success',
    data: {
      totalItems: totalCount,
      previewItems: items.map(item => ({
        id: item.id,
        fields: item.fields,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
      })),
      currentStatus: status,
    },
  });
});
