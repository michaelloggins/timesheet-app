/**
 * Report Controller
 * Provides time entry reports with filtering, grouping, and export capabilities
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getPool } from '../config/database';
import ExcelJS from 'exceljs';

interface TimeEntryReport {
  timeEntryId: number;
  employeeName: string;
  employeeEmail: string;
  departmentName: string;
  projectNumber: string;
  projectName: string;
  projectType: string;
  workDate: string;
  hoursWorked: number;
  workLocation: string;
  notes: string | null;
  timesheetStatus: string;
}

/**
 * Get all time entries with filters
 * GET /api/reports/time-entries
 */
export const getTimeEntries = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const {
    startDate,
    endDate,
    departmentId,
    userId,
    projectId,
    status,
  } = req.query;

  // Default to current month if no dates provided
  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : defaultEndDate;

  let query = `
    SELECT
      te.TimeEntryID,
      u.Name AS EmployeeName,
      u.Email AS EmployeeEmail,
      ISNULL(d.DepartmentName, 'Unassigned') AS DepartmentName,
      p.ProjectNumber,
      p.ProjectName,
      p.ProjectType,
      te.WorkDate,
      te.HoursWorked,
      te.WorkLocation,
      te.Notes,
      t.Status AS TimesheetStatus
    FROM TimeEntries te
    INNER JOIN Users u ON te.UserID = u.UserID
    INNER JOIN Timesheets t ON te.TimesheetID = t.TimesheetID
    INNER JOIN Projects p ON te.ProjectID = p.ProjectID
    LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
    WHERE te.WorkDate >= @startDate
      AND te.WorkDate <= @endDate
      AND u.IsActive = 1
  `;

  const request = pool.request()
    .input('startDate', start.toISOString().split('T')[0])
    .input('endDate', end.toISOString().split('T')[0]);

  if (departmentId) {
    query += ' AND u.DepartmentID = @departmentId';
    request.input('departmentId', parseInt(departmentId as string));
  }

  if (userId) {
    query += ' AND u.UserID = @userId';
    request.input('userId', parseInt(userId as string));
  }

  if (projectId) {
    query += ' AND te.ProjectID = @projectId';
    request.input('projectId', parseInt(projectId as string));
  }

  if (status) {
    query += ' AND t.Status = @status';
    request.input('status', status as string);
  }

  query += ' ORDER BY te.WorkDate DESC, u.Name';

  const result = await request.query(query);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: TimeEntryReport[] = result.recordset.map((row: any) => ({
    timeEntryId: row.TimeEntryID,
    employeeName: row.EmployeeName,
    employeeEmail: row.EmployeeEmail,
    departmentName: row.DepartmentName,
    projectNumber: row.ProjectNumber,
    projectName: row.ProjectName,
    projectType: row.ProjectType,
    workDate: row.WorkDate.toISOString().split('T')[0],
    hoursWorked: parseFloat(row.HoursWorked),
    workLocation: row.WorkLocation,
    notes: row.Notes,
    timesheetStatus: row.TimesheetStatus,
  }));

  res.status(200).json({
    status: 'success',
    data: entries,
    meta: {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalRecords: entries.length,
      totalHours: entries.reduce((sum, e) => sum + e.hoursWorked, 0),
    },
  });
});

/**
 * Get hours by project report
 * GET /api/reports/hours-by-project
 */
