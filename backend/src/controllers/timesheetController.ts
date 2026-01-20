import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import { logAuditEntry } from '../utils/auditLogger';
import { workWeekService } from '../services/workWeekService';

/**
 * Get current user's timesheets
 * GET /api/timesheets/my
 */
export const getUserTimesheets = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const userId = req.user!.userId;

  const result = await pool.request()
    .input('userId', userId)
    .query(`
      SELECT
        t.TimesheetID, t.UserID, t.PeriodStartDate, t.PeriodEndDate,
        t.Status, t.SubmittedDate, t.ApprovedDate, t.ApprovedByUserID,
        t.ReturnReason, t.IsLocked, t.CreatedDate, t.ModifiedDate
      FROM Timesheets t
      WHERE t.UserID = @userId
      ORDER BY t.PeriodStartDate DESC
    `);

  // Get entries for each timesheet
  const timesheets = await Promise.all(result.recordset.map(async (ts) => {
    const entriesResult = await pool.request()
      .input('timesheetId', ts.TimesheetID)
      .query(`
        SELECT
          TimeEntryID, TimesheetID, ProjectID, WorkDate,
          HoursWorked, WorkLocation, Notes
        FROM TimeEntries
        WHERE TimesheetID = @timesheetId
        ORDER BY WorkDate, ProjectID
      `);

    return {
      timesheetId: ts.TimesheetID,
      userId: ts.UserID,
      periodStartDate: ts.PeriodStartDate,
      periodEndDate: ts.PeriodEndDate,
      status: ts.Status,
      submittedDate: ts.SubmittedDate,
      approvedDate: ts.ApprovedDate,
      approvedByUserId: ts.ApprovedByUserID,
      returnReason: ts.ReturnReason,
      isLocked: ts.IsLocked,
      entries: entriesResult.recordset.map(e => ({
        timeEntryId: e.TimeEntryID,
        timesheetId: e.TimesheetID,
        projectId: e.ProjectID,
        workDate: e.WorkDate,
        hoursWorked: parseFloat(e.HoursWorked),
        workLocation: e.WorkLocation,
        notes: e.Notes,
      })),
    };
  }));

  res.status(200).json({ status: 'success', data: timesheets });
});

/**
 * Get timesheet for a specific week (without creating)
 * GET /api/timesheets/week/:startDate
 */
export const getTimesheetForWeek = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const userId = req.user!.userId;
  const { startDate: weekStartDate } = req.params;

  if (!weekStartDate) {
    res.status(400).json({ status: 'error', message: 'startDate parameter is required' });
    return;
  }

  // Parse date
  const startDate = new Date(weekStartDate);

  // Check if timesheet exists
  const result = await pool.request()
    .input('userId', userId)
    .input('startDate', startDate)
    .query(`
      SELECT TimesheetID FROM Timesheets
      WHERE UserID = @userId AND PeriodStartDate = @startDate
    `);

  if (result.recordset.length === 0) {
    // No timesheet exists - return null
    res.status(200).json({ status: 'success', data: null });
    return;
  }

  const timesheetId = result.recordset[0].TimesheetID;

  // Fetch the complete timesheet
  const tsResult = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        TimesheetID, UserID, PeriodStartDate, PeriodEndDate,
        Status, SubmittedDate, ApprovedDate, ApprovedByUserID,
        ReturnReason, IsLocked
      FROM Timesheets
      WHERE TimesheetID = @timesheetId
    `);

  const ts = tsResult.recordset[0];

  // Get entries
  const entriesResult = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        TimeEntryID, TimesheetID, ProjectID, WorkDate,
        HoursWorked, WorkLocation, Notes
      FROM TimeEntries
      WHERE TimesheetID = @timesheetId
      ORDER BY WorkDate, ProjectID
    `);

  const timesheet = {
    timesheetId: ts.TimesheetID,
    userId: ts.UserID,
    periodStartDate: ts.PeriodStartDate,
    periodEndDate: ts.PeriodEndDate,
    status: ts.Status,
    submittedDate: ts.SubmittedDate,
    approvedDate: ts.ApprovedDate,
    approvedByUserId: ts.ApprovedByUserID,
    returnReason: ts.ReturnReason,
    isLocked: ts.IsLocked,
    entries: entriesResult.recordset.map(e => ({
      timeEntryId: e.TimeEntryID,
      timesheetId: e.TimesheetID,
      projectId: e.ProjectID,
      workDate: e.WorkDate,
      hoursWorked: parseFloat(e.HoursWorked),
      workLocation: e.WorkLocation,
      notes: e.Notes,
    })),
  };

  res.status(200).json({ status: 'success', data: timesheet });
});

