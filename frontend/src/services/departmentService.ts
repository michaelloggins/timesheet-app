/**
 * Department Service
 * API calls for department management
 */

import { apiClient } from './api';

export interface Department {
  DepartmentID: number;
  DepartmentCode: string;
  DepartmentName: string;
  IsActive: boolean;
  CreatedDate: string;
  ModifiedDate: string;
  UserCount?: number;
  ProjectCount?: number;
}

export interface CreateDepartmentDto {
  departmentCode: string;
  departmentName: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  departmentCode?: string;
  departmentName?: string;
  isActive?: boolean;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export const departmentService = {
  /**
   * Get all departments
   */
  getAllDepartments: async (): Promise<Department[]> => {
    const response = await apiClient.get<ApiResponse<Department[]>>('/admin/departments');
    return response.data.data || [];
  },

  /**
   * Create new department
   */
  createDepartment: async (data: CreateDepartmentDto): Promise<Department> => {
    const response = await apiClient.post<ApiResponse<Department>>('/admin/departments', data);
    return response.data.data;
  },

  /**
   * Update existing department
   */
  updateDepartment: async (id: number, data: UpdateDepartmentDto): Promise<Department> => {
    const response = await apiClient.put<ApiResponse<Department>>(`/admin/departments/${id}`, data);
    return response.data.data;
  },
};
