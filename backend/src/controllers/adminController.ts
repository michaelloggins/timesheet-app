import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { userSyncService } from '../services/userSyncService';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import { logAdminAction, logUserSync } from '../utils/adminAuditLogger';

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query(`
    SELECT u.UserID, u.EntraIDObjectID, u.EmployeeID, u.Email, u.Name, u.Title,
           u.DepartmentID, u.Role, u.IsActive, u.ManagerEntraID, u.WorkWeekPattern,
           u.CreatedDate, u.LastLoginDate, u.DeactivatedDate, u.DeactivationReason,
           d.DepartmentName,
           m.Name as ManagerName, m.Email as ManagerEmail
    FROM Users u
    LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
    LEFT JOIN Users m ON u.ManagerEntraID = m.EntraIDObjectID
    ORDER BY u.IsActive DESC, u.Name
  `);
  res.status(200).json({ status: 'success', data: result.recordset });
});

export const syncUsersFromEntra = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  logger.info('Starting user sync from Entra ID groups...');
  const result = await userSyncService.syncUsersFromGroups();

  // Log the sync action
  await logUserSync(
    user.userId,
    result,
    req.ip || req.socket.remoteAddress
  );

  const status = result.errors.length === 0 ? 'success' : 'partial';
  res.status(200).json({
    status,
    message: `Sync complete: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated`,
    data: result,
  });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(201).json({ status: 'success', message: 'To be implemented' });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(200).json({ status: 'success', message: 'To be implemented' });
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(200).json({ status: 'success', message: 'To be implemented' });
});

export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query(`
    SELECT d.DepartmentID, d.DepartmentCode, d.DepartmentName, d.IsActive,
           d.CreatedDate, d.ModifiedDate,
           (SELECT COUNT(*) FROM Users u WHERE u.DepartmentID = d.DepartmentID AND u.IsActive = 1) as UserCount,
           (SELECT COUNT(*) FROM Projects p WHERE p.DepartmentID = d.DepartmentID AND p.IsActive = 1) as ProjectCount
    FROM Departments d
    ORDER BY d.DepartmentName
  `);
  res.status(200).json({ status: 'success', data: result.recordset });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const user = req.user!;
  const { departmentCode, departmentName, isActive = true } = req.body;

  if (!departmentCode || !departmentName) {
    res.status(400).json({ status: 'error', message: 'Department code and name are required' });
    return;
  }

  // Check for duplicate code
  const existing = await pool.request()
    .input('code', departmentCode)
    .query('SELECT DepartmentID FROM Departments WHERE DepartmentCode = @code');

  if (existing.recordset.length > 0) {
    res.status(400).json({ status: 'error', message: 'Department code already exists' });
    return;
  }

  const result = await pool.request()
    .input('code', departmentCode)
    .input('name', departmentName)
    .input('isActive', isActive)
    .query(`
      INSERT INTO Departments (DepartmentCode, DepartmentName, IsActive)
      VALUES (@code, @name, @isActive);
      SELECT SCOPE_IDENTITY() AS DepartmentID;
    `);

  const departmentId = result.recordset[0].DepartmentID;
  logger.info(`Created department: ${departmentName} (${departmentCode})`);

  // Log admin action
  await logAdminAction({
    actionType: 'DEPARTMENT_CREATE',
    actionByUserId: user.userId,
    entityType: 'Department',
    entityId: departmentId,
    entityName: `${departmentCode} - ${departmentName}`,
    ipAddress: req.ip || req.socket.remoteAddress,
  });

  res.status(201).json({
    status: 'success',
    data: {
      departmentId,
      departmentCode,
      departmentName,
      isActive,
    },
  });
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const user = req.user!;
  const departmentId = parseInt(req.params.id);
  const { departmentCode, departmentName, isActive } = req.body;

  // Check if department exists
  const existing = await pool.request()
    .input('id', departmentId)
    .query('SELECT DepartmentID, DepartmentCode, DepartmentName FROM Departments WHERE DepartmentID = @id');

  if (existing.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Department not found' });
    return;
  }

  // Check for duplicate code (excluding current department)
  if (departmentCode) {
    const duplicate = await pool.request()
      .input('code', departmentCode)
      .input('id', departmentId)
      .query('SELECT DepartmentID FROM Departments WHERE DepartmentCode = @code AND DepartmentID != @id');

    if (duplicate.recordset.length > 0) {
      res.status(400).json({ status: 'error', message: 'Department code already exists' });
      return;
    }
  }

  await pool.request()
    .input('id', departmentId)
    .input('code', departmentCode)
    .input('name', departmentName)
    .input('isActive', isActive)
    .query(`
      UPDATE Departments
      SET DepartmentCode = COALESCE(@code, DepartmentCode),
          DepartmentName = COALESCE(@name, DepartmentName),
          IsActive = COALESCE(@isActive, IsActive),
          ModifiedDate = GETUTCDATE()
      WHERE DepartmentID = @id
    `);

  logger.info(`Updated department ${departmentId}`);

  // Fetch updated department
  const updated = await pool.request()
    .input('id', departmentId)
    .query('SELECT * FROM Departments WHERE DepartmentID = @id');

  // Log admin action
  await logAdminAction({
    actionType: 'DEPARTMENT_UPDATE',
    actionByUserId: user.userId,
    entityType: 'Department',
    entityId: departmentId,
    entityName: updated.recordset[0].DepartmentName,
    details: { departmentCode, departmentName, isActive },
    ipAddress: req.ip || req.socket.remoteAddress,
  });

  res.status(200).json({ status: 'success', data: updated.recordset[0] });
});

