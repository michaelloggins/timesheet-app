/**
 * Import Service
 * Handles importing historical timesheet data from SharePoint Excel exports
 */

import ExcelJS from 'exceljs';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export interface SharePointDailyRow {
  // SharePoint list columns - one row per day
  Department?: string;
  Title?: string;          // Employee name
  'Work Date'?: string | Date;
  ProjectName?: string;
  'Hours Worked'?: number;
  Submitted?: string | boolean;
  Status?: string;
  ApprovedBy?: string;
  Note?: string;
  [key: string]: any; // Allow for dynamic columns
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: Array<{ row: number; error: string }>;
  warnings: Array<{ row: number; warning: string }>;
}

/**
 * Parse Excel file from buffer
 */
export const parseExcelFile = async (buffer: Buffer): Promise<SharePointDailyRow[]> => {
  try {
    const workbook = new ExcelJS.Workbook();
    // Convert Node Buffer to ArrayBuffer for ExcelJS compatibility
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const data: SharePointDailyRow[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row is headers
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = String(cell.value || '');
        });
      } else {
        // Data rows
        const rowData: SharePointDailyRow = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            // Handle date cells
            if (cell.value instanceof Date) {
              rowData[header] = cell.value;
            } else {
              rowData[header] = cell.value as any;
            }
          }
        });
        // Only add row if it has data
        if (Object.keys(rowData).length > 0) {
          data.push(rowData);
        }
      }
    });

    logger.info(`Parsed Excel file: ${data.length} rows found`);
    return data;
  } catch (error) {
    logger.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file');
  }
};

/**
 * Parse date string to Date object
 */
const parseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;

  try {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Parse number value
 */
const parseNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Parse boolean value from SharePoint
 */
const parseBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  const str = String(value).toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
};

/**
 * Get the start of the week (Sunday) for a given date
 */
const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = -day; // Sunday is day 0
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get the end of the week (Saturday) for a given date
 */
