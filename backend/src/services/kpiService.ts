/**
 * KPI Service
 * Calculates dashboard KPIs for personal, team, and leaderboard metrics
 */

import { getPool } from '../config/database';

// Types for KPI responses
export interface PersonalKPIs {
  weeklyCompliance: {
    approvedWeeks: number;
    expectedWeeks: number;
    complianceRate: number;
    currentWeekStatus: 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Missing';
  };
  dailyReporting: {
    actualDaysWorked: number;
    expectedWorkingDays: number;
    reportingRate: number;
  };
  periodStart: string;
  periodEnd: string;
}

export interface TeamKPIs {
  teamName: string; // Department name of the managed employees
  employeeCount: number;
  weeklyCompliance: {
    totalApprovedWeeks: number;
    totalExpectedWeeks: number;
    averageComplianceRate: number;
    currentWeekStats: {
      approved: number;
      submitted: number;
      draft: number;
      missing: number;
    };
  };
  dailyReporting: {
    totalActualDays: number;
    totalExpectedDays: number;
    averageReportingRate: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  employeeName: string;
  weeklyComplianceRate: number;
  dailyReportingRate: number;
  overallScore: number;
  currentWeekStatus: 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Missing';
  streakWeeks: number;
}

/**
 * Calculate the Sunday of the current week
 */
function getCurrentWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = -dayOfWeek; // Sunday = 0
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/**
 * Calculate the first Sunday of the year (or last Sunday of previous year if Jan 1 is not Sunday)
 */
function getYearStartSunday(): Date {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const dayOfWeek = yearStart.getDay();
  // Go back to the previous Sunday (or stay if already Sunday)
  const diff = -dayOfWeek;
  const firstSunday = new Date(yearStart);
  firstSunday.setDate(yearStart.getDate() + diff);
  return firstSunday;
}

/**
 * Calculate number of weeks between two dates
 */
function getWeeksBetween(start: Date, end: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerWeek) + 1;
}

/**
 * Calculate weekdays between two dates (Mon-Fri)
 */
function getWeekdaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Get personal KPIs for a user
 */
export async function getPersonalKPIs(userId: number): Promise<PersonalKPIs> {
  const pool = getPool();
  const currentWeekStart = getCurrentWeekStart();
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate expected weeks from year start to current week
  const yearStartSunday = getYearStartSunday();
  const expectedWeeks = getWeeksBetween(yearStartSunday, currentWeekStart);

  // Calculate expected working days
  const expectedWorkingDays = getWeekdaysBetween(yearStart, today);

  const result = await pool.request()
    .input('userId', userId)
    .input('yearStart', yearStart.toISOString().split('T')[0])
    .input('currentWeekStart', currentWeekStart.toISOString().split('T')[0])
    .input('today', today.toISOString().split('T')[0])
    .query(`
      -- Approved weeks count
      SELECT
        COUNT(CASE WHEN Status = 'Approved' THEN 1 END) AS ApprovedWeeks,

        -- Current week status
        (SELECT TOP 1 Status
         FROM Timesheets
         WHERE UserID = @userId
           AND PeriodStartDate = @currentWeekStart) AS CurrentWeekStatus,

        -- Days with time entries YTD
        (SELECT COUNT(DISTINCT WorkDate)
         FROM TimeEntries
         WHERE UserID = @userId
           AND WorkDate >= @yearStart
           AND WorkDate <= @today) AS ActualDaysWorked

      FROM Timesheets
      WHERE UserID = @userId
        AND PeriodStartDate >= @yearStart
        AND PeriodStartDate <= @currentWeekStart
    `);

  const data = result.recordset[0];
  const approvedWeeks = data.ApprovedWeeks || 0;
  const actualDaysWorked = data.ActualDaysWorked || 0;
  const currentWeekStatus = data.CurrentWeekStatus || 'Missing';

  const complianceRate = expectedWeeks > 0
    ? Math.round((approvedWeeks / expectedWeeks) * 100)
    : 0;
  const reportingRate = expectedWorkingDays > 0
    ? Math.round((actualDaysWorked / expectedWorkingDays) * 100)
    : 0;

  return {
    weeklyCompliance: {
      approvedWeeks,
      expectedWeeks,
      complianceRate,
      currentWeekStatus,
    },
    dailyReporting: {
      actualDaysWorked,
      expectedWorkingDays,
      reportingRate,
    },
    periodStart: yearStart.toISOString().split('T')[0],
    periodEnd: today.toISOString().split('T')[0],
  };
}