export const getHoursByProject = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { startDate, endDate } = req.query;

  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : defaultEndDate;

  const result = await pool.request()
    .input('startDate', start.toISOString().split('T')[0])
    .input('endDate', end.toISOString().split('T')[0])
    .query(`
      SELECT
        p.ProjectID,
        p.ProjectNumber,
        p.ProjectName,
        p.ProjectType,
        COUNT(DISTINCT te.UserID) AS EmployeeCount,
        COUNT(te.TimeEntryID) AS EntryCount,
        SUM(te.HoursWorked) AS TotalHours
      FROM Projects p
      LEFT JOIN TimeEntries te ON p.ProjectID = te.ProjectID
        AND te.WorkDate >= @startDate
        AND te.WorkDate <= @endDate
      WHERE p.IsActive = 1
      GROUP BY p.ProjectID, p.ProjectNumber, p.ProjectName, p.ProjectType
      HAVING SUM(te.HoursWorked) > 0
      ORDER BY TotalHours DESC
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = result.recordset.map((row: any) => ({
    projectId: row.ProjectID,
    projectNumber: row.ProjectNumber,
    projectName: row.ProjectName,
    projectType: row.ProjectType,
    employeeCount: row.EmployeeCount,
    entryCount: row.EntryCount,
    totalHours: parseFloat(row.TotalHours),
  }));

  res.status(200).json({
    status: 'success',
    data: projects,
  });
});

/**
 * Get grant report (hours by grant with funding details)
 * GET /api/reports/grant-report
 */
export const getGrantReport = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { startDate, endDate } = req.query;

  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), 0, 1); // YTD
  const defaultEndDate = today;

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : defaultEndDate;

  const result = await pool.request()
    .input('startDate', start.toISOString().split('T')[0])
    .input('endDate', end.toISOString().split('T')[0])
    .query(`
      SELECT
        p.ProjectID,
        p.ProjectNumber,
        p.ProjectName,
        p.GrantCode,
        p.FundingSource,
        COUNT(DISTINCT te.UserID) AS EmployeeCount,
        SUM(te.HoursWorked) AS TotalHours
      FROM Projects p
      INNER JOIN TimeEntries te ON p.ProjectID = te.ProjectID
        AND te.WorkDate >= @startDate
        AND te.WorkDate <= @endDate
      WHERE p.ProjectType = 'Grant'
        AND p.IsActive = 1
      GROUP BY p.ProjectID, p.ProjectNumber, p.ProjectName, p.GrantCode, p.FundingSource
      ORDER BY TotalHours DESC
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grants = result.recordset.map((row: any) => ({
    projectId: row.ProjectID,
    projectNumber: row.ProjectNumber,
    projectName: row.ProjectName,
    grantCode: row.GrantCode,
    fundingSource: row.FundingSource,
    employeeCount: row.EmployeeCount,
    totalHours: parseFloat(row.TotalHours),
  }));

  res.status(200).json({
    status: 'success',
    data: grants,
  });
});

/**
 * Export time entries to Excel
 * POST /api/reports/export
 */
