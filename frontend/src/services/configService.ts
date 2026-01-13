/**
 * System Config Service
 * API calls for system configuration
 */

import { apiClient } from './api';

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface SystemConfig {
  HolidayProjectID?: string;
  [key: string]: string | undefined;
}

export const configService = {
  /**
   * Get all system configuration
   */
  getConfig: async (): Promise<SystemConfig> => {
    const response = await apiClient.get<ApiResponse<SystemConfig>>('/admin/config');
    return response.data.data || {};
  },

  /**
   * Update a configuration value
   */
  updateConfig: async (key: string, value: string, description?: string): Promise<void> => {
    await apiClient.put('/admin/config', { key, value, description });
  },
};