/**
 * Get team KPIs for a manager (based on their direct reports via ManagerEntraID)
 */
export async function getTeamKPIs(managerEntraId: string): Promise<TeamKPIs | null> {
  const pool = getPool();
  const currentWeekStart = getCurrentWeekStart();
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yearStartSunday = getYearStartSunday();
  const expectedWeeksPerEmployee = getWeeksBetween(yearStartSunday, currentWeekStart);
  const expectedWorkingDaysPerEmployee = getWeekdaysBetween(yearStart, today);

  const result = await pool.request()
    .input('managerEntraId', managerEntraId)
    .input('yearStart', yearStart.toISOString().split('T')[0])
    .input('currentWeekStart', currentWeekStart.toISOString().split('T')[0])
    .input('today', today.toISOString().split('T')[0])
    .query(`
      WITH DirectReports AS (
        SELECT u.UserID, u.DepartmentID
        FROM Users u
        WHERE u.ManagerEntraID = @managerEntraId
          AND u.IsActive = 1
      ),
      TeamDepartment AS (
        -- Get the primary department name (most common among direct reports)
        SELECT TOP 1 d.DepartmentName
        FROM DirectReports dr
        INNER JOIN Departments d ON dr.DepartmentID = d.DepartmentID
        GROUP BY d.DepartmentName
        ORDER BY COUNT(*) DESC
      ),
      EmployeeTimesheets AS (
        SELECT
          t.UserID,
          t.Status,
          t.PeriodStartDate
        FROM Timesheets t
        INNER JOIN DirectReports e ON t.UserID = e.UserID
        WHERE t.PeriodStartDate >= @yearStart
          AND t.PeriodStartDate <= @currentWeekStart
      ),
      CurrentWeekTimesheets AS (
        SELECT
          t.UserID,
          t.Status
        FROM Timesheets t
        INNER JOIN DirectReports e ON t.UserID = e.UserID
        WHERE t.PeriodStartDate = @currentWeekStart
      )
      SELECT
        (SELECT DepartmentName FROM TeamDepartment) AS TeamName,
        (SELECT COUNT(*) FROM DirectReports) AS EmployeeCount,
        (SELECT COUNT(*) FROM EmployeeTimesheets WHERE Status = 'Approved') AS TotalApprovedWeeks,

        -- Current week stats
        (SELECT COUNT(*) FROM CurrentWeekTimesheets WHERE Status = 'Approved') AS CurrentApproved,
        (SELECT COUNT(*) FROM CurrentWeekTimesheets WHERE Status = 'Submitted') AS CurrentSubmitted,
        (SELECT COUNT(*) FROM CurrentWeekTimesheets WHERE Status = 'Draft' OR Status = 'Returned') AS CurrentDraft,

        -- Days worked
        (SELECT COUNT(DISTINCT te.WorkDate)
         FROM TimeEntries te
         INNER JOIN DirectReports e ON te.UserID = e.UserID
         WHERE te.WorkDate >= @yearStart AND te.WorkDate <= @today) AS TotalActualDays
    `);

  const data = result.recordset[0];
  const employeeCount = data.EmployeeCount || 0;

  // If no direct reports, return null
  if (employeeCount === 0) {
    return null;
  }

  const totalApprovedWeeks = data.TotalApprovedWeeks || 0;
  const totalExpectedWeeks = employeeCount * expectedWeeksPerEmployee;
  const totalActualDays = data.TotalActualDays || 0;
  const totalExpectedDays = employeeCount * expectedWorkingDaysPerEmployee;

  const currentApproved = data.CurrentApproved || 0;
  const currentSubmitted = data.CurrentSubmitted || 0;
  const currentDraft = data.CurrentDraft || 0;
  const currentMissing = employeeCount - currentApproved - currentSubmitted - currentDraft;

  return {
    teamName: data.TeamName || 'My Team',
    employeeCount,
    weeklyCompliance: {
      totalApprovedWeeks,
      totalExpectedWeeks,
      averageComplianceRate: totalExpectedWeeks > 0
        ? Math.round((totalApprovedWeeks / totalExpectedWeeks) * 100)
        : 0,
      currentWeekStats: {
        approved: currentApproved,
        submitted: currentSubmitted,
        draft: currentDraft,
        missing: Math.max(0, currentMissing),
      },
    },
    dailyReporting: {
      totalActualDays,
      totalExpectedDays,
      averageReportingRate: totalExpectedDays > 0
        ? Math.round((totalActualDays / totalExpectedDays) * 100)
        : 0,
    },
  };
}

