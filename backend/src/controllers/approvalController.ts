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
  approvalType: 'Primary' | 'Escalated' | 'Delegate' | 'Admin';
  managementLevel: number;
}

/**
 * Get timesheets for approval - supports filtering by status
 * Uses org-chart based approvals via ManagerEntraID
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

  // For TimesheetAdmin role, show all submitted timesheets
  // For Leadership with NULL ManagerEntraID (top executives), show all employees
  // For Managers, use recursive CTE to find all employees in their org tree
  const isAdmin = user.role === 'TimesheetAdmin';
  const isTopExecutive = user.role === 'Leadership' && !user.managerEntraId;

  let query: string;

  if (isAdmin) {
    // Admins can see and approve all timesheets
    query = `
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
        END as daysWaiting,
        'Admin' as approvalType,
        0 as managementLevel
      FROM Timesheets t
      INNER JOIN Users u ON t.UserID = u.UserID
      LEFT JOIN TimeEntries te ON t.TimesheetID = te.TimesheetID
      WHERE t.UserID != @managerId
        AND t.Status IN (${statusPlaceholders})
        AND u.IsActive = 1
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
  } else if (isTopExecutive) {
    // Top executives (NULL ManagerEntraID) can see/approve everyone
    query = `
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
        END as daysWaiting,
        CASE
          WHEN u.ManagerEntraID = @approverEntraId THEN 'Primary'
          ELSE 'Escalated'
        END as approvalType,
        1 as managementLevel
      FROM Timesheets t
      INNER JOIN Users u ON t.UserID = u.UserID
      LEFT JOIN TimeEntries te ON t.TimesheetID = te.TimesheetID
      WHERE t.UserID != @managerId
        AND t.Status IN (${statusPlaceholders})
        AND u.IsActive = 1
      GROUP BY
        t.TimesheetID, t.UserID, u.Name, u.Email,
        t.PeriodStartDate, t.PeriodEndDate, t.Status,
        t.SubmittedDate, t.ApprovedDate, t.ReturnReason,
        u.ManagerEntraID
      ORDER BY
        CASE t.Status
          WHEN 'Submitted' THEN 1
          WHEN 'Returned' THEN 2
          WHEN 'Approved' THEN 3
        END,
        t.SubmittedDate DESC
    `;
  } else {
    // Standard manager: use recursive CTE to find all reports in org tree
    // Also include delegated approvals
    query = `
      ;WITH OrgTree AS (
        -- Anchor: Direct reports (Primary approval)
        SELECT
          u.UserID,
          u.EntraIDObjectID,
          u.Name,
          u.Email,
          u.ManagerEntraID,
          1 as ManagementLevel,
          'Primary' as ApprovalType
        FROM Users u
        WHERE u.ManagerEntraID = @approverEntraId
          AND u.IsActive = 1

        UNION ALL

        -- Recursive: Indirect reports (Escalated approval)
        SELECT
          u.UserID,
          u.EntraIDObjectID,
          u.Name,
          u.Email,
          u.ManagerEntraID,
          ot.ManagementLevel + 1,
          'Escalated' as ApprovalType
        FROM Users u
        INNER JOIN OrgTree ot ON u.ManagerEntraID = ot.EntraIDObjectID
        WHERE u.IsActive = 1
          AND ot.ManagementLevel < 10  -- Prevent infinite loops, max 10 levels
      ),
      DelegatedReports AS (
        -- Find employees whose managers have delegated to the current user
        -- Respects scoped delegations (if DelegationEmployees has entries, only those employees)
        SELECT
          u.UserID,
          u.EntraIDObjectID,
          u.Name,
          u.Email,
          u.ManagerEntraID,
          1 as ManagementLevel,
          'Delegate' as ApprovalType
        FROM Users u
        INNER JOIN Users mgr ON u.ManagerEntraID = mgr.EntraIDObjectID
        INNER JOIN ApprovalDelegation ad ON mgr.UserID = ad.DelegatorUserID
        WHERE ad.DelegateUserID = @managerId
          AND ad.IsActive = 1
          AND CAST(GETUTCDATE() AS DATE) BETWEEN ad.StartDate AND ad.EndDate
          AND u.IsActive = 1
          -- Check if delegation is scoped: if DelegationEmployees has rows, only include those employees
          AND (
            NOT EXISTS (SELECT 1 FROM DelegationEmployees de WHERE de.DelegationID = ad.DelegationID)
            OR u.UserID IN (SELECT de.EmployeeUserID FROM DelegationEmployees de WHERE de.DelegationID = ad.DelegationID)
          )
          -- Exclude users already in org tree to avoid duplicates
          AND u.UserID NOT IN (SELECT UserID FROM OrgTree)
      ),
      AllReports AS (
        SELECT * FROM OrgTree
        UNION ALL
        SELECT * FROM DelegatedReports
      )
      SELECT
        t.TimesheetID as timesheetId,
        t.UserID as userId,
        ar.Name as employeeName,
        ar.Email as employeeEmail,
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
        END as daysWaiting,
        ar.ApprovalType as approvalType,
        ar.ManagementLevel as managementLevel
      FROM Timesheets t
      INNER JOIN AllReports ar ON t.UserID = ar.UserID
      LEFT JOIN TimeEntries te ON t.TimesheetID = te.TimesheetID
      WHERE t.Status IN (${statusPlaceholders})
      GROUP BY
        t.TimesheetID, t.UserID, ar.Name, ar.Email,
        t.PeriodStartDate, t.PeriodEndDate, t.Status,
        t.SubmittedDate, t.ApprovedDate, t.ReturnReason,
        ar.ApprovalType, ar.ManagementLevel
      ORDER BY
        ar.ApprovalType,  -- Primary first, then Delegate, then Escalated
        ar.ManagementLevel,  -- Direct reports before indirect
        CASE t.Status
          WHEN 'Submitted' THEN 1
          WHEN 'Returned' THEN 2
          WHEN 'Approved' THEN 3
        END,
        t.SubmittedDate DESC
    `;
  }

  const request = pool.request()
    .input('managerId', user.userId)
    .input('approverEntraId', user.entraId);

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
 * Uses org-chart based approvals via ManagerEntraID
 */
