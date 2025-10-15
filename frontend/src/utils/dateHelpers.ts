import { format, startOfWeek, endOfWeek, addDays, isWeekend, parseISO } from 'date-fns';

export const formatDate = (date: Date | string, formatStr: string = 'yyyy-MM-dd'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const getWeekStart = (date: Date = new Date()): Date => {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
};

export const getWeekEnd = (date: Date = new Date()): Date => {
  return endOfWeek(date, { weekStartsOn: 1 }); // Sunday
};

export const getWeekDates = (weekStart: Date): Date[] => {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
};

export const isWeekday = (date: Date): boolean => {
  return !isWeekend(date);
};

export const getWeekdayCount = (weekStart: Date): number => {
  return getWeekDates(weekStart).filter(isWeekday).length;
};

export const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = getWeekEnd(weekStart);
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
};
