-- =============================================
-- MiraVista Timesheet System - Semantic Views
-- For Power BI Integration and Reporting
-- =============================================

USE TimesheetDB;
GO

-- =============================================
-- 1. Fact Time Entries View
-- Denormalized view for reporting
-- =============================================
CREATE OR ALTER VIEW vw_FactTimeEntries AS
SELECT
    te.TimeEntryID,
    te.TimesheetID,
    te.WorkDate,
    te.HoursWorked,
    te.WorkLocation,
    te.Notes,

    -- User dimensions
    u.UserID,
    u.Name AS EmployeeName,
    u.Email AS EmployeeEmail,
    u.EntraIDObjectID,

    -- Department dimensions
    d.DepartmentID,
    d.DepartmentCode,
    d.DepartmentName,

    -- Project dimensions
    p.ProjectID,
    p.ProjectNumber,
    p.ProjectName,
    p.ProjectType,
    p.GrantIdentifier,

    -- Timesheet dimensions
    ts.Status AS TimesheetStatus,
    ts.PeriodStartDate,
    ts.PeriodEndDate,
    ts.SubmittedDate,
    ts.ApprovedDate,
    ts.ApprovedByUserID,

    -- Approver dimensions
    approver.Name AS ApproverName,
    approver.Email AS ApproverEmail,

    -- Date dimensions
    YEAR(te.WorkDate) AS WorkYear,
    MONTH(te.WorkDate) AS WorkMonth,
    DATENAME(MONTH, te.WorkDate) AS WorkMonthName,
    DAY(te.WorkDate) AS WorkDay,
    DATEPART(WEEK, te.WorkDate) AS WorkWeek,
    DATENAME(WEEKDAY, te.WorkDate) AS WorkDayName,

    te.CreatedDate,
    te.ModifiedDate

FROM TimeEntries te
INNER JOIN Users u ON te.UserID = u.UserID
INNER JOIN Departments d ON u.DepartmentID = d.DepartmentID
INNER JOIN Projects p ON te.ProjectID = p.ProjectID
INNER JOIN Timesheets ts ON te.TimesheetID = ts.TimesheetID
LEFT JOIN Users approver ON ts.ApprovedByUserID = approver.UserID;
GO

-- =============================================
-- 2. Department Scoreboard View
-- Real-time compliance metrics
-- =============================================
CREATE OR ALTER VIEW vw_DepartmentScoreboard AS
WITH CurrentWeek AS (
    SELECT
        DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE)) AS WeekStart,
        DATEADD(DAY, 7 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE)) AS WeekEnd
)
SELECT
    d.DepartmentID,
    d.DepartmentCode,
    d.DepartmentName,

    COUNT(DISTINCT u.UserID) AS TotalEmployees,

    COUNT(DISTINCT CASE
        WHEN ts.Status IN ('Submitted', 'Approved') THEN u.UserID
    END) AS SubmittedCount,

    COUNT(DISTINCT CASE
        WHEN ts.Status = 'Approved' THEN u.UserID
    END) AS ApprovedCount,

    CAST(
        CASE
            WHEN COUNT(DISTINCT u.UserID) > 0 THEN
                (COUNT(DISTINCT CASE WHEN ts.Status IN ('Submitted', 'Approved') THEN u.UserID END) * 100.0)
                / COUNT(DISTINCT u.UserID)
            ELSE 0
        END AS DECIMAL(5,2)
    ) AS CompletionRate,

    -- RAG Status
    CASE
        WHEN CAST(
                (COUNT(DISTINCT CASE WHEN ts.Status IN ('Submitted', 'Approved') THEN u.UserID END) * 100.0)
                / NULLIF(COUNT(DISTINCT u.UserID), 0)
            AS DECIMAL(5,2)) >= 90 THEN 'green'
        WHEN CAST(
                (COUNT(DISTINCT CASE WHEN ts.Status IN ('Submitted', 'Approved') THEN u.UserID END) * 100.0)
                / NULLIF(COUNT(DISTINCT u.UserID), 0)
            AS DECIMAL(5,2)) >= 70 THEN 'amber'
        ELSE 'red'
    END AS RAGStatus,

    (SELECT WeekStart FROM CurrentWeek) AS CurrentWeekStart,
    (SELECT WeekEnd FROM CurrentWeek) AS CurrentWeekEnd