export const getApprovalHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const pool = await getPool();

  const isAdmin = user.role === 'TimesheetAdmin';
  const isTopExecutive = user.role === 'Leadership' && !user.managerEntraId;

  let query: string;

  if (isAdmin || isTopExecutive) {
    // Admins and top executives see all approval history
    query = `
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
        approver.Name as approvedByName,
        th.ApprovalType as approvalType
      FROM Timesheets t
      INNER JOIN Users u ON t.UserID = u.UserID
      LEFT JOIN TimeEntries te ON t.TimesheetID = te.TimesheetID
      LEFT JOIN Users approver ON t.ApprovedByUserID = approver.UserID
      LEFT JOIN TimesheetHistory th ON t.TimesheetID = th.TimesheetID
        AND th.Action = 'Approved'
        AND th.ActionDate = (
          SELECT MAX(ActionDate) FROM TimesheetHistory
          WHERE TimesheetID = t.TimesheetID AND Action = 'Approved'
        )
      WHERE t.UserID != @managerId
        AND t.Status IN ('Approved', 'Returned')
        AND u.IsActive = 1
        AND (t.ApprovedDate >= DATEADD(DAY, -90, GETUTCDATE())
             OR t.ModifiedDate >= DATEADD(DAY, -90, GETUTCDATE()))
      GROUP BY
        t.TimesheetID, t.UserID, u.Name, u.Email,
        t.PeriodStartDate, t.PeriodEndDate, t.Status,
        t.SubmittedDate, t.ApprovedDate, t.ReturnReason,
        approver.Name, th.ApprovalType
      ORDER BY COALESCE(t.ApprovedDate, t.ModifiedDate) DESC
    `;
  } else {
    // Managers see history for their org tree
    query = `
      ;WITH OrgTree AS (
        -- Direct reports
        SELECT u.UserID, u.EntraIDObjectID, 1 as ManagementLevel
        FROM Users u
        WHERE u.ManagerEntraID = @approverEntraId AND u.IsActive = 1

        UNION ALL

        -- Indirect reports
        SELECT u.UserID, u.EntraIDObjectID, ot.ManagementLevel + 1
        FROM Users u
        INNER JOIN OrgTree ot ON u.ManagerEntraID = ot.EntraIDObjectID
        WHERE u.IsActive = 1 AND ot.ManagementLevel < 10
      )
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
        approver.Name as approvedByName,
        th.ApprovalType as approvalType
      FROM Timesheets t
      INNER JOIN OrgTree ot ON t.UserID = ot.UserID
      INNER JOIN Users u ON t.UserID = u.UserID
      LEFT JOIN TimeEntries te ON t.TimesheetID = te.TimesheetID
      LEFT JOIN Users approver ON t.ApprovedByUserID = approver.UserID
      LEFT JOIN TimesheetHistory th ON t.TimesheetID = th.TimesheetID
        AND th.Action = 'Approved'
        AND th.ActionDate = (
          SELECT MAX(ActionDate) FROM TimesheetHistory
          WHERE TimesheetID = t.TimesheetID AND Action = 'Approved'
        )
      WHERE t.Status IN ('Approved', 'Returned')
        AND (t.ApprovedDate >= DATEADD(DAY, -90, GETUTCDATE())
             OR t.ModifiedDate >= DATEADD(DAY, -90, GETUTCDATE()))
      GROUP BY
        t.TimesheetID, t.UserID, u.Name, u.Email,
        t.PeriodStartDate, t.PeriodEndDate, t.Status,
        t.SubmittedDate, t.ApprovedDate, t.ReturnReason,
        approver.Name, th.ApprovalType
      ORDER BY COALESCE(t.ApprovedDate, t.ModifiedDate) DESC
    `;
  }

  const result = await pool.request()
    .input('managerId', user.userId)
    .input('approverEntraId', user.entraId)
    .query(query);

  res.status(200).json({
    status: 'success',
    data: result.recordset,
  });
});

