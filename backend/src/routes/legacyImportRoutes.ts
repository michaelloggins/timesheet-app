/**
 * Legacy Import Routes
 * Routes for SharePoint legacy data import
 */

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import * as legacyImportController from '../controllers/legacyImportController';

const router = Router();

// ======================================
// PUBLIC ROUTES (require authentication)
// These routes are available to all authenticated users
// ======================================

// Check if auto-sync should run (called on app load)
router.get('/check', authenticate, legacyImportController.checkAutoSync);

// Trigger auto-sync (called from frontend when check returns shouldSync=true)
router.post('/auto-sync', authenticate, legacyImportController.triggerAutoSync);

// ======================================
// ADMIN ROUTES (require admin role)
// These routes are only available to TimesheetAdmin
// ======================================
const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

// Get import status
adminRouter.get('/status', legacyImportController.getStatus);

// Run manual import
adminRouter.post('/run', legacyImportController.runImport);

// Get import history
adminRouter.get('/history', legacyImportController.getHistory);

// Get failed imports
adminRouter.get('/failed', legacyImportController.getFailedImports);

// Get batch log details
adminRouter.get('/batch/:batchId/log', legacyImportController.getBatchLog);

// Update configuration
adminRouter.put('/config', legacyImportController.updateConfig);

// SharePoint discovery endpoints
adminRouter.get('/sharepoint/sites', legacyImportController.getSharePointSites);
adminRouter.get('/sharepoint/lists', legacyImportController.getSharePointLists);
adminRouter.get('/sharepoint/columns', legacyImportController.getSharePointColumns);

// Preview import data
adminRouter.get('/preview', legacyImportController.previewItems);

// Export both routers
export const legacyImportRoutes = router;
export const legacyImportAdminRoutes = adminRouter;
