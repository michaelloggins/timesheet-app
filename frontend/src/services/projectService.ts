/**
 * Project Service
 * API calls for project management
 */

import { apiClient } from './api';
import { Project, ProjectWithAssignments, TargetableEmployee } from '../types';

export interface CreateProjectDto {
  projectNumber: string;
  projectName: string;
  departmentId?: number | null; // NULL = universal/all departments (legacy)
  projectType: 'Work' | 'PTO' | 'Holiday';
  grantIdentifier?: string;
  isActive: boolean;
  assignedDepartmentIds?: number[]; // Multi-department targeting
  assignedEmployeeIds?: number[]; // Direct employee targeting
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
  AssignedDepartments?: BackendProjectDepartment[];
  AssignedEmployees?: BackendProjectEmployee[];
}

interface BackendProjectDepartment {
  ProjectDepartmentID: number;
  ProjectID: number;
  DepartmentID: number;
  DepartmentName?: string;
}

interface BackendProjectEmployee {
  ProjectEmployeeID: number;
  ProjectID: number;
  UserID: number;
  UserName?: string;
  UserEmail?: string;
  DepartmentID?: number;
  DepartmentName?: string;
}

interface BackendTargetableEmployee {
  userId: number;
  name: string;
  email: string;
  departmentId: number;
  departmentName: string;
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

const mapProjectWithAssignments = (p: BackendProject): ProjectWithAssignments => ({
  ...mapProject(p),
  assignedDepartments: p.AssignedDepartments?.map(d => ({
    projectDepartmentId: d.ProjectDepartmentID,
    projectId: d.ProjectID,
    departmentId: d.DepartmentID,
    departmentName: d.DepartmentName,
  })),
  assignedEmployees: p.AssignedEmployees?.map(e => ({
    projectEmployeeId: e.ProjectEmployeeID,
    projectId: e.ProjectID,
    userId: e.UserID,
    userName: e.UserName,
    userEmail: e.UserEmail,
    departmentId: e.DepartmentID,
    departmentName: e.DepartmentName,
  })),
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
   * Get projects accessible to the current user
   * Based on department assignment or direct employee targeting
   */
  getProjectsForUser: async (): Promise<Project[]> => {
    const response = await apiClient.get<ApiResponse<BackendProject[]>>('/projects?forUser=true');
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
   * Get project by ID with full assignments (departments and employees)
   */
  getProjectWithAssignments: async (id: number): Promise<ProjectWithAssignments> => {
    const response = await apiClient.get<ApiResponse<BackendProject>>(`/projects/${id}?includeAssignments=true`);
    return mapProjectWithAssignments(response.data.data);
  },

  /**
   * Get employees from specified departments (for employee targeting UI)
   */
  getEmployeesByDepartments: async (departmentIds: number[]): Promise<TargetableEmployee[]> => {
    if (departmentIds.length === 0) {
      return [];
    }
    const response = await apiClient.get<ApiResponse<BackendTargetableEmployee[]>>(
      `/projects/employees-by-departments?departmentIds=${departmentIds.join(',')}`
    );
    return response.data.data || [];
  },

  /**
   * Create new project
   */
  createProject: async (data: CreateProjectDto): Promise<ProjectWithAssignments> => {
    const response = await apiClient.post<ApiResponse<BackendProject>>('/projects', data);
    return mapProjectWithAssignments(response.data.data);
  },

  /**
   * Update existing project
   */
  updateProject: async (id: number, data: UpdateProjectDto): Promise<ProjectWithAssignments> => {
    const response = await apiClient.put<ApiResponse<BackendProject>>(`/projects/${id}`, data);
    return mapProjectWithAssignments(response.data.data);
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