/**
 * Get or create timesheet for a specific week
 * POST /api/timesheets/week
 *
 * When creating a new timesheet, auto-populates default entries based on
 * the user's work week pattern (Monday-Friday or Tuesday-Saturday).
 */
export const getOrCreateTimesheetForWeek = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const userId = req.user!.userId;
  const entraId = req.user!.entraId;
  const { weekStartDate, skipDefaultEntries } = req.body;

  if (!weekStartDate) {
    res.status(400).json({ status: 'error', message: 'weekStartDate is required' });
    return;
  }

  // Parse and validate date
  const startDate = new Date(weekStartDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  // Check if timesheet exists
  const result = await pool.request()
    .input('userId', userId)
    .input('startDate', startDate)
    .query(`
      SELECT TimesheetID FROM Timesheets
      WHERE UserID = @userId AND PeriodStartDate = @startDate
    `);

  let timesheetId: number;

  if (result.recordset.length > 0) {
    timesheetId = result.recordset[0].TimesheetID;
  } else {
    // Create new timesheet
    const insertResult = await pool.request()
      .input('userId', userId)
      .input('startDate', startDate)
      .input('endDate', endDate)
      .query(`
        INSERT INTO Timesheets (UserID, PeriodStartDate, PeriodEndDate, Status)
        VALUES (@userId, @startDate, @endDate, 'Draft');
        SELECT SCOPE_IDENTITY() AS TimesheetID;
      `);
    timesheetId = insertResult.recordset[0].TimesheetID;
    logger.info(`Created new timesheet ${timesheetId} for user ${userId}`);

    // Auto-populate default entries based on user's work week pattern
    // Skip if explicitly requested (e.g., for lazy create mode)
    if (!skipDefaultEntries) {
      try {
        const defaultEntries = await workWeekService.generateDefaultEntries(
          entraId,
          weekStartDate
        );

        if (defaultEntries.length > 0) {
          logger.info(
            `Auto-populating ${defaultEntries.length} default entries for timesheet ${timesheetId}`
          );

          for (const entry of defaultEntries) {
            await pool.request()
              .input('timesheetId', timesheetId)
              .input('userId', userId)
              .input('projectId', entry.projectId)
              .input('workDate', new Date(entry.workDate))
              .input('hours', entry.hoursWorked)
              .input('location', entry.workLocation)
              .query(`
                INSERT INTO TimeEntries (TimesheetID, UserID, ProjectID, WorkDate, HoursWorked, WorkLocation)
                VALUES (@timesheetId, @userId, @projectId, @workDate, @hours, @location)
              `);
          }
        }
      } catch (error) {
        // Log error but don't fail the timesheet creation
        logger.error(`Error auto-populating default entries for timesheet ${timesheetId}:`, error);
      }
    }
  }

  // Fetch the complete timesheet
  const tsResult = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        TimesheetID, UserID, PeriodStartDate, PeriodEndDate,
        Status, SubmittedDate, ApprovedDate, ApprovedByUserID,
        ReturnReason, IsLocked
      FROM Timesheets
      WHERE TimesheetID = @timesheetId
    `);

  const ts = tsResult.recordset[0];

  // Get entries
  const entriesResult = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        TimeEntryID, TimesheetID, ProjectID, WorkDate,
        HoursWorked, WorkLocation, Notes
      FROM TimeEntries
      WHERE TimesheetID = @timesheetId
      ORDER BY WorkDate, ProjectID
    `);

  const timesheet = {
    timesheetId: ts.TimesheetID,
    userId: ts.UserID,
    periodStartDate: ts.PeriodStartDate,
    periodEndDate: ts.PeriodEndDate,
    status: ts.Status,
    submittedDate: ts.SubmittedDate,
    approvedDate: ts.ApprovedDate,
    approvedByUserId: ts.ApprovedByUserID,
    returnReason: ts.ReturnReason,
    isLocked: ts.IsLocked,
    entries: entriesResult.recordset.map(e => ({
      timeEntryId: e.TimeEntryID,
      timesheetId: e.TimesheetID,
      projectId: e.ProjectID,
      workDate: e.WorkDate,
      hoursWorked: parseFloat(e.HoursWorked),
      workLocation: e.WorkLocation,
      notes: e.Notes,
    })),
  };

  res.status(200).json({ status: 'success', data: timesheet });
});

