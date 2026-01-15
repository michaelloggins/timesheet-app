/**
 * useDelegations Hook
 * React Query hooks for managing approval delegations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDelegations,
  getDelegationsGiven,
  getDelegationsReceived,
  createDelegation,
  revokeDelegation,
  getEligibleDelegates,
  getDirectReports,
} from '../services/delegationService';
import { CreateDelegationRequest, Delegation, DelegationSummary } from '../types';

/**
 * Hook to fetch all delegations (both given and received)
 */
export const useDelegations = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DelegationSummary>({
    queryKey: ['delegations'],
    queryFn: getDelegations,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Create delegation mutation
  const createMutation = useMutation({
    mutationFn: (delegation: CreateDelegationRequest) => createDelegation(delegation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsGiven'] });
    },
  });

  // Revoke delegation mutation
  const revokeMutation = useMutation({
    mutationFn: (delegationId: number) => revokeDelegation(delegationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsGiven'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsReceived'] });
    },
  });

  const create = async (delegation: CreateDelegationRequest): Promise<Delegation> => {
    return createMutation.mutateAsync(delegation);
  };

  const revoke = async (delegationId: number): Promise<void> => {
    await revokeMutation.mutateAsync(delegationId);
  };

  return {
    delegations: data,
    given: data?.given || [],
    received: data?.received || [],
    isLoading,
    error: error as Error | null,
    refetch,
    create,
    revoke,
    isCreating: createMutation.isPending,
    isRevoking: revokeMutation.isPending,
    createError: createMutation.error as Error | null,
    revokeError: revokeMutation.error as Error | null,
  };
};

/**
 * Hook to fetch delegations given by the current user
 */
export const useDelegationsGiven = () => {
  return useQuery<Delegation[]>({
    queryKey: ['delegationsGiven'],
    queryFn: getDelegationsGiven,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch delegations received by the current user
 */
export const useDelegationsReceived = () => {
  return useQuery<Delegation[]>({
    queryKey: ['delegationsReceived'],
    queryFn: getDelegationsReceived,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch eligible delegates for the dropdown
 */
export const useEligibleDelegates = () => {
  return useQuery<{ userId: number; name: string; email: string }[]>({
    queryKey: ['eligibleDelegates'],
    queryFn: getEligibleDelegates,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook to fetch direct reports for scoping delegations
 */
export const useDirectReports = () => {
  return useQuery<{ userId: number; name: string; email: string }[]>({
    queryKey: ['directReports'],
    queryFn: getDirectReports,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook to create a delegation
 */
export const useCreateDelegation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (delegation: CreateDelegationRequest) => createDelegation(delegation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsGiven'] });
    },
  });
};

/**
 * Hook to revoke a delegation
 */
export const useRevokeDelegation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (delegationId: number) => revokeDelegation(delegationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsGiven'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsReceived'] });
    },
  });
};
