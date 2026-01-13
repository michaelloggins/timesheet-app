/**
 * Department Management Hooks
 * React Query hooks for department admin operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  departmentService,
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '../services/departmentService';

export const DEPARTMENTS_QUERY_KEY = ['admin', 'departments'];

/**
 * Get all departments
 */
export const useDepartments = () => {
  return useQuery<Department[]>({
    queryKey: DEPARTMENTS_QUERY_KEY,
    queryFn: departmentService.getAllDepartments,
  });
};

/**
 * Create new department
 */
export const useCreateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDepartmentDto) => departmentService.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY });
    },
  });
};

/**
 * Update department
 */
export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDepartmentDto }) =>
      departmentService.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY });
    },
  });
};
