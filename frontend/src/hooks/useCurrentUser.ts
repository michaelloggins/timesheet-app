/**
 * useCurrentUser Hook
 * Fetches and caches the current user profile
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { UserRole } from '../types';

export interface CurrentUser {
  userId: number;
  entraId: string;
  email: string;
  name: string;
  departmentId: number;
  departmentName?: string;
  managerName?: string;
  role: UserRole;
}

async function fetchProfile(): Promise<CurrentUser> {
  const response = await apiClient.get('/auth/profile');
  return response.data.data;
}

export const useCurrentUser = () => {
  const { data, isLoading, error } = useQuery<CurrentUser>({
    queryKey: ['auth', 'profile'],
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 30, // 30 minutes - profile rarely changes
    retry: 1,
  });

  // Role helper functions
  const role = data?.role;

  return {
    user: data,
    isLoading,
    error: error as Error | null,
    // Existing role checks
    isManager: role === 'Manager' || role === 'TimesheetAdmin' || role === 'Leadership',
    isAdmin: role === 'TimesheetAdmin' || role === 'Leadership',
    isLeadership: role === 'Leadership',
    // New role checks for granular admin access
    isProjectAdmin: role === 'TimesheetAdmin' || role === 'ProjectAdmin',
    isAuditReviewer: role === 'TimesheetAdmin' || role === 'AuditReviewer',
    // Check if user has any admin panel access
    hasAdminAccess: role === 'TimesheetAdmin' || role === 'Leadership' || role === 'ProjectAdmin' || role === 'AuditReviewer',
  };
};
