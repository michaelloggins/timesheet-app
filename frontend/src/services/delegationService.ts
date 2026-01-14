/**
 * Delegation Service
 * API calls for managing approval delegations in the Cascading Approvals system
 */

import { apiClient } from './api';
import { Delegation, CreateDelegationRequest, DelegationSummary } from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
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