export const importProjects = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement Excel import
  res.status(200).json({ status: 'success', message: 'To be implemented' });
});

export const importTimesheets = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement Excel import
  res.status(200).json({ status: 'success', message: 'To be implemented' });
});

export const getSystemConfig = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query('SELECT ConfigKey, ConfigValue, Description FROM SystemConfig');

  // Convert to key-value object for easier frontend use
  const config: Record<string, string> = {};
  for (const row of result.recordset) {
    config[row.ConfigKey] = row.ConfigValue;
  }

  res.status(200).json({ status: 'success', data: config });
});

export const updateSystemConfig = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { key, value, description } = req.body;

  if (!key) {
    res.status(400).json({ status: 'error', message: 'Config key is required' });
    return;
  }

  await pool.request()
    .input('key', key)
    .input('value', value)
    .input('desc', description)
    .query(`
      MERGE SystemConfig AS target
      USING (SELECT @key AS ConfigKey) AS source
      ON target.ConfigKey = source.ConfigKey
      WHEN MATCHED THEN
        UPDATE SET ConfigValue = @value, Description = COALESCE(@desc, Description), ModifiedDate = GETUTCDATE()
      WHEN NOT MATCHED THEN
        INSERT (ConfigKey, ConfigValue, Description)
        VALUES (@key, @value, @desc);
    `);

  logger.info(`Updated system config: ${key}`);
  res.status(200).json({ status: 'success', message: 'Configuration updated' });
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();

  // Query parameters for filtering
  const {
    days = 30,      // Default to last 30 days
    userId,         // Filter by specific user
    action,         // Filter by action type
    limit = 100     // Max records to return
  } = req.query;

  const request = pool.request()
    .input('days', parseInt(days as string))
    .input('limit', Math.min(parseInt(limit as string), 500)); // Cap at 500

  let whereClause = 'WHERE h.ActionDate >= DATEADD(DAY, -@days, GETUTCDATE())';

  if (userId) {
    request.input('userId', parseInt(userId as string));
    whereClause += ' AND (t.UserID = @userId OR h.ActionByUserID = @userId)';
  }

  if (action) {
    request.input('action', action);
    whereClause += ' AND h.Action = @action';
  }

  const result = await request.query(`
    SELECT TOP (@limit)
      h.HistoryID,
      h.TimesheetID,
      h.Action,
      h.ActionDate,
      h.Notes,
      h.PreviousStatus,
      h.NewStatus,
      h.ActionByUserID,
      actor.Name AS ActionByName,
      actor.Email AS ActionByEmail,
      t.UserID AS TimesheetOwnerID,
      owner.Name AS TimesheetOwnerName,
      t.PeriodStartDate,
      t.PeriodEndDate
    FROM TimesheetHistory h
    INNER JOIN Users actor ON h.ActionByUserID = actor.UserID
    LEFT JOIN Timesheets t ON h.TimesheetID = t.TimesheetID
    LEFT JOIN Users owner ON t.UserID = owner.UserID
    ${whereClause}
    ORDER BY h.ActionDate DESC
  `);

  res.status(200).json({
    status: 'success',
    data: result.recordset.map(row => ({
      historyId: row.HistoryID,
      timesheetId: row.TimesheetID,
      action: row.Action,
      actionDate: row.ActionDate,
      notes: row.Notes,
      previousStatus: row.PreviousStatus,
      newStatus: row.NewStatus,
      actionBy: {
        userId: row.ActionByUserID,
        name: row.ActionByName,
        email: row.ActionByEmail,
      },
      timesheetOwner: row.TimesheetOwnerID ? {
        userId: row.TimesheetOwnerID,
        name: row.TimesheetOwnerName,
      } : null,
      periodStartDate: row.PeriodStartDate,
      periodEndDate: row.PeriodEndDate,
    }))
  });
});