/**
 * Get time entries for a specific timesheet (for detail view)
 * Uses org-chart based access control via ManagerEntraID
 */
export const getTimesheetEntries = asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const user = req.user!;
  const pool = await getPool();

  const isAdmin = user.role === 'TimesheetAdmin';
  const isTopExecutive = user.role === 'Leadership' && !user.managerEntraId;

  // Verify the manager has access to this timesheet via org chart
  let accessCheckQuery: string;

  if (isAdmin || isTopExecutive) {
    // Admins and top executives can access any timesheet
    accessCheckQuery = `
      SELECT t.TimesheetID
      FROM Timesheets t
      WHERE t.TimesheetID = @timesheetId
    `;
  } else {
    // Check if employee is in manager's org tree or is delegated
    accessCheckQuery = `
      ;WITH OrgTree AS (
        -- Direct reports
        SELECT u.UserID, u.EntraIDObjectID, 1 as ManagementLevel
        FROM Users u
        WHERE u.ManagerEntraID = @approverEntraId AND u.IsActive = 1

        UNION ALL

        -- Indirect reports
        SELECT u.UserID, u.EntraIDObjectID, ot.ManagementLevel + 1
        FROM Users u
        INNER JOIN OrgTree ot ON u.ManagerEntraID = ot.EntraIDObjectID
        WHERE u.IsActive = 1 AND ot.ManagementLevel < 10
      ),
      DelegatedReports AS (
        SELECT u.UserID
        FROM Users u
        INNER JOIN Users mgr ON u.ManagerEntraID = mgr.EntraIDObjectID
        INNER JOIN ApprovalDelegation ad ON mgr.UserID = ad.DelegatorUserID
        WHERE ad.DelegateUserID = @managerId
          AND ad.IsActive = 1
          AND CAST(GETUTCDATE() AS DATE) BETWEEN ad.StartDate AND ad.EndDate
          AND u.IsActive = 1
          -- Check if delegation is scoped
          AND (
            NOT EXISTS (SELECT 1 FROM DelegationEmployees de WHERE de.DelegationID = ad.DelegationID)
            OR u.UserID IN (SELECT de.EmployeeUserID FROM DelegationEmployees de WHERE de.DelegationID = ad.DelegationID)
          )
      ),
      AllAccessible AS (
        SELECT UserID FROM OrgTree
        UNION
        SELECT UserID FROM DelegatedReports
      )
      SELECT t.TimesheetID
      FROM Timesheets t
      INNER JOIN AllAccessible aa ON t.UserID = aa.UserID
      WHERE t.TimesheetID = @timesheetId
    `;
  }

  const accessCheck = await pool.request()
    .input('timesheetId', timesheetId)
    .input('managerId', user.userId)
    .input('approverEntraId', user.entraId)
    .query(accessCheckQuery);

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
 * Authorization is verified in the service layer via org chart
 */
export const approveTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const { timesheetId } = req.params;
  const user = req.user!;

  await approvalService.approveTimesheet(
    parseInt(timesheetId),
    user.userId,
    user.entraId,
    user.role,
    user.managerEntraId
  );

  res.status(200).json({
    status: 'success',
    message: 'Timesheet approved successfully',
  });
});

/**
 * Return a timesheet to the employee
 * Authorization is verified in the service layer via org chart
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
    reason,
    user.entraId,
    user.role,
    user.managerEntraId
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
