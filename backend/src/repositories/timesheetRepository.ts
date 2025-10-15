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
  _updates: Partial<Timesheet>
): Promise<void> => {
  // TODO: Implement dynamic update based on provided fields
  const pool = getPool();
  await pool
    .request()
    .input('timesheetId', timesheetId)
    .query(`
      UPDATE Timesheets
      SET ModifiedDate = GETUTCDATE()
      WHERE TimesheetID = @timesheetId
    `);
};

export const deleteTimesheet = async (timesheetId: number): Promise<void> => {
  const pool = getPool();
  await pool
    .request()
    .input('timesheetId', timesheetId)
    .query(`
      DELETE FROM Timesheets
      WHERE TimesheetID = @timesheetId AND Status = 'Draft'
    `);
};
