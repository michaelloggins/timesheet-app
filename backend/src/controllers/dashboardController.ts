/**
 * Dashboard Controller
 * Provides KPI endpoints for dashboard visualizations
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getPool } from '../config/database';
import {
  getPersonalKPIs,
  getTeamKPIs,
  getTeamLeaderboard,
  getCompanyKPIs,
  getDepartmentLeaderboard,
  getCompanyLeaderboard,
} from '../services/kpiService';

/**
 * Get department scoreboard with RAG indicators
 * GET /api/dashboard/scoreboard
 */
export const getScoreboard = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();

  const result = await pool.request().query(`
    SELECT
      d.DepartmentID,
      d.DepartmentName,
      COUNT(DISTINCT u.UserID) AS TotalEmployees,
      COUNT(DISTINCT CASE WHEN t.Status IN ('Submitted', 'Approved') THEN t.TimesheetID END) AS SubmittedCount,
      COUNT(DISTINCT CASE WHEN t.Status = 'Approved' THEN t.TimesheetID END) AS ApprovedCount,
      CASE
        WHEN COUNT(DISTINCT u.UserID) = 0 THEN 0
        ELSE ROUND(
          CAST(COUNT(DISTINCT CASE WHEN t.Status IN ('Submitted', 'Approved') THEN t.TimesheetID END) AS FLOAT) /
          COUNT(DISTINCT u.UserID) * 100, 1
        )
      END AS CompletionRate
    FROM Departments d
    LEFT JOIN Users u ON d.DepartmentID = u.DepartmentID AND u.IsActive = 1
    LEFT JOIN Timesheets t ON u.UserID = t.UserID
      AND t.PeriodStartDate = DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
    WHERE d.IsActive = 1
    GROUP BY d.DepartmentID, d.DepartmentName
    ORDER BY CompletionRate DESC
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoreboard = result.recordset.map((dept: any) => ({
    departmentId: dept.DepartmentID,
    departmentName: dept.DepartmentName,
    totalEmployees: dept.TotalEmployees,
    submittedCount: dept.SubmittedCount,
    approvedCount: dept.ApprovedCount,
    completionRate: dept.CompletionRate,
    ragStatus: dept.CompletionRate >= 90 ? 'green' :
               dept.CompletionRate >= 70 ? 'amber' : 'red',
  }));

  res.status(200).json({ status: 'success', data: scoreboard });
});

/**
 * Get leadership KPIs (executive dashboard)
 * GET /api/dashboard/leadership-kpis
 */
export const getLeadershipKPIs = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();

  const result = await pool.request().query(`
    DECLARE @currentWeekStart DATE = DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE));

    SELECT
      -- Overall completion rate for current week
      (SELECT
        CASE WHEN COUNT(DISTINCT u.UserID) = 0 THEN 0
        ELSE ROUND(
          CAST(COUNT(DISTINCT CASE WHEN t.Status IN ('Submitted', 'Approved') THEN t.TimesheetID END) AS FLOAT) /
          COUNT(DISTINCT u.UserID) * 100, 1
        )
        END
       FROM Users u
       LEFT JOIN Timesheets t ON u.UserID = t.UserID AND t.PeriodStartDate = @currentWeekStart
       WHERE u.IsActive = 1
      ) AS OverallCompletionRate,

      -- Pending approvals count
      (SELECT COUNT(*)
       FROM Timesheets
       WHERE Status = 'Submitted') AS PendingApprovalsCount,

      -- Average approval time (last 30 days)
      (SELECT AVG(DATEDIFF(HOUR, SubmittedDate, ApprovedDate))
       FROM Timesheets
       WHERE Status = 'Approved'
         AND ApprovedDate >= DATEADD(DAY, -30, GETDATE())
      ) AS AvgApprovalTimeHours,

      -- Return rate (last 30 days)
      (SELECT
        CASE WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
          CAST(SUM(CASE WHEN Status = 'Returned' THEN 1 ELSE 0 END) AS FLOAT) /
          COUNT(*) * 100, 1
        )
        END
       FROM Timesheets
       WHERE SubmittedDate >= DATEADD(DAY, -30, GETDATE())
      ) AS ReturnRate,

      -- Total active users
      (SELECT COUNT(*) FROM Users WHERE IsActive = 1) AS TotalActiveUsers,

      -- Total hours this month
      (SELECT ISNULL(SUM(HoursWorked), 0)
       FROM TimeEntries
       WHERE YEAR(WorkDate) = YEAR(GETDATE())
         AND MONTH(WorkDate) = MONTH(GETDATE())
      ) AS TotalHoursThisMonth
  `);

  const data = result.recordset[0];

  res.status(200).json({
    status: 'success',
    data: {
      overallCompletionRate: data.OverallCompletionRate || 0,
      pendingApprovalsCount: data.PendingApprovalsCount || 0,
      avgApprovalTimeHours: data.AvgApprovalTimeHours || 0,
      returnRate: data.ReturnRate || 0,
      totalActiveUsers: data.TotalActiveUsers || 0,
      totalHoursThisMonth: parseFloat(data.TotalHoursThisMonth) || 0,
    },
  });
});

/**
 * Get employee dashboard stats (personal KPIs)
 * GET /api/dashboard/employee-stats
 */
export const getEmployeeStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const personalKPIs = await getPersonalKPIs(userId);

  res.status(200).json({
    status: 'success',
    data: personalKPIs,
  });
});

/**
 * Get manager dashboard stats (team KPIs + leaderboard)
 * Uses direct reports (employees where ManagerEntraID = current user's EntraID)
 * GET /api/dashboard/manager-stats
 */
export const getManagerStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const entraId = req.user!.entraId;

  // Get personal KPIs
  const personalKPIs = await getPersonalKPIs(userId);

  // Get team KPIs (direct reports based on ManagerEntraID)
  const teamKPIs = await getTeamKPIs(entraId);

  // Get team leaderboard (top 10)
  const leaderboard = await getTeamLeaderboard(entraId, 10);

  res.status(200).json({
    status: 'success',
    data: {
      personal: personalKPIs,
      team: teamKPIs,
      leaderboard,
    },
  });
});

/**
 * Get team leaderboard (direct reports)
 * GET /api/dashboard/leaderboard
 */
export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const entraId = req.user!.entraId;
  const limit = parseInt(req.query.limit as string) || 10;

  const leaderboard = await getTeamLeaderboard(entraId, limit);

  res.status(200).json({
    status: 'success',
    data: leaderboard,
  });
});

/**
 * Get company-wide KPIs for scoreboard
 * GET /api/dashboard/company-kpis
 */
export const getCompanyStats = asyncHandler(async (_req: Request, res: Response) => {
  const companyKPIs = await getCompanyKPIs();

  res.status(200).json({
    status: 'success',
    data: companyKPIs,
  });
});

/**
 * Get department leaderboard (ranked by compliance)
 * GET /api/dashboard/department-leaderboard
 */
export const getDepartmentLeaderboardEndpoint = asyncHandler(async (_req: Request, res: Response) => {
  const leaderboard = await getDepartmentLeaderboard();

  res.status(200).json({
    status: 'success',
    data: leaderboard,
  });
});

/**
 * Get company-wide employee leaderboard (top performers)
 * GET /api/dashboard/company-leaderboard
 */
export const getCompanyLeaderboardEndpoint = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const leaderboard = await getCompanyLeaderboard(limit);

  res.status(200).json({
    status: 'success',
    data: leaderboard,
  });
});
