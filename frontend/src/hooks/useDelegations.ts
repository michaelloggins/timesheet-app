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
  updateDelegation,
  addEmployeesToDelegation,
  removeEmployeesFromDelegation,
  UpdateDelegationRequest,
} from '../services/delegationService';
import { CreateDelegationRequest, Delegation, DelegationSummary, ScopedEmployee } from '../types';

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

  // Update delegation mutation
  const updateMutation = useMutation({
    mutationFn: ({ delegationId, updates }: { delegationId: number; updates: UpdateDelegationRequest }) =>
      updateDelegation(delegationId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsGiven'] });
    },
  });

  // Add employees mutation
  const addEmployeesMutation = useMutation({
    mutationFn: ({ delegationId, employeeIds }: { delegationId: number; employeeIds: number[] }) =>
      addEmployeesToDelegation(delegationId, employeeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsGiven'] });
    },
  });

  // Remove employees mutation
  const removeEmployeesMutation = useMutation({
    mutationFn: ({ delegationId, employeeIds }: { delegationId: number; employeeIds: number[] }) =>
      removeEmployeesFromDelegation(delegationId, employeeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      queryClient.invalidateQueries({ queryKey: ['delegationsGiven'] });
    },
  });

  const create = async (delegation: CreateDelegationRequest): Promise<Delegation> => {
    return createMutation.mutateAsync(delegation);
  };

  const revoke = async (delegationId: number): Promise<void> => {
    await revokeMutation.mutateAsync(delegationId);
  };

  const update = async (delegationId: number, updates: UpdateDelegationRequest): Promise<Delegation> => {
    return updateMutation.mutateAsync({ delegationId, updates });
  };

  const addEmployees = async (delegationId: number, employeeIds: number[]): Promise<ScopedEmployee[]> => {
    return addEmployeesMutation.mutateAsync({ delegationId, employeeIds });
  };

  const removeEmployees = async (delegationId: number, employeeIds: number[]): Promise<ScopedEmployee[]> => {
    return removeEmployeesMutation.mutateAsync({ delegationId, employeeIds });
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
    update,
    addEmployees,
    removeEmployees,
    isCreating: createMutation.isPending,
    isRevoking: revokeMutation.isPending,
    isUpdating: updateMutation.isPending,
    isAddingEmployees: addEmployeesMutation.isPending,
    isRemovingEmployees: removeEmployeesMutation.isPending,
    createError: createMutation.error as Error | null,
    revokeError: revokeMutation.error as Error | null,
    updateError: updateMutation.error as Error | null,
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