/**
 * Get timesheet by ID
 * GET /api/timesheets/:id
 */
export const getTimesheetById = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const userId = req.user!.userId;

  const result = await pool.request()
    .input('timesheetId', timesheetId)
    .input('userId', userId)
    .query(`
      SELECT
        TimesheetID, UserID, PeriodStartDate, PeriodEndDate,
        Status, SubmittedDate, ApprovedDate, ApprovedByUserID,
        ReturnReason, IsLocked
      FROM Timesheets
      WHERE TimesheetID = @timesheetId AND UserID = @userId
    `);

  if (result.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Timesheet not found' });
    return;
  }

  const ts = result.recordset[0];

  // Get entries
  const entriesResult = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        TimeEntryID, TimesheetID, ProjectID, WorkDate,
        HoursWorked, WorkLocation, Notes
      FROM TimeEntries
      WHERE TimesheetID = @timesheetId
      ORDER BY WorkDate, ProjectID
    `);

  const timesheet = {
    timesheetId: ts.TimesheetID,
    userId: ts.UserID,
    periodStartDate: ts.PeriodStartDate,
    periodEndDate: ts.PeriodEndDate,
    status: ts.Status,
    submittedDate: ts.SubmittedDate,
    approvedDate: ts.ApprovedDate,
    approvedByUserId: ts.ApprovedByUserID,
    returnReason: ts.ReturnReason,
    isLocked: ts.IsLocked,
    entries: entriesResult.recordset.map(e => ({
      timeEntryId: e.TimeEntryID,
      timesheetId: e.TimesheetID,
      projectId: e.ProjectID,
      workDate: e.WorkDate,
      hoursWorked: parseFloat(e.HoursWorked),
      workLocation: e.WorkLocation,
      notes: e.Notes,
    })),
  };

  res.status(200).json({ status: 'success', data: timesheet });
});

/**
 * Create new timesheet
 * POST /api/timesheets
 */
export const createTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const userId = req.user!.userId;
  const { periodStartDate, periodEndDate } = req.body;

  const result = await pool.request()
    .input('userId', userId)
    .input('startDate', new Date(periodStartDate))
    .input('endDate', new Date(periodEndDate))
    .query(`
      INSERT INTO Timesheets (UserID, PeriodStartDate, PeriodEndDate, Status)
      VALUES (@userId, @startDate, @endDate, 'Draft');
      SELECT SCOPE_IDENTITY() AS TimesheetID;
    `);

  const timesheetId = result.recordset[0].TimesheetID;

  res.status(201).json({
    status: 'success',
    data: {
      timesheetId,
      userId,
      periodStartDate,
      periodEndDate,
      status: 'Draft',
      entries: [],
    },
  });
});

/**
 * Update timesheet (save entries)
 * PUT /api/timesheets/:id
 */
export const updateTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const userId = req.user!.userId;
  const { entries = [] } = req.body;

  // Ensure entries is an array
  if (!Array.isArray(entries)) {
    res.status(400).json({ status: 'error', message: 'entries must be an array' });
    return;
  }

  // Verify ownership and status
  const tsResult = await pool.request()
    .input('timesheetId', timesheetId)
    .input('userId', userId)
    .query(`
      SELECT TimesheetID, Status, IsLocked FROM Timesheets
      WHERE TimesheetID = @timesheetId AND UserID = @userId
    `);

  if (tsResult.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Timesheet not found' });
    return;
  }

  const ts = tsResult.recordset[0];
  if (ts.Status !== 'Draft' && ts.Status !== 'Returned') {
    res.status(400).json({ status: 'error', message: 'Cannot edit submitted or approved timesheet' });
    return;
  }

  if (ts.IsLocked) {
    res.status(400).json({ status: 'error', message: 'Timesheet is locked' });
    return;
  }

  // Use MERGE to upsert entries (handles the unique constraint properly)
  // First, delete all existing entries for this timesheet
  await pool.request()
    .input('timesheetId', timesheetId)
    .query('DELETE FROM TimeEntries WHERE TimesheetID = @timesheetId');

  // Insert new entries one at a time, using MERGE to handle duplicates
  for (const entry of entries) {
    if (entry.hoursWorked > 0) {
      await pool.request()
        .input('timesheetId', timesheetId)
        .input('userId', userId)
        .input('projectId', entry.projectId)
        .input('workDate', new Date(entry.workDate))
        .input('hours', entry.hoursWorked)
        .input('location', entry.workLocation || 'Office')
        .input('notes', entry.notes || null)
        .query(`
          MERGE TimeEntries AS target
          USING (SELECT @userId AS UserID, @workDate AS WorkDate, @projectId AS ProjectID) AS source
          ON target.UserID = source.UserID
             AND target.WorkDate = source.WorkDate
             AND target.ProjectID = source.ProjectID
          WHEN MATCHED THEN
            UPDATE SET
              TimesheetID = @timesheetId,
              HoursWorked = @hours,
              WorkLocation = @location,
              Notes = @notes,
              ModifiedDate = GETUTCDATE()
          WHEN NOT MATCHED THEN
            INSERT (TimesheetID, UserID, ProjectID, WorkDate, HoursWorked, WorkLocation, Notes)
            VALUES (@timesheetId, @userId, @projectId, @workDate, @hours, @location, @notes);
        `);
    }
  }

  // Return updated timesheet
  const entriesResult = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        TimeEntryID, TimesheetID, ProjectID, WorkDate,
        HoursWorked, WorkLocation, Notes
      FROM TimeEntries
      WHERE TimesheetID = @timesheetId
      ORDER BY WorkDate, ProjectID
    `);

  res.status(200).json({
    status: 'success',
    data: {
      timesheetId,
      entries: entriesResult.recordset.map(e => ({
        timeEntryId: e.TimeEntryID,
        timesheetId: e.TimesheetID,
        projectId: e.ProjectID,
        workDate: e.WorkDate,
        hoursWorked: parseFloat(e.HoursWorked),
        workLocation: e.WorkLocation,
        notes: e.Notes,
      })),
    },
  });
});

