/**
 * useCurrentUser Hook
 * Fetches and caches the current user profile
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';

export interface CurrentUser {
  userId: number;
  entraId: string;
  email: string;
  name: string;
  departmentId: number;
  departmentName?: string;
  managerName?: string;
  role: 'Employee' | 'Manager' | 'TimesheetAdmin' | 'Leadership';
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

  return {
    user: data,
    isLoading,
    error: error as Error | null,
    isManager: data?.role === 'Manager' || data?.role === 'TimesheetAdmin' || data?.role === 'Leadership',
    isAdmin: data?.role === 'TimesheetAdmin' || data?.role === 'Leadership',
    isLeadership: data?.role === 'Leadership',
  };
};
