/**
 * Approval Service
 * Business logic for timesheet approval workflows
 */

import * as timesheetRepo from '../repositories/timesheetRepository';
import { orgChartService } from './orgChartService';
import { notificationService } from './notificationService';
import { AppError } from '../middleware/errorHandler';

export const approveTimesheet = async (
  timesheetId: number,
  managerId: number,
  managerEntraId: string
): Promise<void> => {
  // 1. Get timesheet
  const timesheet = await timesheetRepo.findTimesheetById(timesheetId);

  if (!timesheet) {
    throw new AppError(404, 'Timesheet not found');
  }

  if (timesheet.Status !== 'Submitted') {
    throw new AppError(400, 'Only submitted timesheets can be approved');
  }

  // 2. TODO: Verify manager relationship via Entra ID
  // const isManager = await orgChartService.isDirectManager(managerEntraId, employee.entraId);
  // if (!isManager) {
  //   throw new AppError(403, 'You are not authorized to approve this timesheet');
  // }

  // 3. Update timesheet status
  await timesheetRepo.updateTimesheet(timesheetId, {
    Status: 'Approved',
    ApprovedDate: new Date(),
    ApprovedByUserID: managerId,
    IsLocked: true,
  });

  // 4. TODO: Log history and send notification
  // await notificationService.sendTimesheetApproved(employee.email, timesheet);
};

export const returnTimesheet = async (
  timesheetId: number,
  managerId: number,
  returnReason: string
): Promise<void> => {
  if (!returnReason || returnReason.trim().length === 0) {
    throw new AppError(400, 'Return reason is required');
  }

  const timesheet = await timesheetRepo.findTimesheetById(timesheetId);

  if (!timesheet) {
    throw new AppError(404, 'Timesheet not found');
  }

  if (timesheet.Status !== 'Submitted') {
    throw new AppError(400, 'Only submitted timesheets can be returned');
  }

  // Update timesheet status
  await timesheetRepo.updateTimesheet(timesheetId, {
    Status: 'Returned',
    ReturnReason: returnReason,
  });

  // TODO: Send notification with notes
  // await notificationService.sendTimesheetReturned(employee.email, timesheet, returnReason);
};

export const unlockTimesheet = async (
  timesheetId: number,
  adminId: number,
  reason: string
): Promise<void> => {
  if (!reason || reason.trim().length === 0) {
    throw new AppError(400, 'Unlock reason is required');
  }

  const timesheet = await timesheetRepo.findTimesheetById(timesheetId);

  if (!timesheet) {
    throw new AppError(404, 'Timesheet not found');
  }

  // Unlock the timesheet
  await timesheetRepo.updateTimesheet(timesheetId, {
    IsLocked: false,
  });

  // TODO: Log unlock action in audit trail
};