/**
 * Delete timesheet (draft only)
 * DELETE /api/timesheets/:id
 */
export const deleteTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const userId = req.user!.userId;

  // First verify the timesheet exists, belongs to user, and is in Draft status
  const checkResult = await pool.request()
    .input('timesheetId', timesheetId)
    .input('userId', userId)
    .query(`
      SELECT TimesheetID FROM Timesheets
      WHERE TimesheetID = @timesheetId AND UserID = @userId AND Status = 'Draft'
    `);

  if (checkResult.recordset.length === 0) {
    res.status(400).json({ status: 'error', message: 'Cannot delete timesheet (not found or not in draft status)' });
    return;
  }

  // Delete related records first (TimesheetHistory, then TimeEntries handled by cascade)
  await pool.request()
    .input('timesheetId', timesheetId)
    .query(`DELETE FROM TimesheetHistory WHERE TimesheetID = @timesheetId`);

  // Now delete the timesheet (TimeEntries will cascade delete)
  await pool.request()
    .input('timesheetId', timesheetId)
    .query(`DELETE FROM Timesheets WHERE TimesheetID = @timesheetId`);

  res.status(200).json({ status: 'success', message: 'Timesheet deleted' });
});

/**
 * Submit timesheet for approval
 * POST /api/timesheets/:id/submit
 */
