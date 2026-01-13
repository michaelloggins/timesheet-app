/**
 * Holiday Management Hooks
 * React Query hooks for holiday admin operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  holidayService,
  Holiday,
  CreateHolidayDto,
  UpdateHolidayDto,
} from '../services/holidayService';

export const HOLIDAYS_QUERY_KEY = ['admin', 'holidays'];

/**
 * Get all holidays
 */
export const useHolidays = (year?: number) => {
  return useQuery<Holiday[]>({
    queryKey: year ? [...HOLIDAYS_QUERY_KEY, year] : HOLIDAYS_QUERY_KEY,
    queryFn: () => holidayService.getHolidays(year),
  });
};

/**
 * Create a holiday
 */
export const useCreateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHolidayDto) => holidayService.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
    },
  });
};

/**
 * Update a holiday
 */
export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateHolidayDto }) =>
      holidayService.updateHoliday(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
    },
  });
};

/**
 * Delete a holiday
 */
export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => holidayService.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
    },
  });
};