export const exportToExcel = asyncHandler(async (req: Request, res: Response) => {
  // Only TimesheetAdmin can export
  if (req.user!.role !== 'TimesheetAdmin' && req.user!.role !== 'Leadership') {
    res.status(403).json({ status: 'error', message: 'Only administrators can export data' });
    return;
  }

  const pool = getPool();
  const { startDate, endDate } = req.body;

  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  const result = await pool.request()
    .input('startDate', start.toISOString().split('T')[0])
    .input('endDate', end.toISOString().split('T')[0])
    .query(`
      SELECT
        u.Name AS EmployeeName,
        u.Email AS EmployeeEmail,
        ISNULL(d.DepartmentName, 'Unassigned') AS DepartmentName,
        p.ProjectNumber,
        p.ProjectName,
        p.ProjectType,
        te.WorkDate,
        te.HoursWorked,
        te.WorkLocation,
        te.Notes,
        t.Status AS TimesheetStatus
      FROM TimeEntries te
      INNER JOIN Users u ON te.UserID = u.UserID
      INNER JOIN Timesheets t ON te.TimesheetID = t.TimesheetID
      INNER JOIN Projects p ON te.ProjectID = p.ProjectID
      LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
      WHERE te.WorkDate >= @startDate
        AND te.WorkDate <= @endDate
      ORDER BY te.WorkDate, u.Name
    `);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MiraVista Timesheet';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Time Entries');

  // Define columns
  sheet.columns = [
    { header: 'Employee', key: 'employeeName', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Project #', key: 'projectNumber', width: 15 },
    { header: 'Project Name', key: 'projectName', width: 30 },
    { header: 'Type', key: 'projectType', width: 12 },
    { header: 'Date', key: 'workDate', width: 12 },
    { header: 'Hours', key: 'hours', width: 10 },
    { header: 'Location', key: 'location', width: 12 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF8BC34A' },
  };

  // Add data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result.recordset.forEach((row: any) => {
    sheet.addRow({
      employeeName: row.EmployeeName,
      email: row.EmployeeEmail,
      department: row.DepartmentName,
      projectNumber: row.ProjectNumber,
      projectName: row.ProjectName,
      projectType: row.ProjectType,
      workDate: row.WorkDate.toISOString().split('T')[0],
      hours: parseFloat(row.HoursWorked),
      location: row.WorkLocation,
      notes: row.Notes || '',
      status: row.TimesheetStatus,
    });
  });

  // Add totals row
  const totalRow = sheet.addRow({
    employeeName: 'TOTAL',
    hours: result.recordset.reduce((sum: number, r: any) => sum + parseFloat(r.HoursWorked), 0),
  });
  totalRow.font = { bold: true };

  // Generate buffer and send
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=time-entries-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.xlsx`);
  res.send(buffer);
});

/**
 * Get employee summary
 * GET /api/reports/employee-summary
 */
export const getEmployeeSummary = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const userId = req.user!.userId;
  const { startDate, endDate } = req.query;

  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const start = startDate ? new Date(startDate as string) : defaultStartDate;
  const end = endDate ? new Date(endDate as string) : defaultEndDate;

  const result = await pool.request()
    .input('userId', userId)
    .input('startDate', start.toISOString().split('T')[0])
    .input('endDate', end.toISOString().split('T')[0])
    .query(`
      SELECT
        p.ProjectNumber,
        p.ProjectName,
        p.ProjectType,
        SUM(te.HoursWorked) AS TotalHours,
        COUNT(DISTINCT te.WorkDate) AS DaysWorked
      FROM TimeEntries te
      INNER JOIN Projects p ON te.ProjectID = p.ProjectID
      WHERE te.UserID = @userId
        AND te.WorkDate >= @startDate
        AND te.WorkDate <= @endDate
      GROUP BY p.ProjectNumber, p.ProjectName, p.ProjectType
      ORDER BY TotalHours DESC
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary = result.recordset.map((row: any) => ({
    projectNumber: row.ProjectNumber,
    projectName: row.ProjectName,
    projectType: row.ProjectType,
    totalHours: parseFloat(row.TotalHours),
    daysWorked: row.DaysWorked,
  }));

  res.status(200).json({
    status: 'success',
    data: summary,
    meta: {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalHours: summary.reduce((sum, s) => sum + s.totalHours, 0),
    },
  });
});

/**
 * Get filter options (departments, projects, users for dropdowns)
 * GET /api/reports/filter-options
 */
export const getFilterOptions = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();

  const [departments, projects, users] = await Promise.all([
    pool.request().query(`
      SELECT DepartmentID, DepartmentName
      FROM Departments
      WHERE IsActive = 1
      ORDER BY DepartmentName
    `),
    pool.request().query(`
      SELECT ProjectID, ProjectNumber, ProjectName, ProjectType
      FROM Projects
      WHERE IsActive = 1
      ORDER BY ProjectNumber
    `),
    pool.request().query(`
      SELECT UserID, Name, Email
      FROM Users
      WHERE IsActive = 1
      ORDER BY Name
    `),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      departments: departments.recordset.map((d: any) => ({
        departmentId: d.DepartmentID,
        departmentName: d.DepartmentName,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projects: projects.recordset.map((p: any) => ({
        projectId: p.ProjectID,
        projectNumber: p.ProjectNumber,
        projectName: p.ProjectName,
        projectType: p.ProjectType,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      users: users.recordset.map((u: any) => ({
        userId: u.UserID,
        name: u.Name,
        email: u.Email,
      })),
    },
  });
});
