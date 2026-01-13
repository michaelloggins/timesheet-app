/**
 * Import Controller
 * Handles importing historical timesheet data
 */

import { Request, Response } from 'express';
import * as importService from '../services/importService';
import { logger } from '../utils/logger';

/**
 * Import timesheets from Excel file
 * POST /api/admin/import/timesheets
 */
export const importTimesheets = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
      return;
    }

    logger.info(`Processing timesheet import: ${req.file.originalname}`);

    // Parse Excel file
    const rows = await importService.parseExcelFile(req.file.buffer);

    if (rows.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No data found in file'
      });
      return;
    }

    // Import data
    const result = await importService.importSharePointTimesheets(rows);

    // Return result
    res.status(result.success ? 200 : 207).json({
      status: result.success ? 'success' : 'partial',
      message: result.success
        ? 'Import completed successfully'
        : 'Import completed with errors',
      data: result
    });

  } catch (error) {
    logger.error('Error importing timesheets:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Import failed'
    });
  }
};

/**
 * Preview import data without saving
 * POST /api/admin/import/preview
 */
export const previewImport = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
      return;
    }

    logger.info(`Previewing import file: ${req.file.originalname}`);

    // Parse Excel file
    const rows = await importService.parseExcelFile(req.file.buffer);

    if (rows.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No data found in file'
      });
      return;
    }

    // Return first 10 rows as preview
    const preview = rows.slice(0, 10);

    // Detect columns
    const columns = new Set<string>();
    rows.forEach(row => {
      Object.keys(row).forEach(key => columns.add(key));
    });

    // Count unique employees and weeks
    const employees = new Set<string>();
    const weeks = new Set<string>();
    rows.forEach(row => {
      if (row.Title) employees.add(row.Title);
      if (row['Work Date']) {
        const date = new Date(row['Work Date']);
        if (!isNaN(date.getTime())) {
          const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate()) / 7)}`;
          weeks.add(weekKey);
        }
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalRows: rows.length,
        columns: Array.from(columns),
        preview,
        stats: {
          uniqueEmployees: employees.size,
          approximateWeeks: weeks.size,
          dataFormat: 'Daily entries (one row per day)'
        }
      }
    });

  } catch (error) {
    logger.error('Error previewing import:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Preview failed'
    });
  }
};
