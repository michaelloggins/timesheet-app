import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { getPool } from '../config/database';
import * as approvalService from '../services/approvalService';

interface ApprovalTimesheet {
  timesheetId: number;
  userId: number;
  employeeName: string;
  employeeEmail: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalHours: number;
  submittedDate: string | null;
  approvedDate: string | null;
  returnReason: string | null;
  daysWaiting: number;
}

/**
 * Get timesheets for approval - supports filtering by status
 * Query params: status (comma-separated: Submitted,Approved,Returned)
 */
export const getPendingApprovals = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const pool = await getPool();

  // Parse status filter (default to Submitted only for pending approvals)
  const statusParam = req.query.status as string || 'Submitted';
  const statuses = statusParam.split(',').map(s => s.trim());

  // Validate statuses
  const validStatuses = ['Submitted', 'Approved', 'Returned'];
  for (const status of statuses) {
    if (!validStatuses.includes(status)) {
      throw new AppError(400, `Invalid status: ${status}. Valid values: ${validStatuses.join(', ')}`);
    }
  }

  // Build dynamic WHERE clause for statuses
  const statusPlaceholders = statuses.map((_, i) => `@status${i}`).join(', ');

  // Get timesheets for employees in manager's department (excluding the manager themselves)
  let query = `
    SELECT
      t.TimesheetID as timesheetId,
      t.UserID as userId,
      u.Name as employeeName,
      u.Email as employeeEmail,
      t.PeriodStartDate as periodStart,
      t.PeriodEndDate as periodEnd,
      t.Status as status,
      t.SubmittedDate as submittedDate,
      t.ApprovedDate as approvedDate,
      t.ReturnReason as returnReason,
      COALESCE(SUM(te.HoursWorked), 0) as totalHours,
      CASE
        WHEN t.SubmittedDate IS NOT NULL
        THEN DATEDIFF(DAY, t.SubmittedDate, GETUTCDATE())
        ELSE 0
      END as daysWaiting
    FROM Timesheets t
    INNER JOIN Users u ON t.UserID = u.UserID
    LEFT JOIN TimeEntries te ON t.TimesheetID = te.TimesheetID
    WHERE u.DepartmentID = @departmentId
      AND t.UserID != @managerId
      AND t.Status IN (${statusPlaceholders})
    GROUP BY
      t.TimesheetID, t.UserID, u.Name, u.Email,
      t.PeriodStartDate, t.PeriodEndDate, t.Status,
      t.SubmittedDate, t.ApprovedDate, t.ReturnReason
    ORDER BY
      CASE t.Status
        WHEN 'Submitted' THEN 1
        WHEN 'Returned' THEN 2
        WHEN 'Approved' THEN 3
      END,
      t.SubmittedDate DESC
  `;

  const request = pool.request()
    .input('departmentId', user.departmentId)
    .input('managerId', user.userId);

  // Add status parameters
  statuses.forEach((status, i) => {
    request.input(`status${i}`, status);
  });

  const result = await request.query(query);

  res.status(200).json({
    status: 'success',
    data: result.recordset as ApprovalTimesheet[],
  });
});

/**
 * Get approval history for reporting
 */
export const getApprovalHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const pool = await getPool();

  // Get last 90 days of approved/returned timesheets
  const result = await pool.request()
    .input('departmentId', user.departmentId)
    .input('managerId', user.userId)
    .query(`
      SELECT
        t.TimesheetID as timesheetId,
        t.UserID as userId,
        u.Name as employeeName,
        u.Email as employeeEmail,
        t.PeriodStartDate as periodStart,
        t.PeriodEndDate as periodEnd,
        t.Status as status,
        t.SubmittedDate as submittedDate,
        t.ApprovedDate as approvedDate,
        t.ReturnReason as returnReason,
        COALESCE(SUM(te.HoursWorked), 0) as totalHours,
        approver.Name as approvedByName
      FROM Timesheets t
      INNER JOIN Users u ON t.UserID = u.UserID
      LEFT JOIN TimeEntries te ON t.TimesheetID = te.TimesheetID
      LEFT JOIN Users approver ON t.ApprovedByUserID = approver.UserID
      WHERE u.DepartmentID = @departmentId
        AND t.UserID != @managerId
        AND t.Status IN ('Approved', 'Returned')
        AND (t.ApprovedDate >= DATEADD(DAY, -90, GETUTCDATE())
             OR t.ModifiedDate >= DATEADD(DAY, -90, GETUTCDATE()))
      GROUP BY
        t.TimesheetID, t.UserID, u.Name, u.Email,
        t.PeriodStartDate, t.PeriodEndDate, t.Status,
        t.SubmittedDate, t.ApprovedDate, t.ReturnReason,
        approver.Name
      ORDER BY COALESCE(t.ApprovedDate, t.ModifiedDate) DESC
    `);

  res.status(200).json({
    status: 'success',
    data: result.recordset,
  });
});

/**
 * Get time entries for a specific timesheet (for detail view)
 */
export const getTimesheetEntries = asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const user = req.user!;
  const pool = await getPool();

  // Verify the manager has access to this timesheet (same department)
  const accessCheck = await pool.request()
    .input('timesheetId', timesheetId)
    .input('departmentId', user.departmentId)
    .query(`
      SELECT t.TimesheetID
      FROM Timesheets t
      INNER JOIN Users u ON t.UserID = u.UserID
      WHERE t.TimesheetID = @timesheetId
        AND u.DepartmentID = @departmentId
    `);

  if (accessCheck.recordset.length === 0) {
    throw new AppError(403, 'You do not have access to this timesheet');
  }

  // Get entries with project details
  const result = await pool.request()
    .input('timesheetId', timesheetId)
    .query(`
      SELECT
        te.TimeEntryID as timeEntryId,
        te.TimesheetID as timesheetId,
        te.ProjectID as projectId,
        p.ProjectNumber as projectNumber,
        p.ProjectName as projectName,
        p.ProjectType as projectType,
        te.WorkDate as workDate,
        te.HoursWorked as hoursWorked,
        te.WorkLocation as workLocation,
        te.Notes as notes
      FROM TimeEntries te
      INNER JOIN Projects p ON te.ProjectID = p.ProjectID
      WHERE te.TimesheetID = @timesheetId
      ORDER BY te.WorkDate, p.ProjectNumber
    `);

  res.status(200).json({
    status: 'success',
    data: result.recordset,
  });
});

/**
 * Approve a timesheet
 */
export const approveTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const user = req.user!;

  await approvalService.approveTimesheet(
    parseInt(timesheetId),
    user.userId,
    user.entraId
  );

  res.status(200).json({
    status: 'success',
    message: 'Timesheet approved successfully',
  });
});

/**
 * Return a timesheet to the employee
 */
export const returnTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const { reason } = req.body;
  const user = req.user!;

  if (!reason || reason.trim().length === 0) {
    throw new AppError(400, 'Return reason is required');
  }

  await approvalService.returnTimesheet(
    parseInt(timesheetId),
    user.userId,
    reason
  );

  res.status(200).json({
    status: 'success',
    message: 'Timesheet returned to employee',
  });
});

/**
 * Unlock an approved timesheet (admin/manager action)
 */
export const unlockTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const { reason } = req.body;
  const user = req.user!;

  if (!reason || reason.trim().length === 0) {
    throw new AppError(400, 'Unlock reason is required');
  }

  await approvalService.unlockTimesheet(
    parseInt(timesheetId),
    user.userId,
    reason
  );

  res.status(200).json({
    status: 'success',
    message: 'Timesheet unlocked successfully',
  });
});
