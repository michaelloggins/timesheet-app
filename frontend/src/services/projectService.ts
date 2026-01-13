/**
 * Project Service
 * API calls for project management
 */

import { apiClient } from './api';
import { Project } from '../types';

export interface CreateProjectDto {
  projectNumber: string;
  projectName: string;
  departmentId?: number | null; // NULL = universal/all departments
  projectType: 'Work' | 'PTO' | 'Holiday';
  grantIdentifier?: string;
  isActive: boolean;
}

export interface UpdateProjectDto extends CreateProjectDto {
  projectId: number;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

// Backend returns PascalCase (SQL Server), frontend uses camelCase
interface BackendProject {
  ProjectID: number;
  ProjectNumber: string;
  ProjectName: string;
  DepartmentID: number | null;
  DepartmentName?: string | null;
  ProjectType: 'Work' | 'PTO' | 'Holiday';
  GrantIdentifier?: string;
  IsActive: boolean;
}

const mapProject = (p: BackendProject): Project => ({
  projectId: p.ProjectID,
  projectNumber: p.ProjectNumber,
  projectName: p.ProjectName,
  departmentId: p.DepartmentID,
  departmentName: p.DepartmentName,
  projectType: p.ProjectType,
  grantIdentifier: p.GrantIdentifier,
  isActive: p.IsActive,
});

export const projectService = {
  /**
   * Get all projects
   */
  getAllProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get<ApiResponse<BackendProject[]>>('/projects');
    return (response.data.data || []).map(mapProject);
  },

  /**
   * Get active projects only
   */
  getActiveProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get<ApiResponse<BackendProject[]>>('/projects?active=true');
    return (response.data.data || []).map(mapProject);
  },

  /**
   * Get project by ID
   */
  getProjectById: async (id: number): Promise<Project> => {
    const response = await apiClient.get<ApiResponse<BackendProject>>(`/projects/${id}`);
    return mapProject(response.data.data);
  },

  /**
   * Create new project
   */
  createProject: async (data: CreateProjectDto): Promise<Project> => {
    const response = await apiClient.post<ApiResponse<BackendProject>>('/projects', data);
    return mapProject(response.data.data);
  },

  /**
   * Update existing project
   */
  updateProject: async (id: number, data: UpdateProjectDto): Promise<Project> => {
    const response = await apiClient.put<ApiResponse<BackendProject>>(`/projects/${id}`, data);
    return mapProject(response.data.data);
  },

  /**
   * Deactivate project (soft delete)
   * Projects are never hard deleted - only deactivated
   */
  deactivateProject: async (id: number, reason?: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`, { data: { reason } });
  },

  /**
   * Toggle project active status
   */
  toggleProjectStatus: async (id: number, isActive: boolean): Promise<Project> => {
    const response = await apiClient.patch<ApiResponse<BackendProject>>(`/projects/${id}/status`, { isActive });
    return mapProject(response.data.data);
  },
};
