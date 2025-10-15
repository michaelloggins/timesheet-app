import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

export const getHoursByProject = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(200).json({ status: 'success', data: [], message: 'To be implemented' });
});

export const getGrantReport = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(200).json({ status: 'success', data: [], message: 'To be implemented' });
});

export const exportToExcel = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement Excel export
  res.status(200).json({ status: 'success', message: 'To be implemented' });
});

export const getEmployeeSummary = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(200).json({ status: 'success', data: null, message: 'To be implemented' });
});
