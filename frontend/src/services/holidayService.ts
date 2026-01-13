/**
 * Holiday Service
 * API calls for holiday management
 */

import { apiClient } from './api';

export interface Holiday {
  HolidayID: number;
  HolidayName: string;
  HolidayDate: string;
  DefaultHours: number;
  IsActive: boolean;
  CreatedDate: string;
  ModifiedDate: string;
}

export interface CreateHolidayDto {
  holidayName: string;
  holidayDate: string;
  defaultHours?: number;
}

export interface UpdateHolidayDto {
  holidayName?: string;
  holidayDate?: string;
  defaultHours?: number;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export const holidayService = {
  /**
   * Get all holidays (optionally filter by year)
   */
  getHolidays: async (year?: number): Promise<Holiday[]> => {
    const url = year ? `/admin/holidays?year=${year}` : '/admin/holidays';
    const response = await apiClient.get<ApiResponse<Holiday[]>>(url);
    return response.data.data || [];
  },

  /**
   * Create a holiday
   */
  createHoliday: async (data: CreateHolidayDto): Promise<Holiday> => {
    const response = await apiClient.post<ApiResponse<Holiday>>('/admin/holidays', data);
    return response.data.data;
  },

  /**
   * Update a holiday
   */
  updateHoliday: async (id: number, data: UpdateHolidayDto): Promise<Holiday> => {
    const response = await apiClient.put<ApiResponse<Holiday>>(`/admin/holidays/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a holiday
   */
  deleteHoliday: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/holidays/${id}`);
  },
};
