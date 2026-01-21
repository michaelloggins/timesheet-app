/**
 * Legacy Import Service
 * Handles importing timesheet data from legacy SharePoint Lists
 * - Fetches data from SharePoint via Graph API
 * - Normalizes data to match current schema
 * - Groups entries by week to create timesheets
 * - Tracks imported items to prevent duplicates
 */

import { getPool } from '../config/database';
import { sharePointService, SharePointTimesheetItem } from './sharePointService';
import { logger } from '../utils/logger';
import { getWeekStart, getWeekEnd } from '../utils/dateHelper';

/**
 * Normalized entry ready for database insert
 */
interface NormalizedEntry {
  sharePointItemId: string;
  employeeEmail: string;
  employeeName: string;
  workDate: Date;
  projectName: string | null;
  projectCode: string | null;
  hoursWorked: number;
  workLocation: 'Office' | 'WFH' | 'Other';
  notes: string | null;
  originalData: string; // JSON string of original SharePoint data
}

/**
 * Import result for a single item
 */
interface ItemImportResult {
  sharePointItemId: string;
  status: 'Imported' | 'Skipped' | 'Failed' | 'UserNotFound' | 'Duplicate';
  userId?: number;
  timesheetId?: number;
  timeEntryId?: number;
  errorMessage?: string;
}