/**
 * Get admin audit logs (admin actions like sync, CRUD operations)
 */
export const getAdminAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { days = 30, actionType, limit = 100 } = req.query;

  const request = pool.request()
    .input('days', parseInt(days as string))
    .input('limit', Math.min(parseInt(limit as string), 500));

  let whereClause = 'WHERE a.ActionDate >= DATEADD(DAY, -@days, GETUTCDATE())';

  if (actionType) {
    request.input('actionType', actionType);
    whereClause += ' AND a.ActionType = @actionType';
  }

  const result = await request.query(`
    SELECT TOP (@limit)
      a.AuditID,
      a.ActionType,
      a.ActionDate,
      a.EntityType,
      a.EntityID,
      a.EntityName,
      a.Details,
      a.IPAddress,
      a.ActionByUserID,
      u.Name AS ActionByName,
      u.Email AS ActionByEmail
    FROM AdminAuditLog a
    INNER JOIN Users u ON a.ActionByUserID = u.UserID
    ${whereClause}
    ORDER BY a.ActionDate DESC
  `);

  res.status(200).json({
    status: 'success',
    data: result.recordset.map(row => ({
      auditId: row.AuditID,
      actionType: row.ActionType,
      actionDate: row.ActionDate,
      entityType: row.EntityType,
      entityId: row.EntityID,
      entityName: row.EntityName,
      details: row.Details ? JSON.parse(row.Details) : null,
      ipAddress: row.IPAddress,
      actionBy: {
        userId: row.ActionByUserID,
        name: row.ActionByName,
        email: row.ActionByEmail,
      },
    })),
  });
});

/**
 * Get all holidays
 */
export const getHolidays = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const { year } = req.query;

  let query = 'SELECT * FROM Holidays WHERE IsActive = 1';
  if (year) {
    query += ` AND YEAR(HolidayDate) = ${parseInt(year as string)}`;
  }
  query += ' ORDER BY HolidayDate';

  const result = await pool.request().query(query);
  res.status(200).json({ status: 'success', data: result.recordset });
});

/**
 * Create a holiday
 */
