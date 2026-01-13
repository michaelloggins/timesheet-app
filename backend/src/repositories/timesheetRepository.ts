import { getPool } from '../config/database';
import { Timesheet } from '../models/types';

export const findTimesheetsByUserId = async (userId: number): Promise<Timesheet[]> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('userId', userId)
    .query(`
      SELECT * FROM Timesheets
      WHERE UserID = @userId
      ORDER BY PeriodStartDate DESC
    `);

  return result.recordset;
};

export const findTimesheetById = async (timesheetId: number): Promise<Timesheet | null> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT * FROM Timesheets
      WHERE TimesheetID = @timesheetId
    `);

  return result.recordset[0] || null;
};

export const createTimesheet = async (timesheet: Partial<Timesheet>): Promise<number> => {
  const pool = getPool();
  const result = await pool
    .request()
    .input('userId', timesheet.UserID)
    .input('periodStart', timesheet.PeriodStartDate)
    .input('periodEnd', timesheet.PeriodEndDate)
    .query(`
      INSERT INTO Timesheets (UserID, PeriodStartDate, PeriodEndDate, Status, IsLocked)
      VALUES (@userId, @periodStart, @periodEnd, 'Draft', 0);
      SELECT SCOPE_IDENTITY() AS TimesheetID;
    `);

  return result.recordset[0].TimesheetID;
};

export const updateTimesheet = async (
  timesheetId: number,
  updates: Partial<Timesheet>
): Promise<void> => {
  const pool = getPool();
  const request = pool.request().input('timesheetId', timesheetId);

  // Build dynamic SET clause based on provided fields
  const setClauses: string[] = ['ModifiedDate = GETUTCDATE()'];

  if (updates.Status !== undefined) {
    request.input('status', updates.Status);
    setClauses.push('Status = @status');
  }
  if (updates.SubmittedDate !== undefined) {
    request.input('submittedDate', updates.SubmittedDate);
    setClauses.push('SubmittedDate = @submittedDate');
  }
  if (updates.ApprovedDate !== undefined) {
    request.input('approvedDate', updates.ApprovedDate);
    setClauses.push('ApprovedDate = @approvedDate');
  }
  if (updates.ApprovedByUserID !== undefined) {
    request.input('approvedByUserId', updates.ApprovedByUserID);
    setClauses.push('ApprovedByUserID = @approvedByUserId');
  }
  if (updates.ReturnReason !== undefined) {
    request.input('returnReason', updates.ReturnReason);
    setClauses.push('ReturnReason = @returnReason');
  }
  if (updates.IsLocked !== undefined) {
    request.input('isLocked', updates.IsLocked);
    setClauses.push('IsLocked = @isLocked');
  }

  await request.query(`
    UPDATE Timesheets
    SET ${setClauses.join(', ')}
    WHERE TimesheetID = @timesheetId
  `);
};

export const deleteTimesheet = async (timesheetId: number): Promise<void> => {
  const pool = getPool();

  // Delete related records first (TimesheetHistory)
  await pool
    .request()
    .input('timesheetId', timesheetId)
    .query(`DELETE FROM TimesheetHistory WHERE TimesheetID = @timesheetId`);

  // Now delete the timesheet (TimeEntries will cascade delete)
  await pool
    .request()
    .input('timesheetId', timesheetId)
    .query(`
      DELETE FROM Timesheets
      WHERE TimesheetID = @timesheetId AND Status = 'Draft'
    `);
};
