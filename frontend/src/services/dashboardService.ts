/**
 * Dashboard Service
 * API calls for dashboard KPIs and leaderboard
 */

import { apiClient } from './api';

// Types
export interface PersonalKPIs {
  weeklyCompliance: {
    approvedWeeks: number;
    expectedWeeks: number;
    complianceRate: number;
    currentWeekStatus: 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Missing';
  };
  dailyReporting: {
    actualDaysWorked: number;
    expectedWorkingDays: number;
    reportingRate: number;
  };
  periodStart: string;
  periodEnd: string;
}

export interface TeamKPIs {
  teamName: string;
  employeeCount: number;
  weeklyCompliance: {
    totalApprovedWeeks: number;
    totalExpectedWeeks: number;
    averageComplianceRate: number;
    currentWeekStats: {
      approved: number;
      submitted: number;
      draft: number;
      missing: number;
    };
  };
  dailyReporting: {
    totalActualDays: number;
    totalExpectedDays: number;
    averageReportingRate: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  employeeName: string;
  weeklyComplianceRate: number;
  dailyReportingRate: number;
  overallScore: number;
  currentWeekStatus: 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Missing';
  streakWeeks: number;
}

export interface ManagerStats {
  personal: PersonalKPIs;
  team: TeamKPIs | null;
  leaderboard: LeaderboardEntry[];
}

export interface ScoreboardEntry {
  departmentId: number;
  departmentName: string;
  totalEmployees: number;
  submittedCount: number;
  approvedCount: number;
  completionRate: number;
  ragStatus: 'green' | 'amber' | 'red';
}

export interface CompanyKPIs {
  totalEmployees: number;
  weeklyCompliance: {
    totalApprovedWeeks: number;
    totalExpectedWeeks: number;
    averageComplianceRate: number;
    currentWeekStats: {
      approved: number;
      submitted: number;
      draft: number;
      missing: number;
    };
  };
  dailyReporting: {
    totalActualDays: number;
    totalExpectedDays: number;
    averageReportingRate: number;
  };
  periodStart: string;
  periodEnd: string;
}

export interface DepartmentLeaderboardEntry {
  rank: number;
  departmentId: number;
  departmentName: string;
  employeeCount: number;
  complianceRate: number;
  currentWeekSubmitted: number;
  currentWeekApproved: number;
}

/**
 * Get personal KPIs for the current user
 */
export async function getEmployeeStats(): Promise<PersonalKPIs> {
  const response = await apiClient.get('/dashboard/employee-stats');
  return response.data.data;
}

/**
 * Get manager stats (personal + department KPIs + leaderboard)
 */
export async function getManagerStats(): Promise<ManagerStats> {
  const response = await apiClient.get('/dashboard/manager-stats');
  return response.data.data;
}

/**
 * Get department leaderboard
 */
export async function getLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
  const params = limit ? { limit } : {};
  const response = await apiClient.get('/dashboard/leaderboard', { params });
  return response.data.data;
}

/**
 * Get organization scoreboard
 */
export async function getScoreboard(): Promise<ScoreboardEntry[]> {
  const response = await apiClient.get('/dashboard/scoreboard');
  return response.data.data;
}

/**
 * Get company-wide KPIs
 */
export async function getCompanyKPIs(): Promise<CompanyKPIs> {
  const response = await apiClient.get('/dashboard/company-kpis');
  return response.data.data;
}

/**
 * Get department leaderboard (ranked by compliance)
 */
export async function getDepartmentLeaderboard(): Promise<DepartmentLeaderboardEntry[]> {
  const response = await apiClient.get('/dashboard/department-leaderboard');
  return response.data.data;
}

/**
 * Get company-wide employee leaderboard
 */
export async function getCompanyEmployeeLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
  const params = limit ? { limit } : {};
  const response = await apiClient.get('/dashboard/company-leaderboard', { params });
  return response.data.data;
}

/**
 * Get rank badge/medal based on position
 * Uses video game style crown for 1st, medals for 2nd/3rd
 */
export function getRankBadge(rank: number): { emoji: string; label: string; color: string } {
  switch (rank) {
    case 1:
      return { emoji: '👑', label: '1st', color: '#FFD700' }; // Crown for champion
    case 2:
      return { emoji: '🥈', label: '2nd', color: '#C0C0C0' }; // Silver medal
    case 3:
      return { emoji: '🥉', label: '3rd', color: '#CD7F32' }; // Bronze medal
    default:
      return { emoji: '', label: `#${rank}`, color: '#666' };
  }
}

/**
 * Get compliance color based on rate
 */
export function getComplianceColor(rate: number): 'success' | 'warning' | 'error' | 'brand' {
  if (rate >= 90) return 'success';
  if (rate >= 70) return 'warning';
  return 'error';
}

/**
 * Get streak achievement badge
 */
export function getStreakBadge(weeks: number): { emoji: string; label: string } | null {
  if (weeks >= 52) return { emoji: '🏆', label: 'Year Champion' };
  if (weeks >= 26) return { emoji: '⭐', label: 'Half-Year Star' };
  if (weeks >= 12) return { emoji: '🔥', label: 'Quarter Fire' };
  if (weeks >= 4) return { emoji: '✨', label: 'Monthly Spark' };
  return null;
}
