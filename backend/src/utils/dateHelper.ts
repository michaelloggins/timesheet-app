/**
 * Date utility functions for timesheet management
 */

export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday as week start (day 0)
  return new Date(d.setDate(diff));
};

export const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // Not Sunday or Saturday
};

export const getDaysBetween = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export const getCurrentWeekDates = (): Date[] => {
  const today = new Date();
  const start = getWeekStart(today);
  const end = getWeekEnd(today);
  return getDaysBetween(start, end);
};