/**
 * Batch import result
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
  itemResults: ItemImportResult[];
}

/**
 * Legacy import status for frontend display
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

class LegacyImportService {
  /**
   * Get configuration from SystemConfig table
   */
  private async getConfig(key: string): Promise<string | null> {
    const pool = getPool();
    const result = await pool.request()
      .input('key', key)
      .query('SELECT ConfigValue FROM SystemConfig WHERE ConfigKey = @key');
    return result.recordset[0]?.ConfigValue || null;
  }

  /**
   * Update configuration in SystemConfig table
   */
  private async setConfig(key: string, value: string): Promise<void> {
    const pool = getPool();
    await pool.request()
      .input('key', key)
      .input('value', value)
      .query(`
        UPDATE SystemConfig
        SET ConfigValue = @value, ModifiedDate = GETUTCDATE()
        WHERE ConfigKey = @key
      `);
  }

  /**
   * Check if legacy import is enabled
   */
  async isEnabled(): Promise<boolean> {
    const enabled = await this.getConfig('LegacyImport.Enabled');
    return enabled?.toLowerCase() === 'true';
  }

  /**
   * Check if auto-sync on login is enabled
   */
  async isAutoSyncEnabled(): Promise<boolean> {
    const enabled = await this.getConfig('LegacyImport.AutoSyncOnLogin');
    return enabled?.toLowerCase() === 'true';
  }

  /**
   * Get the current import status
   */
  async getStatus(): Promise<LegacyImportStatus> {
    const pool = getPool();

    const [enabled, lastSyncDate, autoSyncOnLogin] = await Promise.all([
      this.isEnabled(),
      this.getConfig('LegacyImport.LastSyncDate'),
      this.isAutoSyncEnabled(),
    ]);

    // Get counts from tracking table
    const countsResult = await pool.request().query(`
      SELECT
        SUM(CASE WHEN ImportStatus = 'Pending' THEN 1 ELSE 0 END) AS PendingItems,
        SUM(CASE WHEN ImportStatus = 'Imported' THEN 1 ELSE 0 END) AS ImportedItems,
        SUM(CASE WHEN ImportStatus IN ('Failed', 'UserNotFound') THEN 1 ELSE 0 END) AS FailedItems
      FROM LegacyImportTracking
    `);

    const counts = countsResult.recordset[0] || { PendingItems: 0, ImportedItems: 0, FailedItems: 0 };

    // Get last batch info
    const lastBatchResult = await pool.request().query(`
      SELECT TOP 1 BatchID, Status, StartDate, EndDate, TotalItems, ImportedItems
      FROM LegacyImportBatch
      ORDER BY StartDate DESC
    `);

    const lastBatch = lastBatchResult.recordset[0]
      ? {
          batchId: lastBatchResult.recordset[0].BatchID,
          status: lastBatchResult.recordset[0].Status,
          startDate: lastBatchResult.recordset[0].StartDate?.toISOString() || '',
          endDate: lastBatchResult.recordset[0].EndDate?.toISOString() || null,
          totalItems: lastBatchResult.recordset[0].TotalItems,
          importedItems: lastBatchResult.recordset[0].ImportedItems,
        }
      : null;

    return {
      enabled,
      lastSyncDate,
      autoSyncOnLogin,
      pendingItems: counts.PendingItems || 0,
      importedItems: counts.ImportedItems || 0,
      failedItems: counts.FailedItems || 0,
      lastBatch,
    };
  }

  /**
   * Normalize a SharePoint item into our format
   */
  private normalizeItem(item: SharePointTimesheetItem): NormalizedEntry | null {
    const fields = item.fields;

    // Get employee identifier (try multiple field names)
    const employeeEmail = fields.EmployeeEmail || fields.Email || fields.UserEmail || '';
    const employeeName = fields.EmployeeName || fields.Title || fields.Employee || fields.Name || '';

    if (!employeeEmail && !employeeName) {
      logger.warn(`Item ${item.id} has no employee identifier`);
      return null;
    }

    // Parse work date
    const workDateStr = fields.WorkDate || fields.Date || fields.EntryDate || fields.Work_x0020_Date;
    const workDate = sharePointService.parseSharePointDate(workDateStr);
    if (!workDate) {
      logger.warn(`Item ${item.id} has invalid work date: ${workDateStr}`);
      return null;
    }

    // Parse hours
    const hoursWorked = sharePointService.parseHours(
      fields.HoursWorked || fields.Hours || fields.Hours_x0020_Worked || 0
    );
    if (hoursWorked <= 0) {
      logger.debug(`Item ${item.id} has no hours, skipping`);
      return null;
    }

    // Normalize work location
    const workLocation = sharePointService.normalizeWorkLocation(
      fields.WorkLocation || fields.Location || fields.Work_x0020_Location
    );

    return {
      sharePointItemId: item.id,
      employeeEmail: employeeEmail.toLowerCase().trim(),
      employeeName: employeeName.trim(),
      workDate,
      projectName: fields.ProjectName || fields.Project || fields.Project_x0020_Name || null,
      projectCode: fields.ProjectCode || fields.ProjectNumber || fields.Project_x0020_Code || null,
      hoursWorked,
      workLocation,
      notes: fields.Notes || fields.Comments || fields.Description || null,
      originalData: JSON.stringify(fields),
    };
  }

  /**
   * Find user by email or name
   */
  private async findUser(email: string, name: string): Promise<number | null> {
    const pool = getPool();

    // Try by email first (most reliable)
    if (email) {
      const byEmail = await pool.request()
        .input('email', email)
        .query('SELECT UserID FROM Users WHERE LOWER(Email) = LOWER(@email) AND IsActive = 1');
      if (byEmail.recordset.length > 0) {
        return byEmail.recordset[0].UserID;
      }
    }

    // Try by name
    if (name) {
      const byName = await pool.request()
        .input('name', name)
        .query('SELECT UserID FROM Users WHERE Name = @name AND IsActive = 1');
      if (byName.recordset.length > 0) {
        return byName.recordset[0].UserID;
      }

      // Try partial name match (last name, first name format or vice versa)
      const byPartialName = await pool.request()
        .input('name', `%${name}%`)
        .query('SELECT UserID FROM Users WHERE Name LIKE @name AND IsActive = 1');
      if (byPartialName.recordset.length === 1) {
        // Only use if exactly one match
        return byPartialName.recordset[0].UserID;
      }
    }

    return null;
  }

  /**
   * Find or create project by name/code
   */
  private async findProject(projectName: string | null, projectCode: string | null): Promise<number | null> {
    if (!projectName && !projectCode) return null;

    const pool = getPool();

    // Try by project code first
    if (projectCode) {
      const byCode = await pool.request()
        .input('code', projectCode)
        .query('SELECT ProjectID FROM Projects WHERE ProjectNumber = @code AND IsActive = 1');
      if (byCode.recordset.length > 0) {
        return byCode.recordset[0].ProjectID;
      }
    }

    // Try by project name
    if (projectName) {
      const byName = await pool.request()
        .input('name', projectName)
        .query('SELECT ProjectID FROM Projects WHERE ProjectName = @name AND IsActive = 1');
      if (byName.recordset.length > 0) {
        return byName.recordset[0].ProjectID;
      }

      // Try partial match
      const byPartialName = await pool.request()
        .input('name', `%${projectName}%`)
        .query('SELECT ProjectID FROM Projects WHERE ProjectName LIKE @name AND IsActive = 1');
      if (byPartialName.recordset.length === 1) {
        return byPartialName.recordset[0].ProjectID;
      }
    }

    // Return default work project if no match found
    const defaultProject = await pool.request()
      .query("SELECT TOP 1 ProjectID FROM Projects WHERE ProjectNumber = 'WRK-001' AND IsActive = 1");
    return defaultProject.recordset[0]?.ProjectID || null;
  }

  /**
   * Find or create timesheet for a user and week
   */
  private async findOrCreateTimesheet(
    userId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const pool = getPool();

    // Check if timesheet exists
    const existing = await pool.request()
      .input('userId', userId)
      .input('startDate', periodStart)
      .query(`
        SELECT TimesheetID FROM Timesheets
        WHERE UserID = @userId AND PeriodStartDate = @startDate
      `);

    if (existing.recordset.length > 0) {
      return existing.recordset[0].TimesheetID;
    }

    // Create new timesheet
    const result = await pool.request()
      .input('userId', userId)
      .input('startDate', periodStart)
      .input('endDate', periodEnd)
      .query(`
        INSERT INTO Timesheets (UserID, PeriodStartDate, PeriodEndDate, Status, IsLocked)
        VALUES (@userId, @startDate, @endDate, 'Draft', 0);
        SELECT SCOPE_IDENTITY() AS TimesheetID;
      `);

    return result.recordset[0].TimesheetID;
  }

  /**
   * Check if an item has already been imported
   */
  private async isAlreadyImported(
    sharePointItemId: string,
    sharePointListId: string,
    sharePointSiteId: string
  ): Promise<boolean> {
    const pool = getPool();
    const result = await pool.request()
      .input('itemId', sharePointItemId)
      .input('listId', sharePointListId)
      .input('siteId', sharePointSiteId)
      .query(`
        SELECT ImportID FROM LegacyImportTracking
        WHERE SharePointListItemID = @itemId
          AND SharePointListID = @listId
          AND SharePointSiteID = @siteId
          AND ImportStatus = 'Imported'
      `);
    return result.recordset.length > 0;
  }

  /**
   * Record import result in tracking table
   */
  private async recordImportResult(
    sharePointItemId: string,
    sharePointListId: string,
    sharePointSiteId: string,
    result: ItemImportResult,
    sourceData: string
  ): Promise<void> {
    const pool = getPool();
    await pool.request()
      .input('itemId', sharePointItemId)
      .input('listId', sharePointListId)
      .input('siteId', sharePointSiteId)
      .input('userId', result.userId || null)
      .input('timesheetId', result.timesheetId || null)
      .input('timeEntryId', result.timeEntryId || null)
      .input('sourceData', sourceData)
      .input('status', result.status)
      .input('error', result.errorMessage || null)
      .query(`
        MERGE LegacyImportTracking AS target
        USING (SELECT @itemId AS ItemId, @listId AS ListId, @siteId AS SiteId) AS source
        ON target.SharePointListItemID = source.ItemId
           AND target.SharePointListID = source.ListId
           AND target.SharePointSiteID = source.SiteId
        WHEN MATCHED THEN
          UPDATE SET
            UserID = @userId,
            TimesheetID = @timesheetId,
            TimeEntryID = @timeEntryId,
            SourceData = @sourceData,
            ImportStatus = @status,
            ImportedDate = CASE WHEN @status = 'Imported' THEN GETUTCDATE() ELSE ImportedDate END,
            ErrorMessage = @error,
            ModifiedDate = GETUTCDATE()
        WHEN NOT MATCHED THEN
          INSERT (SharePointListItemID, SharePointListID, SharePointSiteID, UserID, TimesheetID, TimeEntryID, SourceData, ImportStatus, ImportedDate, ErrorMessage)
          VALUES (@itemId, @listId, @siteId, @userId, @timesheetId, @timeEntryId, @sourceData, @status, CASE WHEN @status = 'Imported' THEN GETUTCDATE() ELSE NULL END, @error);
      `);
  }

  /**
   * Import a single normalized entry
   */
  private async importEntry(
    entry: NormalizedEntry,
    sharePointListId: string,
    sharePointSiteId: string
  ): Promise<ItemImportResult> {
    const pool = getPool();

    try {
      // Check if already imported
      if (await this.isAlreadyImported(entry.sharePointItemId, sharePointListId, sharePointSiteId)) {
        return {
          sharePointItemId: entry.sharePointItemId,
          status: 'Duplicate',
        };
      }

      // Find user
      const userId = await this.findUser(entry.employeeEmail, entry.employeeName);
      if (!userId) {
        return {
          sharePointItemId: entry.sharePointItemId,
          status: 'UserNotFound',
          errorMessage: `User not found: ${entry.employeeEmail || entry.employeeName}`,
        };
      }

      // Find project
      const projectId = await this.findProject(entry.projectName, entry.projectCode);

      // Get week boundaries
      const weekStart = getWeekStart(entry.workDate);
      const weekEnd = getWeekEnd(entry.workDate);

      // Find or create timesheet
      const timesheetId = await this.findOrCreateTimesheet(userId, weekStart, weekEnd);

      // Check if time entry already exists for this date and project
      const existingEntry = await pool.request()
        .input('timesheetId', timesheetId)
        .input('userId', userId)
        .input('projectId', projectId)
        .input('workDate', entry.workDate)
        .query(`
          SELECT TimeEntryID FROM TimeEntries
          WHERE TimesheetID = @timesheetId
            AND UserID = @userId
            AND ProjectID = @projectId
            AND WorkDate = @workDate
        `);

      let timeEntryId: number;

      if (existingEntry.recordset.length > 0) {
        // Update existing entry (add hours)
        timeEntryId = existingEntry.recordset[0].TimeEntryID;
        await pool.request()
          .input('entryId', timeEntryId)
          .input('hours', entry.hoursWorked)
          .input('location', entry.workLocation)
          .input('notes', entry.notes)
          .query(`
            UPDATE TimeEntries
            SET HoursWorked = HoursWorked + @hours,
                WorkLocation = @location,
                Notes = CASE WHEN @notes IS NOT NULL THEN
                  CASE WHEN Notes IS NULL THEN @notes ELSE Notes + '; ' + @notes END
                  ELSE Notes END,
                ModifiedDate = GETUTCDATE()
            WHERE TimeEntryID = @entryId
          `);
      } else {
        // Insert new entry
        const insertResult = await pool.request()
          .input('timesheetId', timesheetId)
          .input('userId', userId)
          .input('projectId', projectId)
          .input('workDate', entry.workDate)
          .input('hours', entry.hoursWorked)
          .input('location', entry.workLocation)
          .input('notes', entry.notes)
          .query(`
            INSERT INTO TimeEntries (TimesheetID, UserID, ProjectID, WorkDate, HoursWorked, WorkLocation, Notes)
            VALUES (@timesheetId, @userId, @projectId, @workDate, @hours, @location, @notes);
            SELECT SCOPE_IDENTITY() AS TimeEntryID;
          `);
        timeEntryId = insertResult.recordset[0].TimeEntryID;
      }

      return {
        sharePointItemId: entry.sharePointItemId,
        status: 'Imported',
        userId,
        timesheetId,
        timeEntryId,
      };
    } catch (error: any) {
      logger.error(`Failed to import entry ${entry.sharePointItemId}:`, error);
      return {
        sharePointItemId: entry.sharePointItemId,
        status: 'Failed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Run a full import batch from SharePoint
   */
  async runImport(triggerUserId: number | null, triggerType: 'Auto' | 'Manual'): Promise<BatchImportResult> {
    const pool = getPool();

    // Check if enabled
    if (!(await this.isEnabled())) {
      throw new Error('Legacy import is not enabled');
    }

    // Check if SharePoint service is available
    if (!sharePointService.isAvailable()) {
      throw new Error('SharePoint service is not available - check Azure AD credentials');
    }

    // Get SharePoint configuration
    const siteId = await this.getConfig('LegacyImport.SharePointSiteId');
    const listId = await this.getConfig('LegacyImport.SharePointListId');
    const lastSyncDate = await this.getConfig('LegacyImport.LastSyncDate');

    if (!siteId || !listId) {
      throw new Error('SharePoint site or list not configured');
    }

    // Create batch record
    const batchResult = await pool.request()
      .input('triggerType', triggerType)
      .input('triggerUserId', triggerUserId)
      .query(`
        INSERT INTO LegacyImportBatch (TriggerType, TriggerUserID, Status, TotalItems)
        VALUES (@triggerType, @triggerUserId, 'Running', 0);
        SELECT SCOPE_IDENTITY() AS BatchID;
      `);
    const batchId = batchResult.recordset[0].BatchID;

    const result: BatchImportResult = {
      batchId,
      status: 'Completed',
      totalItems: 0,
      importedItems: 0,
      skippedItems: 0,
      failedItems: 0,
      userNotFoundItems: 0,
      duplicateItems: 0,
      errors: [],
      itemResults: [],
    };

    try {
      // Fetch items from SharePoint
      const modifiedSince = lastSyncDate ? new Date(lastSyncDate) : undefined;
      const items = await sharePointService.fetchTimesheetItems({
        siteId,
        listId,
        modifiedSince,
      });

      result.totalItems = items.length;
      logger.info(`Starting import of ${items.length} items from SharePoint`);

      // Update batch total
      await pool.request()
        .input('batchId', batchId)
        .input('total', items.length)
        .query('UPDATE LegacyImportBatch SET TotalItems = @total WHERE BatchID = @batchId');

      // Process each item
      for (const item of items) {
        const normalized = this.normalizeItem(item);

        if (!normalized) {
          result.skippedItems++;
          result.itemResults.push({
            sharePointItemId: item.id,
            status: 'Skipped',
            errorMessage: 'Could not normalize item (missing required fields)',
          });
          continue;
        }

        const itemResult = await this.importEntry(normalized, listId, siteId);
        result.itemResults.push(itemResult);

        // Track result in database
        await this.recordImportResult(
          normalized.sharePointItemId,
          listId,
          siteId,
          itemResult,
          normalized.originalData
        );

        switch (itemResult.status) {
          case 'Imported':
            result.importedItems++;
            break;
          case 'Skipped':
            result.skippedItems++;
            break;
          case 'Failed':
            result.failedItems++;
            if (itemResult.errorMessage) {
              result.errors.push(`${item.id}: ${itemResult.errorMessage}`);
            }
            break;
          case 'UserNotFound':
            result.userNotFoundItems++;
            if (itemResult.errorMessage) {
              result.errors.push(`${item.id}: ${itemResult.errorMessage}`);
            }
            break;
          case 'Duplicate':
            result.duplicateItems++;
            break;
        }
      }

      // Update last sync date
      await this.setConfig('LegacyImport.LastSyncDate', new Date().toISOString());

      // Update batch record
      await pool.request()
        .input('batchId', batchId)
        .input('imported', result.importedItems)
        .input('skipped', result.skippedItems + result.duplicateItems)
        .input('failed', result.failedItems + result.userNotFoundItems)
        .query(`
          UPDATE LegacyImportBatch
          SET Status = 'Completed',
              EndDate = GETUTCDATE(),
              ImportedItems = @imported,
              SkippedItems = @skipped,
              FailedItems = @failed
          WHERE BatchID = @batchId
        `);

      logger.info(`Import completed: ${result.importedItems} imported, ${result.skippedItems} skipped, ${result.failedItems} failed`);
    } catch (error: any) {
      result.status = 'Failed';
      result.errors.push(error.message);

      // Update batch record with failure
      await pool.request()
        .input('batchId', batchId)
        .input('error', error.message)
        .query(`
          UPDATE LegacyImportBatch
          SET Status = 'Failed',
              EndDate = GETUTCDATE(),
              ErrorMessage = @error
          WHERE BatchID = @batchId
        `);

      logger.error('Import batch failed:', error);
    }

    return result;
  }

  /**
   * Check if import should run (for auto-sync on login)
   * Returns true if:
   * - Legacy import is enabled
   * - Auto-sync is enabled
   * - No import is currently running
   * - Last sync was more than 1 hour ago (or never)
   */
  async shouldAutoSync(): Promise<boolean> {
    if (!(await this.isEnabled())) return false;
    if (!(await this.isAutoSyncEnabled())) return false;

    const pool = getPool();

    // Check if an import is currently running
    const runningBatch = await pool.request().query(`
      SELECT BatchID FROM LegacyImportBatch WHERE Status = 'Running'
    `);
    if (runningBatch.recordset.length > 0) {
      return false;
    }

    // Check last sync time
    const lastSyncDate = await this.getConfig('LegacyImport.LastSyncDate');
    if (!lastSyncDate) {
      return true; // Never synced
    }

    const lastSync = new Date(lastSyncDate);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastSync < oneHourAgo;
  }

  /**
   * Get import history (for admin panel)
   */
  async getImportHistory(limit: number = 20): Promise<Array<{
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
  }>> {
    const pool = getPool();
    const result = await pool.request()
      .input('limit', limit)
      .query(`
        SELECT TOP (@limit)
          b.BatchID,
          b.TriggerType,
          u.Name AS TriggerUserName,
          b.StartDate,
          b.EndDate,
          b.Status,
          b.TotalItems,
          b.ImportedItems,
          b.SkippedItems,
          b.FailedItems
        FROM LegacyImportBatch b
        LEFT JOIN Users u ON b.TriggerUserID = u.UserID
        ORDER BY b.StartDate DESC
      `);

    return result.recordset.map(row => ({
      batchId: row.BatchID,
      triggerType: row.TriggerType,
      triggerUserName: row.TriggerUserName,
      startDate: row.StartDate?.toISOString() || '',
      endDate: row.EndDate?.toISOString() || null,
      status: row.Status,
      totalItems: row.TotalItems,
      importedItems: row.ImportedItems,
      skippedItems: row.SkippedItems,
      failedItems: row.FailedItems,
    }));
  }

  /**
   * Get failed imports for retry or review
   */
  async getFailedImports(): Promise<Array<{
    importId: number;
    sharePointItemId: string;
    status: string;
    errorMessage: string | null;
    sourceData: any;
  }>> {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT TOP 100
        ImportID,
        SharePointListItemID,
        ImportStatus,
        ErrorMessage,
        SourceData
      FROM LegacyImportTracking
      WHERE ImportStatus IN ('Failed', 'UserNotFound')
      ORDER BY ModifiedDate DESC
    `);

    return result.recordset.map(row => ({
      importId: row.ImportID,
      sharePointItemId: row.SharePointListItemID,
      status: row.ImportStatus,
      errorMessage: row.ErrorMessage,
      sourceData: row.SourceData ? JSON.parse(row.SourceData) : null,
    }));
  }

  /**
   * Update configuration (for admin panel)
   */
  async updateConfig(config: {
    enabled?: boolean;
    siteId?: string;
    listId?: string;
    autoSyncOnLogin?: boolean;
  }): Promise<void> {
    if (config.enabled !== undefined) {
      await this.setConfig('LegacyImport.Enabled', config.enabled.toString());
    }
    if (config.siteId !== undefined) {
      await this.setConfig('LegacyImport.SharePointSiteId', config.siteId);
    }
    if (config.listId !== undefined) {
      await this.setConfig('LegacyImport.SharePointListId', config.listId);
    }
    if (config.autoSyncOnLogin !== undefined) {
      await this.setConfig('LegacyImport.AutoSyncOnLogin', config.autoSyncOnLogin.toString());
    }
  }
}

// Export singleton instance
export const legacyImportService = new LegacyImportService();
