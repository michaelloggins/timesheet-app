/**
 * System Config Hook
 * React Query hook for system configuration
 */

import { useQuery } from '@tanstack/react-query';
import { configService, SystemConfig } from '../services/configService';

export const CONFIG_QUERY_KEY = ['system', 'config'];

export const useSystemConfig = () => {
  return useQuery<SystemConfig>({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: () => configService.getConfig(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
