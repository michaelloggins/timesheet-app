/**
 * Delegation Service
 * API calls for managing approval delegations in the Cascading Approvals system
 */

import { apiClient } from './api';
import { Delegation, CreateDelegationRequest, DelegationSummary, ScopedEmployee } from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface UpdateDelegationRequest {
  endDate?: string;
  reason?: string;
  employeeIds?: number[];
}

/**
 * Get all delegations for the current user (both given and received)
 */
export const getDelegations = async (): Promise<DelegationSummary> => {
  const response = await apiClient.get<ApiResponse<DelegationSummary>>('/delegations');
  return response.data.data;
};

/**
 * Get delegations given by the current user
 */
export const getDelegationsGiven = async (): Promise<Delegation[]> => {
  const response = await apiClient.get<ApiResponse<Delegation[]>>('/delegations/given');
  return response.data.data || [];
};

/**
 * Get delegations received by the current user
 */
export const getDelegationsReceived = async (): Promise<Delegation[]> => {
  const response = await apiClient.get<ApiResponse<Delegation[]>>('/delegations/received');
  return response.data.data || [];
};

/**
 * Create a new delegation
 */
export const createDelegation = async (delegation: CreateDelegationRequest): Promise<Delegation> => {
  const response = await apiClient.post<ApiResponse<Delegation>>('/delegations', delegation);
  return response.data.data;
};

/**
 * Revoke an existing delegation
 */
export const revokeDelegation = async (delegationId: number): Promise<void> => {
  await apiClient.delete(`/delegations/${delegationId}`);
};

/**
 * Get eligible users who can be delegates (for dropdown)
 */
export const getEligibleDelegates = async (): Promise<{ userId: number; name: string; email: string }[]> => {
  const response = await apiClient.get<ApiResponse<{ userId: number; name: string; email: string }[]>>(
    '/delegations/eligible-delegates'
  );
  return response.data.data || [];
};

/**
 * Get direct reports for scoping delegations to specific employees
 */
export const getDirectReports = async (): Promise<{ userId: number; name: string; email: string }[]> => {
  const response = await apiClient.get<ApiResponse<{ userId: number; name: string; email: string }[]>>(
    '/delegations/direct-reports'
  );
  return response.data.data || [];
};

/**
 * Update an existing delegation
 */
export const updateDelegation = async (
  delegationId: number,
  updates: UpdateDelegationRequest
): Promise<Delegation> => {
  const response = await apiClient.put<ApiResponse<Delegation>>(
    `/delegations/${delegationId}`,
    updates
  );
  return response.data.data;
};

/**
 * Get scoped employees for a delegation
 */
export const getScopedEmployees = async (delegationId: number): Promise<ScopedEmployee[]> => {
  const response = await apiClient.get<ApiResponse<ScopedEmployee[]>>(
    `/delegations/${delegationId}/employees`
  );
  return response.data.data || [];
};

/**
 * Add employees to a delegation's scope
 */
export const addEmployeesToDelegation = async (
  delegationId: number,
  employeeIds: number[]
): Promise<ScopedEmployee[]> => {
  const response = await apiClient.post<ApiResponse<ScopedEmployee[]>>(
    `/delegations/${delegationId}/employees`,
    { employeeIds }
  );
  return response.data.data || [];
};

/**
 * Remove employees from a delegation's scope
 */
export const removeEmployeesFromDelegation = async (
  delegationId: number,
  employeeIds: number[]
): Promise<ScopedEmployee[]> => {
  const response = await apiClient.delete<ApiResponse<ScopedEmployee[]>>(
    `/delegations/${delegationId}/employees`,
    { data: { employeeIds } }
  );
  return response.data.data || [];
};