export const submitTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const userId = req.user!.userId;

  // Verify ownership and status
  const tsResult = await pool.request()
    .input('timesheetId', timesheetId)
    .input('userId', userId)
    .query(`
      SELECT TimesheetID, Status FROM Timesheets
      WHERE TimesheetID = @timesheetId AND UserID = @userId
    `);

  if (tsResult.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Timesheet not found' });
    return;
  }

  const ts = tsResult.recordset[0];
  if (ts.Status !== 'Draft' && ts.Status !== 'Returned') {
    res.status(400).json({ status: 'error', message: 'Timesheet already submitted' });
    return;
  }

  // Check if there are entries
  const entriesCheck = await pool.request()
    .input('timesheetId', timesheetId)
    .query('SELECT COUNT(*) as count FROM TimeEntries WHERE TimesheetID = @timesheetId');

  if (entriesCheck.recordset[0].count === 0) {
    res.status(400).json({ status: 'error', message: 'Cannot submit empty timesheet' });
    return;
  }

  const previousStatus = ts.Status;

  // Update status
  await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      UPDATE Timesheets
      SET Status = 'Submitted', SubmittedDate = GETUTCDATE()
      WHERE TimesheetID = @timesheetId
    `);

  // Log audit entry
  await logAuditEntry({
    timesheetId,
    action: 'Submitted',
    actionByUserId: userId,
    previousStatus,
    newStatus: 'Submitted',
  });

  logger.info(`Timesheet ${timesheetId} submitted by user ${userId}`);

  // Return updated timesheet
  const result = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        TimesheetID, UserID, PeriodStartDate, PeriodEndDate,
        Status, SubmittedDate, ApprovedDate, ApprovedByUserID,
        ReturnReason, IsLocked
      FROM Timesheets
      WHERE TimesheetID = @timesheetId
    `);

  const updated = result.recordset[0];

  res.status(200).json({
    status: 'success',
    data: {
      timesheetId: updated.TimesheetID,
      userId: updated.UserID,
      periodStartDate: updated.PeriodStartDate,
      periodEndDate: updated.PeriodEndDate,
      status: updated.Status,
      submittedDate: updated.SubmittedDate,
    },
  });
});

/**
 * Withdraw submitted timesheet (return to draft)
 * POST /api/timesheets/:id/withdraw
 */
export const withdrawTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const userId = req.user!.userId;

  // Verify ownership and status
  const tsResult = await pool.request()
    .input('timesheetId', timesheetId)
    .input('userId', userId)
    .query(`
      SELECT TimesheetID, Status FROM Timesheets
      WHERE TimesheetID = @timesheetId AND UserID = @userId
    `);

  if (tsResult.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Timesheet not found' });
    return;
  }

  const ts = tsResult.recordset[0];

  // Can withdraw from Submitted or Returned status
  // Cannot withdraw from Draft (already editable) or Approved (need manager to unlock)
  if (ts.Status === 'Draft') {
    res.status(400).json({ status: 'error', message: 'Timesheet is already in draft status' });
    return;
  }
  if (ts.Status === 'Approved') {
    res.status(400).json({ status: 'error', message: 'Approved timesheets cannot be withdrawn. Ask your manager to unlock it.' });
    return;
  }

  const previousStatus = ts.Status;

  // Update status back to Draft and clear submission/return info
  await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      UPDATE Timesheets
      SET Status = 'Draft', SubmittedDate = NULL, ReturnReason = NULL, ModifiedDate = GETUTCDATE()
      WHERE TimesheetID = @timesheetId
    `);

  // Log audit entry
  await logAuditEntry({
    timesheetId,
    action: 'Withdrawn',
    actionByUserId: userId,
    previousStatus,
    newStatus: 'Draft',
  });

  logger.info(`Timesheet ${timesheetId} withdrawn by user ${userId}`);

  // Return updated timesheet
  const result = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        TimesheetID, UserID, PeriodStartDate, PeriodEndDate,
        Status, SubmittedDate, ApprovedDate, ApprovedByUserID,
        ReturnReason, IsLocked
      FROM Timesheets
      WHERE TimesheetID = @timesheetId
    `);

  const updated = result.recordset[0];

  res.status(200).json({
    status: 'success',
    data: {
      timesheetId: updated.TimesheetID,
      userId: updated.UserID,
      periodStartDate: updated.PeriodStartDate,
      periodEndDate: updated.PeriodEndDate,
      status: updated.Status,
      submittedDate: updated.SubmittedDate,
    },
  });
});

/**
 * Add time entry
 * POST /api/timesheets/:id/entries
 */
export const addTimeEntry = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const userId = req.user!.userId;
  const { projectId, workDate, hoursWorked, workLocation, notes } = req.body;

  const result = await pool.request()
    .input('timesheetId', timesheetId)
    .input('userId', userId)
    .input('projectId', projectId)
    .input('workDate', new Date(workDate))
    .input('hours', hoursWorked)
    .input('location', workLocation || 'Office')
    .input('notes', notes || null)
    .query(`
      INSERT INTO TimeEntries (TimesheetID, UserID, ProjectID, WorkDate, HoursWorked, WorkLocation, Notes)
      VALUES (@timesheetId, @userId, @projectId, @workDate, @hours, @location, @notes);
      SELECT SCOPE_IDENTITY() AS TimeEntryID;
    `);

  res.status(201).json({
    status: 'success',
    data: {
      timeEntryId: result.recordset[0].TimeEntryID,
      timesheetId,
      projectId,
      workDate,
      hoursWorked,
      workLocation: workLocation || 'Office',
      notes,
    },
  });
});