FROM Departments d
INNER JOIN Users u ON d.DepartmentID = u.DepartmentID AND u.IsActive = 1
LEFT JOIN Timesheets ts ON u.UserID = ts.UserID
    AND ts.PeriodStartDate = (SELECT WeekStart FROM CurrentWeek)
WHERE d.IsActive = 1
GROUP BY d.DepartmentID, d.DepartmentCode, d.DepartmentName;
GO

-- =============================================
-- 3. Leadership KPIs View
-- Executive dashboard metrics
-- =============================================
CREATE OR ALTER VIEW vw_LeadershipKPIs AS
WITH CurrentWeek AS (
    SELECT
        DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE)) AS WeekStart,
        DATEADD(DAY, 7 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE)) AS WeekEnd
)
SELECT
    -- Overall completion rate
    (SELECT COUNT(DISTINCT ts.UserID)
     FROM Timesheets ts
     WHERE ts.Status IN ('Submitted', 'Approved')
       AND ts.PeriodStartDate = (SELECT WeekStart FROM CurrentWeek)) * 100.0
    / NULLIF((SELECT COUNT(*) FROM Users WHERE IsActive = 1), 0) AS OverallCompletionRate,

    -- Pending approvals count
    (SELECT COUNT(*)
     FROM Timesheets
     WHERE Status = 'Submitted') AS PendingApprovalsCount,

    -- Average approval time (hours)
    (SELECT AVG(DATEDIFF(HOUR, SubmittedDate, ApprovedDate))
     FROM Timesheets
     WHERE Status = 'Approved'
       AND SubmittedDate IS NOT NULL
       AND ApprovedDate IS NOT NULL
       AND ApprovedDate >= DATEADD(DAY, -30, GETDATE())) AS AvgApprovalTimeHours,

    -- Return rate (%)
    (SELECT COUNT(CASE WHEN Status = 'Returned' THEN 1 END) * 100.0
     / NULLIF(COUNT(*), 0)
     FROM Timesheets
     WHERE CreatedDate >= DATEADD(DAY, -30, GETDATE())) AS ReturnRate,

    -- Active users count
    (SELECT COUNT(*) FROM Users WHERE IsActive = 1) AS TotalActiveUsers,

    -- Total hours logged this month
    (SELECT SUM(HoursWorked)
     FROM TimeEntries
     WHERE MONTH(WorkDate) = MONTH(GETDATE())
       AND YEAR(WorkDate) = YEAR(GETDATE())) AS TotalHoursThisMonth,

    (SELECT WeekStart FROM CurrentWeek) AS CurrentWeekStart,
    (SELECT WeekEnd FROM CurrentWeek) AS CurrentWeekEnd,
    GETUTCDATE() AS LastUpdated;
GO

-- =============================================
-- 4. Monthly Hours by Project View
-- =============================================
CREATE OR ALTER VIEW vw_MonthlyHoursByProject AS
SELECT
    YEAR(te.WorkDate) AS Year,
    MONTH(te.WorkDate) AS Month,
    DATENAME(MONTH, te.WorkDate) AS MonthName,

    p.ProjectID,
    p.ProjectNumber,
    p.ProjectName,
    p.ProjectType,
    p.GrantIdentifier,

    d.DepartmentID,
    d.DepartmentCode,
    d.DepartmentName,

    COUNT(DISTINCT te.UserID) AS EmployeeCount,
    SUM(te.HoursWorked) AS TotalHours,
    AVG(te.HoursWorked) AS AvgHoursPerEntry,
    COUNT(te.TimeEntryID) AS EntryCount

FROM TimeEntries te
INNER JOIN Projects p ON te.ProjectID = p.ProjectID
INNER JOIN Users u ON te.UserID = u.UserID
INNER JOIN Departments d ON u.DepartmentID = d.DepartmentID
INNER JOIN Timesheets ts ON te.TimesheetID = ts.TimesheetID
WHERE ts.Status = 'Approved'
GROUP BY
    YEAR(te.WorkDate),
    MONTH(te.WorkDate),
    DATENAME(MONTH, te.WorkDate),
    p.ProjectID,
    p.ProjectNumber,
    p.ProjectName,
    p.ProjectType,
    p.GrantIdentifier,
    d.DepartmentID,
    d.DepartmentCode,
    d.DepartmentName;
GO

