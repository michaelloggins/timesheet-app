/**
 * User Management Hooks
 * React Query hooks for user admin operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

export interface User {
  UserID: number;
  EntraIDObjectID: string;
  EmployeeID?: string;
  Email: string;
  Name: string;
  Title?: string;
  DepartmentID: number;
  DepartmentName?: string;
  Role: 'Employee' | 'Manager' | 'TimesheetAdmin' | 'Leadership' | 'ProjectAdmin' | 'AuditReviewer';
  IsActive: boolean;
  ManagerEntraID?: string;
  ManagerName?: string;
  ManagerEmail?: string;
  WorkWeekPattern?: 'MondayFriday' | 'TuesdaySaturday' | null;
  CreatedDate: string;
  LastLoginDate?: string;
  DeactivatedDate?: string;
  DeactivationReason?: string;
}

export interface UserSyncDetail {
  name: string;
  email: string;
  role: string;
  department?: string;
}

export interface UserUpdateDetail {
  name: string;
  email: string;
  changes: {
    field: string;
    from: string | null;
    to: string | null;
  }[];
}

export interface DepartmentSyncDetail {
  name: string;
  code: string;
}

export interface DepartmentUpdateDetail {
  name: string;
  code: string;
  changes: {
    field: string;
    from: string | null;
    to: string | null;
  }[];
}

export interface SyncResult {
  created: number;
  updated: number;
  deactivated: number;
  departmentsCreated: number;
  departmentsUpdated: number;
  conflicts: string[];
  errors: string[];
  // Detailed info
  createdUsers: UserSyncDetail[];
  updatedUsers: UserUpdateDetail[];
  deactivatedUsers: UserSyncDetail[];
  createdDepartments: DepartmentSyncDetail[];
  updatedDepartments: DepartmentUpdateDetail[];
}

// Fetch all users
export const useUsers = () => {
  return useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/users');
      return response.data.data;
    },
  });
};

// Sync users from Entra ID
export const useSyncUsers = () => {
  const queryClient = useQueryClient();

  return useMutation<SyncResult, Error>({
    mutationFn: async () => {
      const response = await apiClient.post('/admin/users/sync');
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};
