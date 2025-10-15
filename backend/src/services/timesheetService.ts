/**
 * Timesheet Service
 * Business logic for timesheet operations
 */

import * as timesheetRepo from '../repositories/timesheetRepository';
import { Timesheet } from '../models/types';
import { AppError } from '../middleware/errorHandler';

export const submitTimesheet = async (timesheetId: number, userId: number): Promise<void> => {
  // 1. Validate timesheet belongs to user
  const timesheet = await timesheetRepo.findTimesheetById(timesheetId);

  if (!timesheet) {
    throw new AppError(404, 'Timesheet not found');
  }

  if (timesheet.UserID !== userId) {
    throw new AppError(403, 'Cannot submit another user\'s timesheet');
  }

  if (timesheet.Status !== 'Draft') {
    throw new AppError(400, 'Only draft timesheets can be submitted');
  }

  // 2. TODO: Validate timesheet completeness

  // 3. Update status to Submitted
  await timesheetRepo.updateTimesheet(timesheetId, {
    Status: 'Submitted',
    SubmittedDate: new Date(),
  });

  // 4. Get manager from Entra ID and send notification
  // TODO: Implement manager lookup and notification
  // const manager = await orgChartService.getDirectManager(user.entraId);
  // await notificationService.sendTimesheetSubmitted(manager.email, timesheet);
};

export const validateTimesheetOwnership = async (
  timesheetId: number,
  userId: number
): Promise<Timesheet> => {
  const timesheet = await timesheetRepo.findTimesheetById(timesheetId);

  if (!timesheet) {
    throw new AppError(404, 'Timesheet not found');
  }

  if (timesheet.UserID !== userId) {
    throw new AppError(403, 'Access denied');
  }

  return timesheet;
};

export const canEditTimesheet = (timesheet: Timesheet): boolean => {
  return timesheet.Status === 'Draft' || timesheet.Status === 'Returned';
};