const getWeekEnd = (weekStart: Date): Date => {
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Import SharePoint timesheet data into database
 * Each row in the CSV is a single day entry
 */
export const importSharePointTimesheets = async (
  rows: SharePointDailyRow[]
): Promise<ImportResult> => {
  const pool = getPool();
  const result: ImportResult = {
    success: true,
    totalRows: rows.length,
    importedRows: 0,
    skippedRows: 0,
    errors: [],
    warnings: []
  };

  logger.info(`Starting import of ${rows.length} daily timesheet rows`);

  // Group rows by employee and week for efficient processing
  type WeekKey = string; // Format: "employeeName|YYYY-MM-DD"
  const weeklyGroups = new Map<WeekKey, SharePointDailyRow[]>();

  // First pass: Group rows by employee and week
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because Excel is 1-indexed and has header row

    try {
      // Skip rows with missing employee name
      if (!row.Title || !row.Title.trim()) {
        result.warnings.push({ row: rowNumber, warning: 'Skipping row with no employee name' });
        result.skippedRows++;
        continue;
      }

      // Parse work date
      const workDate = parseDate(row['Work Date']);
      if (!workDate) {
        result.errors.push({ row: rowNumber, error: 'Invalid work date' });
        result.skippedRows++;
        continue;
      }

      // Get week start date for grouping
      const weekStart = getWeekStart(workDate);
      const weekKey = `${row.Title.trim()}|${weekStart.toISOString().split('T')[0]}`;

      if (!weeklyGroups.has(weekKey)) {
        weeklyGroups.set(weekKey, []);
      }
      weeklyGroups.get(weekKey)!.push(row);

    } catch (error) {
      logger.error(`Error processing row ${rowNumber}:`, error);
      result.errors.push({
        row: rowNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      result.skippedRows++;
    }
  }

  logger.info(`Grouped ${rows.length} rows into ${weeklyGroups.size} weekly timesheets`);

  // Second pass: Process each weekly timesheet
  for (const [weekKey, dailyRows] of weeklyGroups) {
    const [employeeName, weekStartStr] = weekKey.split('|');
    const weekStart = new Date(weekStartStr);
    const weekEnd = getWeekEnd(weekStart);

    try {
      // Find user by display name
      const userQuery = 'SELECT userId FROM Users WHERE displayName = @name';
      const userResult = await pool.request()
        .input('name', employeeName)
        .query(userQuery);

      if (userResult.recordset.length === 0) {
        result.errors.push({
          row: 0,
          error: `User not found: ${employeeName} (${dailyRows.length} rows skipped)`
        });
        result.skippedRows += dailyRows.length;
        continue;
      }

      const userId = userResult.recordset[0].userId;

      // Find or create timesheet for this week
      let timesheetId: number;
      const timesheetQuery = `
        SELECT timesheetId
        FROM Timesheets
        WHERE userId = @userId
        AND periodStartDate = @startDate
      `;

      const timesheetResult = await pool.request()
        .input('userId', userId)
        .input('startDate', weekStart)
        .query(timesheetQuery);

      if (timesheetResult.recordset.length > 0) {
        timesheetId = timesheetResult.recordset[0].timesheetId;
        logger.info(`Found existing timesheet ${timesheetId} for ${employeeName} week of ${weekStartStr}`);
      } else {
        // Determine timesheet status based on first row
        let status = 'Draft';
        if (dailyRows.length > 0) {
          const firstRow = dailyRows[0];
          if (firstRow.Status === 'Approved' || parseBoolean(firstRow.Submitted)) {
            status = firstRow.Status === 'Approved' ? 'Approved' : 'Submitted';
          }
        }

        // Create new timesheet
        const insertTimesheetQuery = `
          INSERT INTO Timesheets (userId, periodStartDate, periodEndDate, status, totalHours)
          VALUES (@userId, @startDate, @endDate, @status, 0);
          SELECT SCOPE_IDENTITY() AS timesheetId;
        `;

        const insertResult = await pool.request()
          .input('userId', userId)
          .input('startDate', weekStart)
          .input('endDate', weekEnd)
          .input('status', status)
          .query(insertTimesheetQuery);

        timesheetId = insertResult.recordset[0].timesheetId;
        logger.info(`Created new timesheet ${timesheetId} for ${employeeName} week of ${weekStartStr}`);
      }

      // Process each daily row for this week
      let importedCount = 0;
      for (const dayRow of dailyRows) {
        const workDate = parseDate(dayRow['Work Date']);
        if (!workDate) continue;

        const hours = parseNumber(dayRow['Hours Worked']);

        // Skip entries with 0 hours (holidays/off days) unless they have a note
        if (hours === 0 && !dayRow.Note) {
          continue;
        }

        // Find project if specified
        let projectId: number | null = null;
        if (dayRow.ProjectName && dayRow.ProjectName.trim()) {
          const projectQuery = 'SELECT projectId FROM Projects WHERE projectName LIKE @projectName';
          const projectResult = await pool.request()
            .input('projectName', `%${dayRow.ProjectName.trim()}%`)
            .query(projectQuery);

          if (projectResult.recordset.length > 0) {
            projectId = projectResult.recordset[0].projectId;
          } else {
            result.warnings.push({
              row: 0,
              warning: `Project not found: ${dayRow.ProjectName} for ${employeeName} on ${workDate.toISOString().split('T')[0]}`
            });
            // Continue anyway with null project
          }
        }

        // Insert or update time entry
        const checkEntryQuery = `
          SELECT entryId FROM TimeEntries
          WHERE timesheetId = @timesheetId
          AND entryDate = @entryDate
          AND (projectId = @projectId OR (projectId IS NULL AND @projectId IS NULL))
        `;

        const entryCheck = await pool.request()
          .input('timesheetId', timesheetId)
          .input('entryDate', workDate)
          .input('projectId', projectId)
          .query(checkEntryQuery);

        if (entryCheck.recordset.length > 0) {
          // Update existing entry
          const updateEntryQuery = `
            UPDATE TimeEntries
            SET hoursWorked = @hours,
                workLocation = @location,
                notes = @notes
            WHERE entryId = @entryId
          `;

          await pool.request()
            .input('entryId', entryCheck.recordset[0].entryId)
            .input('hours', hours)
            .input('location', 'Office') // Default location
            .input('notes', dayRow.Note || '')
            .query(updateEntryQuery);

        } else {
          // Insert new entry
          const insertEntryQuery = `
            INSERT INTO TimeEntries (
              timesheetId, projectId, entryDate, hoursWorked, workLocation, notes
            )
            VALUES (@timesheetId, @projectId, @entryDate, @hours, @location, @notes)
          `;

          await pool.request()
            .input('timesheetId', timesheetId)
            .input('projectId', projectId)
            .input('entryDate', workDate)
            .input('hours', hours)
            .input('location', 'Office')
            .input('notes', dayRow.Note || '')
            .query(insertEntryQuery);
        }

        importedCount++;
      }

      if (importedCount > 0) {
        // Update timesheet total hours
        const updateTotalQuery = `
          UPDATE Timesheets
          SET totalHours = (
            SELECT ISNULL(SUM(hoursWorked), 0)
            FROM TimeEntries
            WHERE timesheetId = @timesheetId
          )
          WHERE timesheetId = @timesheetId
        `;

        await pool.request()
          .input('timesheetId', timesheetId)
          .query(updateTotalQuery);

        result.importedRows += importedCount;
        logger.info(`Imported ${importedCount} entries for timesheet ${timesheetId}`);
      }

    } catch (error) {
      logger.error(`Error importing week ${weekKey}:`, error);
      result.errors.push({
        row: 0,
        error: `Failed to import week ${weekStartStr} for ${employeeName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      result.skippedRows += dailyRows.length;
    }
  }

  result.success = result.errors.length === 0 || result.importedRows > 0;
  logger.info(`Import complete: ${result.importedRows} entries imported, ${result.skippedRows} rows skipped`);

  return result;
};