/**
 * Update time entry
 * PUT /api/timesheets/:id/entries/:entryId
 */
export const updateTimeEntry = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const entryId = parseInt(req.params.entryId);
  const { hoursWorked, workLocation, notes } = req.body;

  await pool.request()
    .input('entryId', entryId)
    .input('timesheetId', timesheetId)
    .input('hours', hoursWorked)
    .input('location', workLocation)
    .input('notes', notes || null)
    .query(`
      UPDATE TimeEntries
      SET HoursWorked = @hours, WorkLocation = @location, Notes = @notes
      WHERE TimeEntryID = @entryId AND TimesheetID = @timesheetId
    `);

  res.status(200).json({ status: 'success', message: 'Entry updated' });
});

/**
 * Delete time entry
 * DELETE /api/timesheets/:id/entries/:entryId
 */
export const deleteTimeEntry = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const entryId = parseInt(req.params.entryId);

  await pool.request()
    .input('entryId', entryId)
    .input('timesheetId', timesheetId)
    .query('DELETE FROM TimeEntries WHERE TimeEntryID = @entryId AND TimesheetID = @timesheetId');

  res.status(200).json({ status: 'success', message: 'Entry deleted' });
});

/**
 * Bulk add entries
 * POST /api/timesheets/:id/bulk-entries
 */
export const bulkAddEntries = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const timesheetId = parseInt(req.params.id);
  const userId = req.user!.userId;
  const { entries } = req.body;

  for (const entry of entries) {
    await pool.request()
      .input('timesheetId', timesheetId)
      .input('userId', userId)
      .input('projectId', entry.projectId)
      .input('workDate', new Date(entry.workDate))
      .input('hours', entry.hoursWorked)
      .input('location', entry.workLocation || 'Office')
      .input('notes', entry.notes || null)
      .query(`
        INSERT INTO TimeEntries (TimesheetID, UserID, ProjectID, WorkDate, HoursWorked, WorkLocation, Notes)
        VALUES (@timesheetId, @userId, @projectId, @workDate, @hours, @location, @notes)
      `);
  }

  res.status(201).json({ status: 'success', message: `${entries.length} entries added` });
});

/**
 * Get user's work week pattern info
 * GET /api/timesheets/work-week
 *
 * Returns the user's work week pattern based on Entra ID security group membership:
 * - MondayFriday: Default 8 hours Mon-Fri (SG-MVD-Timesheet-WorkWeekMF)
 * - TuesdaySaturday: Default 8 hours Tue-Sat (SG-MVD-Timesheet-WorkWeekTS)
 */
export const getWorkWeekInfo = asyncHandler(async (req: Request, res: Response) => {
  const entraId = req.user!.entraId;

  const workWeekInfo = await workWeekService.getWorkWeekInfo(entraId);

  res.status(200).json({
    status: 'success',
    data: {
      pattern: workWeekInfo.pattern,
      workDays: workWeekInfo.workDays,
      defaultHoursPerDay: workWeekInfo.defaultHoursPerDay,
      defaultProjectId: workWeekInfo.defaultProjectId,
      // Human-readable description
      description: workWeekInfo.pattern === 'MondayFriday'
        ? 'Monday through Friday (8 hours/day)'
        : 'Tuesday through Saturday (8 hours/day)',
    },
  });
});

/**
 * Generate default entries for a specific week
 * POST /api/timesheets/default-entries
 *
 * Body: { weekStartDate: 'YYYY-MM-DD' }
 *
 * Returns default time entries based on user's work week pattern.
 * Useful for previewing what entries would be auto-created.
 */
export const getDefaultEntries = asyncHandler(async (req: Request, res: Response) => {
  const entraId = req.user!.entraId;
  const { weekStartDate } = req.body;

  if (!weekStartDate) {
    res.status(400).json({ status: 'error', message: 'weekStartDate is required' });
    return;
  }

  const defaultEntries = await workWeekService.generateDefaultEntries(entraId, weekStartDate);

  res.status(200).json({
    status: 'success',
    data: defaultEntries,
  });
});