export const createHoliday = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const user = req.user!;
  const { holidayName, holidayDate, defaultHours = 8.0 } = req.body;

  if (!holidayName || !holidayDate) {
    res.status(400).json({ status: 'error', message: 'Holiday name and date are required' });
    return;
  }

  // Check for duplicate date
  const existing = await pool.request()
    .input('date', new Date(holidayDate))
    .query('SELECT HolidayID FROM Holidays WHERE HolidayDate = @date');

  if (existing.recordset.length > 0) {
    res.status(400).json({ status: 'error', message: 'A holiday already exists for this date' });
    return;
  }

  const result = await pool.request()
    .input('name', holidayName)
    .input('date', new Date(holidayDate))
    .input('hours', defaultHours)
    .query(`
      INSERT INTO Holidays (HolidayName, HolidayDate, DefaultHours)
      VALUES (@name, @date, @hours);
      SELECT SCOPE_IDENTITY() AS HolidayID;
    `);

  const holidayId = result.recordset[0].HolidayID;
  logger.info(`Created holiday: ${holidayName} on ${holidayDate}`);

  // Log admin action
  await logAdminAction({
    actionType: 'HOLIDAY_CREATE',
    actionByUserId: user.userId,
    entityType: 'Holiday',
    entityId: holidayId,
    entityName: holidayName,
    details: { holidayDate, defaultHours },
    ipAddress: req.ip || req.socket.remoteAddress,
  });

  res.status(201).json({
    status: 'success',
    data: {
      holidayId,
      holidayName,
      holidayDate,
      defaultHours,
    },
  });
});

/**
 * Update a holiday
 */
export const updateHoliday = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const user = req.user!;
  const holidayId = parseInt(req.params.id);
  const { holidayName, holidayDate, defaultHours } = req.body;

  const existing = await pool.request()
    .input('id', holidayId)
    .query('SELECT HolidayID, HolidayName FROM Holidays WHERE HolidayID = @id');

  if (existing.recordset.length === 0) {
    res.status(404).json({ status: 'error', message: 'Holiday not found' });
    return;
  }

  // Check for duplicate date (excluding current)
  if (holidayDate) {
    const duplicate = await pool.request()
      .input('date', new Date(holidayDate))
      .input('id', holidayId)
      .query('SELECT HolidayID FROM Holidays WHERE HolidayDate = @date AND HolidayID != @id');

    if (duplicate.recordset.length > 0) {
      res.status(400).json({ status: 'error', message: 'A holiday already exists for this date' });
      return;
    }
  }

  await pool.request()
    .input('id', holidayId)
    .input('name', holidayName)
    .input('date', holidayDate ? new Date(holidayDate) : null)
    .input('hours', defaultHours)
    .query(`
      UPDATE Holidays
      SET HolidayName = COALESCE(@name, HolidayName),
          HolidayDate = COALESCE(@date, HolidayDate),
          DefaultHours = COALESCE(@hours, DefaultHours),
          ModifiedDate = GETUTCDATE()
      WHERE HolidayID = @id
    `);

  const updated = await pool.request()
    .input('id', holidayId)
    .query('SELECT * FROM Holidays WHERE HolidayID = @id');

  // Log admin action
  await logAdminAction({
    actionType: 'HOLIDAY_UPDATE',
    actionByUserId: user.userId,
    entityType: 'Holiday',
    entityId: holidayId,
    entityName: updated.recordset[0].HolidayName,
    details: { holidayName, holidayDate, defaultHours },
    ipAddress: req.ip || req.socket.remoteAddress,
  });

  res.status(200).json({ status: 'success', data: updated.recordset[0] });
});

/**
 * Delete (deactivate) a holiday
 */
export const deleteHoliday = asyncHandler(async (req: Request, res: Response) => {
  const pool = getPool();
  const user = req.user!;
  const holidayId = parseInt(req.params.id);

  // Get holiday name for audit log
  const existing = await pool.request()
    .input('id', holidayId)
    .query('SELECT HolidayName FROM Holidays WHERE HolidayID = @id');

  await pool.request()
    .input('id', holidayId)
    .query('UPDATE Holidays SET IsActive = 0, ModifiedDate = GETUTCDATE() WHERE HolidayID = @id');

  // Log admin action
  await logAdminAction({
    actionType: 'HOLIDAY_DELETE',
    actionByUserId: user.userId,
    entityType: 'Holiday',
    entityId: holidayId,
    entityName: existing.recordset[0]?.HolidayName || `Holiday ${holidayId}`,
    ipAddress: req.ip || req.socket.remoteAddress,
  });

  res.status(200).json({ status: 'success', message: 'Holiday deleted' });
});
