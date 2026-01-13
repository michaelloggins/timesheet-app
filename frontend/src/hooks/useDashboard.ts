/**
 * useDashboard Hook
 * React Query hook for fetching dashboard KPIs
 */

import { useQuery } from '@tanstack/react-query';
import {
  getEmployeeStats,
  getManagerStats,
  getScoreboard,
  getLeaderboard,
  getCompanyKPIs,
  getDepartmentLeaderboard,
  getCompanyEmployeeLeaderboard,
  PersonalKPIs,
  ManagerStats,
  ScoreboardEntry,
  LeaderboardEntry,
  CompanyKPIs,
  DepartmentLeaderboardEntry,
} from '../services/dashboardService';

/**
 * Hook to get personal KPIs for all employees
 */
export const useEmployeeStats = () => {
  const { data, isLoading, error, refetch } = useQuery<PersonalKPIs>({
    queryKey: ['dashboard', 'employee-stats'],
    queryFn: getEmployeeStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    personalKPIs: data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Hook to get manager stats (personal + team + leaderboard)
 */
export const useManagerStats = () => {
  const { data, isLoading, error, refetch } = useQuery<ManagerStats>({
    queryKey: ['dashboard', 'manager-stats'],
    queryFn: getManagerStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    personalKPIs: data?.personal,
    teamKPIs: data?.team,
    leaderboard: data?.leaderboard || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Hook to get organization scoreboard
 */
export const useScoreboard = () => {
  const { data, isLoading, error, refetch } = useQuery<ScoreboardEntry[]>({
    queryKey: ['dashboard', 'scoreboard'],
    queryFn: getScoreboard,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    scoreboard: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Hook to get department leaderboard
 */
export const useLeaderboard = (limit?: number) => {
  const { data, isLoading, error, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ['dashboard', 'leaderboard', limit],
    queryFn: () => getLeaderboard(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    leaderboard: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Hook to get company-wide KPIs
 */
export const useCompanyKPIs = () => {
  const { data, isLoading, error, refetch } = useQuery<CompanyKPIs>({
    queryKey: ['dashboard', 'company-kpis'],
    queryFn: getCompanyKPIs,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    companyKPIs: data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Hook to get department leaderboard (ranked by compliance)
 */
export const useDepartmentLeaderboard = () => {
  const { data, isLoading, error, refetch } = useQuery<DepartmentLeaderboardEntry[]>({
    queryKey: ['dashboard', 'department-leaderboard'],
    queryFn: getDepartmentLeaderboard,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    departmentLeaderboard: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Hook to get company-wide employee leaderboard
 */
export const useCompanyLeaderboard = (limit?: number) => {
  const { data, isLoading, error, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ['dashboard', 'company-leaderboard', limit],
    queryFn: () => getCompanyEmployeeLeaderboard(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    employeeLeaderboard: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
