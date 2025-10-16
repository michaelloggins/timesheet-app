/**
 * Project Service
 * API calls for project management
 */

import { apiClient } from './api';
import { Project } from '../types';

export interface CreateProjectDto {
  projectNumber: string;
  projectName: string;
  departmentId: number;
  projectType: 'Work' | 'PTO' | 'Holiday';
  grantIdentifier?: string;
  isActive: boolean;
}

export interface UpdateProjectDto extends CreateProjectDto {
  projectId: number;
}

export const projectService = {
  /**
   * Get all projects
   */
  getAllProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/projects');
    return response.data;
  },

  /**
   * Get active projects only
   */
  getActiveProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/projects?active=true');
    return response.data;
  },

  /**
   * Get project by ID
   */
  getProjectById: async (id: number): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  /**
   * Create new project
   */
  createProject: async (data: CreateProjectDto): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  /**
   * Update existing project
   */
  updateProject: async (id: number, data: UpdateProjectDto): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  /**
   * Delete project
   */
  deleteProject: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  /**
   * Toggle project active status
   */
  toggleProjectStatus: async (id: number, isActive: boolean): Promise<Project> => {
    const response = await apiClient.patch<Project>(`/projects/${id}/status`, { isActive });
    return response.data;
  },
};