-- =============================================
-- 5. Grant Report View
-- =============================================
CREATE OR ALTER VIEW vw_GrantReport AS
SELECT
    p.GrantIdentifier,
    p.ProjectNumber,
    p.ProjectName,

    u.UserID,
    u.Name AS EmployeeName,
    u.Email AS EmployeeEmail,

    d.DepartmentName,

    te.WorkDate,
    te.HoursWorked,
    te.WorkLocation,

    YEAR(te.WorkDate) AS Year,
    MONTH(te.WorkDate) AS Month,
    DATENAME(MONTH, te.WorkDate) AS MonthName,

    ts.ApprovedDate,
    approver.Name AS ApprovedByName

FROM TimeEntries te
INNER JOIN Projects p ON te.ProjectID = p.ProjectID
INNER JOIN Users u ON te.UserID = u.UserID
INNER JOIN Departments d ON u.DepartmentID = d.DepartmentID
INNER JOIN Timesheets ts ON te.TimesheetID = ts.TimesheetID
LEFT JOIN Users approver ON ts.ApprovedByUserID = approver.UserID
WHERE p.GrantIdentifier IS NOT NULL
  AND ts.Status = 'Approved';
GO

-- =============================================
-- 6. Employee Compliance Trends View
-- =============================================
CREATE OR ALTER VIEW vw_EmployeeComplianceTrends AS
SELECT
    u.UserID,
    u.Name AS EmployeeName,
    u.Email,
    d.DepartmentName,

    ts.PeriodStartDate,
    ts.PeriodEndDate,
    ts.Status,
    ts.SubmittedDate,
    ts.ApprovedDate,

    CASE
        WHEN ts.SubmittedDate IS NULL THEN NULL
        WHEN ts.SubmittedDate <= DATEADD(DAY, 2, ts.PeriodEndDate) THEN 'OnTime'
        ELSE 'Late'
    END AS SubmissionTimeliness,

    DATEDIFF(DAY, ts.PeriodEndDate, ISNULL(ts.SubmittedDate, GETDATE())) AS DaysUntilSubmission,

    SUM(te.HoursWorked) AS TotalHours,
    COUNT(DISTINCT te.WorkDate) AS DaysWorked

FROM Users u
INNER JOIN Departments d ON u.DepartmentID = d.DepartmentID
LEFT JOIN Timesheets ts ON u.UserID = ts.UserID
LEFT JOIN TimeEntries te ON ts.TimesheetID = te.TimesheetID
WHERE u.IsActive = 1
GROUP BY
    u.UserID,
    u.Name,
    u.Email,
    d.DepartmentName,
    ts.PeriodStartDate,
    ts.PeriodEndDate,
    ts.Status,
    ts.SubmittedDate,
    ts.ApprovedDate;
GO

-- =============================================
-- 7. Manager Performance View
-- =============================================
CREATE OR ALTER VIEW vw_ManagerPerformance AS
SELECT
    approver.UserID AS ManagerID,
    approver.Name AS ManagerName,
    approver.Email AS ManagerEmail,
    d.DepartmentName,

    COUNT(DISTINCT ts.TimesheetID) AS TotalApprovals,

    AVG(DATEDIFF(HOUR, ts.SubmittedDate, ts.ApprovedDate)) AS AvgApprovalTimeHours,

    COUNT(CASE WHEN DATEDIFF(DAY, ts.SubmittedDate, ts.ApprovedDate) <= 2 THEN 1 END) AS ApprovalsWithin48Hours,

    COUNT(CASE WHEN DATEDIFF(DAY, ts.SubmittedDate, ts.ApprovedDate) > 7 THEN 1 END) AS ApprovalsOver7Days,

    YEAR(ts.ApprovedDate) AS Year,
    MONTH(ts.ApprovedDate) AS Month,
    DATENAME(MONTH, ts.ApprovedDate) AS MonthName

FROM Timesheets ts
INNER JOIN Users approver ON ts.ApprovedByUserID = approver.UserID
INNER JOIN Departments d ON approver.DepartmentID = d.DepartmentID
WHERE ts.Status = 'Approved'
  AND ts.SubmittedDate IS NOT NULL
  AND ts.ApprovedDate IS NOT NULL
GROUP BY
    approver.UserID,
    approver.Name,
    approver.Email,
    d.DepartmentName,
    YEAR(ts.ApprovedDate),
    MONTH(ts.ApprovedDate),
    DATENAME(MONTH, ts.ApprovedDate);
GO

PRINT 'Views created successfully!';