/**
 * Get team leaderboard for a manager (based on their direct reports)
 */
export async function getTeamLeaderboard(
  managerEntraId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const pool = getPool();
  const currentWeekStart = getCurrentWeekStart();
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yearStartSunday = getYearStartSunday();
  const expectedWeeks = getWeeksBetween(yearStartSunday, currentWeekStart);
  const expectedDays = getWeekdaysBetween(yearStart, today);

  const result = await pool.request()
    .input('managerEntraId', managerEntraId)
    .input('yearStart', yearStart.toISOString().split('T')[0])
    .input('currentWeekStart', currentWeekStart.toISOString().split('T')[0])
    .input('today', today.toISOString().split('T')[0])
    .input('expectedWeeks', expectedWeeks)
    .input('expectedDays', expectedDays)
    .input('limit', limit)
    .query(`
      WITH DirectReports AS (
        SELECT UserID, Name
        FROM Users
        WHERE ManagerEntraID = @managerEntraId
          AND IsActive = 1
      ),
      EmployeeMetrics AS (
        SELECT
          u.UserID,
          u.Name AS EmployeeName,

          -- Approved weeks count
          (SELECT COUNT(*)
           FROM Timesheets t
           WHERE t.UserID = u.UserID
             AND t.Status = 'Approved'
             AND t.PeriodStartDate >= @yearStart
             AND t.PeriodStartDate <= @currentWeekStart) AS ApprovedWeeks,

          -- Days with entries
          (SELECT COUNT(DISTINCT WorkDate)
           FROM TimeEntries te
           WHERE te.UserID = u.UserID
             AND te.WorkDate >= @yearStart
             AND te.WorkDate <= @today) AS ActualDays,

          -- Current week timesheet status
          (SELECT TOP 1 Status
           FROM Timesheets ts
           WHERE ts.UserID = u.UserID
             AND ts.PeriodStartDate = @currentWeekStart) AS CurrentWeekStatus,

          -- Calculate streak (consecutive approved weeks going back)
          (SELECT COUNT(*)
           FROM (
             SELECT PeriodStartDate,
                    ROW_NUMBER() OVER (ORDER BY PeriodStartDate DESC) AS RowNum,
                    DATEDIFF(WEEK, PeriodStartDate, @currentWeekStart) AS WeeksAgo
             FROM Timesheets
             WHERE UserID = u.UserID AND Status = 'Approved'
           ) streak
           WHERE RowNum = WeeksAgo + 1
          ) AS StreakWeeks

        FROM DirectReports u
      ),
      ScoredEmployees AS (
        SELECT
          UserID,
          EmployeeName,
          ApprovedWeeks,
          ActualDays,
          CurrentWeekStatus,
          StreakWeeks,
          CASE WHEN @expectedWeeks > 0
               THEN CAST(ApprovedWeeks AS FLOAT) / @expectedWeeks * 100
               ELSE 0 END AS WeeklyComplianceRate,
          CASE WHEN @expectedDays > 0
               THEN CAST(ActualDays AS FLOAT) / @expectedDays * 100
               ELSE 0 END AS DailyReportingRate,
          -- Overall score: 60% weekly compliance, 40% daily reporting
          CASE WHEN @expectedWeeks > 0 AND @expectedDays > 0
               THEN (CAST(ApprovedWeeks AS FLOAT) / @expectedWeeks * 60) +
                    (CAST(ActualDays AS FLOAT) / @expectedDays * 40)
               ELSE 0 END AS OverallScore
        FROM EmployeeMetrics
      )
      SELECT
        ROW_NUMBER() OVER (ORDER BY OverallScore DESC) AS Rank,
        UserID,
        EmployeeName,
        ROUND(WeeklyComplianceRate, 1) AS WeeklyComplianceRate,
        ROUND(DailyReportingRate, 1) AS DailyReportingRate,
        ROUND(OverallScore, 1) AS OverallScore,
        ISNULL(CurrentWeekStatus, 'Missing') AS CurrentWeekStatus,
        ISNULL(StreakWeeks, 0) AS StreakWeeks
      FROM ScoredEmployees
      ORDER BY Rank
      OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.recordset.map((row: any) => ({
    rank: row.Rank,
    userId: row.UserID,
    employeeName: row.EmployeeName,
    weeklyComplianceRate: row.WeeklyComplianceRate,
    dailyReportingRate: row.DailyReportingRate,
    overallScore: row.OverallScore,
    currentWeekStatus: row.CurrentWeekStatus,
    streakWeeks: row.StreakWeeks,
  }));
}

/**
 * Company-wide KPIs
 */
export interface CompanyKPIs {
  totalEmployees: number;
  weeklyCompliance: {
    totalApprovedWeeks: number;
    totalExpectedWeeks: number;
    averageComplianceRate: number;
    currentWeekStats: {
      approved: number;
      submitted: number;
      draft: number;
      missing: number;
    };
  };
  dailyReporting: {
    totalActualDays: number;
    totalExpectedDays: number;
    averageReportingRate: number;
  };
  periodStart: string;
  periodEnd: string;
}

export interface DepartmentLeaderboardEntry {
  rank: number;
  departmentId: number;
  departmentName: string;
  employeeCount: number;
  complianceRate: number;
  currentWeekSubmitted: number;
  currentWeekApproved: number;
}

/**
 * Get company-wide KPIs
 */
export async function getCompanyKPIs(): Promise<CompanyKPIs> {
  const pool = getPool();
  const currentWeekStart = getCurrentWeekStart();
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yearStartSunday = getYearStartSunday();
  const expectedWeeksPerEmployee = getWeeksBetween(yearStartSunday, currentWeekStart);
  const expectedWorkingDaysPerEmployee = getWeekdaysBetween(yearStart, today);

  const result = await pool.request()
    .input('yearStart', yearStart.toISOString().split('T')[0])
    .input('currentWeekStart', currentWeekStart.toISOString().split('T')[0])
    .input('today', today.toISOString().split('T')[0])
    .query(`
      WITH ActiveUsers AS (
        SELECT UserID FROM Users WHERE IsActive = 1
      ),
      AllTimesheets AS (
        SELECT t.UserID, t.Status, t.PeriodStartDate
        FROM Timesheets t
        INNER JOIN ActiveUsers u ON t.UserID = u.UserID
        WHERE t.PeriodStartDate >= @yearStart
          AND t.PeriodStartDate <= @currentWeekStart
      ),
      CurrentWeekTimesheets AS (
        SELECT t.UserID, t.Status
        FROM Timesheets t
        INNER JOIN ActiveUsers u ON t.UserID = u.UserID
        WHERE t.PeriodStartDate = @currentWeekStart
      )
      SELECT
        (SELECT COUNT(*) FROM ActiveUsers) AS TotalEmployees,
        (SELECT COUNT(*) FROM AllTimesheets WHERE Status = 'Approved') AS TotalApprovedWeeks,
        (SELECT COUNT(*) FROM CurrentWeekTimesheets WHERE Status = 'Approved') AS CurrentApproved,
        (SELECT COUNT(*) FROM CurrentWeekTimesheets WHERE Status = 'Submitted') AS CurrentSubmitted,
        (SELECT COUNT(*) FROM CurrentWeekTimesheets WHERE Status IN ('Draft', 'Returned')) AS CurrentDraft,
        (SELECT COUNT(DISTINCT te.WorkDate)
         FROM TimeEntries te
         INNER JOIN ActiveUsers u ON te.UserID = u.UserID
         WHERE te.WorkDate >= @yearStart AND te.WorkDate <= @today) AS TotalActualDays
    `);

  const data = result.recordset[0];
  const totalEmployees = data.TotalEmployees || 0;
  const totalApprovedWeeks = data.TotalApprovedWeeks || 0;
  const totalExpectedWeeks = totalEmployees * expectedWeeksPerEmployee;
  const totalActualDays = data.TotalActualDays || 0;
  const totalExpectedDays = totalEmployees * expectedWorkingDaysPerEmployee;

  const currentApproved = data.CurrentApproved || 0;
  const currentSubmitted = data.CurrentSubmitted || 0;
  const currentDraft = data.CurrentDraft || 0;
  const currentMissing = totalEmployees - currentApproved - currentSubmitted - currentDraft;

  return {
    totalEmployees,
    weeklyCompliance: {
      totalApprovedWeeks,
      totalExpectedWeeks,
      averageComplianceRate: totalExpectedWeeks > 0
        ? Math.round((totalApprovedWeeks / totalExpectedWeeks) * 100)
        : 0,
      currentWeekStats: {
        approved: currentApproved,
        submitted: currentSubmitted,
        draft: currentDraft,
        missing: Math.max(0, currentMissing),
      },
    },
    dailyReporting: {
      totalActualDays,
      totalExpectedDays,
      averageReportingRate: totalExpectedDays > 0
        ? Math.round((totalActualDays / totalExpectedDays) * 100)
        : 0,
    },
    periodStart: yearStart.toISOString().split('T')[0],
    periodEnd: today.toISOString().split('T')[0],
  };
}

/**
 * Get department/team leaderboard (ranked by compliance)
 */
export async function getDepartmentLeaderboard(): Promise<DepartmentLeaderboardEntry[]> {
  const pool = getPool();
  const currentWeekStart = getCurrentWeekStart();
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const yearStartSunday = getYearStartSunday();
  const expectedWeeks = getWeeksBetween(yearStartSunday, currentWeekStart);

  const result = await pool.request()
    .input('yearStart', yearStart.toISOString().split('T')[0])
    .input('currentWeekStart', currentWeekStart.toISOString().split('T')[0])
    .input('expectedWeeks', expectedWeeks)
    .query(`
      WITH DepartmentStats AS (
        SELECT
          d.DepartmentID,
          d.DepartmentName,
          COUNT(DISTINCT u.UserID) AS EmployeeCount,
          COUNT(CASE WHEN t.Status = 'Approved' THEN 1 END) AS ApprovedWeeks,
          COUNT(CASE WHEN t.PeriodStartDate = @currentWeekStart AND t.Status IN ('Submitted', 'Approved') THEN 1 END) AS CurrentWeekSubmitted,
          COUNT(CASE WHEN t.PeriodStartDate = @currentWeekStart AND t.Status = 'Approved' THEN 1 END) AS CurrentWeekApproved
        FROM Departments d
        INNER JOIN Users u ON d.DepartmentID = u.DepartmentID AND u.IsActive = 1
        LEFT JOIN Timesheets t ON u.UserID = t.UserID
          AND t.PeriodStartDate >= @yearStart
          AND t.PeriodStartDate <= @currentWeekStart
        WHERE d.IsActive = 1
        GROUP BY d.DepartmentID, d.DepartmentName
      )
      SELECT
        ROW_NUMBER() OVER (ORDER BY
          CASE WHEN EmployeeCount * @expectedWeeks > 0
               THEN CAST(ApprovedWeeks AS FLOAT) / (EmployeeCount * @expectedWeeks)
               ELSE 0 END DESC
        ) AS Rank,
        DepartmentID,
        DepartmentName,
        EmployeeCount,
        CASE WHEN EmployeeCount * @expectedWeeks > 0
             THEN ROUND(CAST(ApprovedWeeks AS FLOAT) / (EmployeeCount * @expectedWeeks) * 100, 1)
             ELSE 0 END AS ComplianceRate,
        CurrentWeekSubmitted,
        CurrentWeekApproved
      FROM DepartmentStats
      WHERE EmployeeCount > 0
      ORDER BY Rank
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.recordset.map((row: any) => ({
    rank: row.Rank,
    departmentId: row.DepartmentID,
    departmentName: row.DepartmentName,
    employeeCount: row.EmployeeCount,
    complianceRate: row.ComplianceRate,
    currentWeekSubmitted: row.CurrentWeekSubmitted,
    currentWeekApproved: row.CurrentWeekApproved,
  }));
}

/**
 * Get company-wide employee leaderboard (top performers)
 */
export async function getCompanyLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  const pool = getPool();
  const currentWeekStart = getCurrentWeekStart();
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yearStartSunday = getYearStartSunday();
  const expectedWeeks = getWeeksBetween(yearStartSunday, currentWeekStart);
  const expectedDays = getWeekdaysBetween(yearStart, today);

  const result = await pool.request()
    .input('yearStart', yearStart.toISOString().split('T')[0])
    .input('currentWeekStart', currentWeekStart.toISOString().split('T')[0])
    .input('today', today.toISOString().split('T')[0])
    .input('expectedWeeks', expectedWeeks)
    .input('expectedDays', expectedDays)
    .input('limit', limit)
    .query(`
      WITH EmployeeMetrics AS (
        SELECT
          u.UserID,
          u.Name AS EmployeeName,

          (SELECT COUNT(*)
           FROM Timesheets t
           WHERE t.UserID = u.UserID
             AND t.Status = 'Approved'
             AND t.PeriodStartDate >= @yearStart
             AND t.PeriodStartDate <= @currentWeekStart) AS ApprovedWeeks,

          (SELECT COUNT(DISTINCT WorkDate)
           FROM TimeEntries te
           WHERE te.UserID = u.UserID
             AND te.WorkDate >= @yearStart
             AND te.WorkDate <= @today) AS ActualDays,

          (SELECT TOP 1 Status
           FROM Timesheets ts
           WHERE ts.UserID = u.UserID
             AND ts.PeriodStartDate = @currentWeekStart) AS CurrentWeekStatus,

          (SELECT COUNT(*)
           FROM (
             SELECT PeriodStartDate,
                    ROW_NUMBER() OVER (ORDER BY PeriodStartDate DESC) AS RowNum,
                    DATEDIFF(WEEK, PeriodStartDate, @currentWeekStart) AS WeeksAgo
             FROM Timesheets
             WHERE UserID = u.UserID AND Status = 'Approved'
           ) streak
           WHERE RowNum = WeeksAgo + 1
          ) AS StreakWeeks

        FROM Users u
        WHERE u.IsActive = 1
      ),
      ScoredEmployees AS (
        SELECT
          UserID,
          EmployeeName,
          ApprovedWeeks,
          ActualDays,
          CurrentWeekStatus,
          StreakWeeks,
          CASE WHEN @expectedWeeks > 0
               THEN CAST(ApprovedWeeks AS FLOAT) / @expectedWeeks * 100
               ELSE 0 END AS WeeklyComplianceRate,
          CASE WHEN @expectedDays > 0
               THEN CAST(ActualDays AS FLOAT) / @expectedDays * 100
               ELSE 0 END AS DailyReportingRate,
          CASE WHEN @expectedWeeks > 0 AND @expectedDays > 0
               THEN (CAST(ApprovedWeeks AS FLOAT) / @expectedWeeks * 60) +
                    (CAST(ActualDays AS FLOAT) / @expectedDays * 40)
               ELSE 0 END AS OverallScore
        FROM EmployeeMetrics
      )
      SELECT
        ROW_NUMBER() OVER (ORDER BY OverallScore DESC) AS Rank,
        UserID,
        EmployeeName,
        ROUND(WeeklyComplianceRate, 1) AS WeeklyComplianceRate,
        ROUND(DailyReportingRate, 1) AS DailyReportingRate,
        ROUND(OverallScore, 1) AS OverallScore,
        ISNULL(CurrentWeekStatus, 'Missing') AS CurrentWeekStatus,
        ISNULL(StreakWeeks, 0) AS StreakWeeks
      FROM ScoredEmployees
      ORDER BY Rank
      OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.recordset.map((row: any) => ({
    rank: row.Rank,
    userId: row.UserID,
    employeeName: row.EmployeeName,
    weeklyComplianceRate: row.WeeklyComplianceRate,
    dailyReportingRate: row.DailyReportingRate,
    overallScore: row.OverallScore,
    currentWeekStatus: row.CurrentWeekStatus,
    streakWeeks: row.StreakWeeks,
  }));
}
