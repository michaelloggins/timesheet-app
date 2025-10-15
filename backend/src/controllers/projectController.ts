import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement - filter by department
  res.status(200).json({ status: 'success', data: [], message: 'To be implemented' });
});

export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(200).json({ status: 'success', data: null, message: 'To be implemented' });
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(201).json({ status: 'success', message: 'To be implemented' });
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(200).json({ status: 'success', message: 'To be implemented' });
});

export const deactivateProject = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement
  res.status(200).json({ status: 'success', message: 'To be implemented' });
});
