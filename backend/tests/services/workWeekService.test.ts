/**
 * Unit tests for WorkWeekService
 */

import { WORK_DAYS, WorkWeekPattern } from '../../src/services/workWeekService';

describe('WorkWeekService', () => {
  describe('WORK_DAYS constant', () => {
    it('should have correct days for MondayFriday pattern', () => {
      const mondayFridayDays = WORK_DAYS.MondayFriday;
      expect(mondayFridayDays).toEqual([1, 2, 3, 4, 5]);
      expect(mondayFridayDays).toHaveLength(5);
      // Should not include Sunday (0) or Saturday (6)
      expect(mondayFridayDays).not.toContain(0);
      expect(mondayFridayDays).not.toContain(6);
    });

    it('should have correct days for TuesdaySaturday pattern', () => {
      const tuesdaySaturdayDays = WORK_DAYS.TuesdaySaturday;
      expect(tuesdaySaturdayDays).toEqual([2, 3, 4, 5, 6]);
      expect(tuesdaySaturdayDays).toHaveLength(5);
      // Should not include Sunday (0) or Monday (1)
      expect(tuesdaySaturdayDays).not.toContain(0);
      expect(tuesdaySaturdayDays).not.toContain(1);
    });
  });

  describe('isWorkDay helper logic', () => {
    const isWorkDayLogic = (date: Date, pattern: WorkWeekPattern): boolean => {
      const dayOfWeek = date.getDay();
      return WORK_DAYS[pattern].includes(dayOfWeek);
    };

    it('should correctly identify work days for MondayFriday pattern', () => {
      // Monday January 20, 2025
      const monday = new Date('2025-01-20T00:00:00');
      expect(isWorkDayLogic(monday, 'MondayFriday')).toBe(true);

      // Tuesday January 21, 2025
      const tuesday = new Date('2025-01-21T00:00:00');
      expect(isWorkDayLogic(tuesday, 'MondayFriday')).toBe(true);

      // Saturday January 25, 2025
      const saturday = new Date('2025-01-25T00:00:00');
      expect(isWorkDayLogic(saturday, 'MondayFriday')).toBe(false);

      // Sunday January 26, 2025
      const sunday = new Date('2025-01-26T00:00:00');
      expect(isWorkDayLogic(sunday, 'MondayFriday')).toBe(false);
    });

    it('should correctly identify work days for TuesdaySaturday pattern', () => {
      // Monday January 20, 2025
      const monday = new Date('2025-01-20T00:00:00');
      expect(isWorkDayLogic(monday, 'TuesdaySaturday')).toBe(false);

      // Tuesday January 21, 2025
      const tuesday = new Date('2025-01-21T00:00:00');
      expect(isWorkDayLogic(tuesday, 'TuesdaySaturday')).toBe(true);

      // Saturday January 25, 2025
      const saturday = new Date('2025-01-25T00:00:00');
      expect(isWorkDayLogic(saturday, 'TuesdaySaturday')).toBe(true);

      // Sunday January 26, 2025
      const sunday = new Date('2025-01-26T00:00:00');
      expect(isWorkDayLogic(sunday, 'TuesdaySaturday')).toBe(false);
    });
  });

  describe('generateDefaultEntries logic', () => {
    const generateDefaultEntriesLogic = (
      weekStartDate: string,
      pattern: WorkWeekPattern,
      projectId: number,
      hoursPerDay: number
    ) => {
      const entries: Array<{
        workDate: string;
        projectId: number;
        hoursWorked: number;
        workLocation: string;
      }> = [];
      const startDate = new Date(weekStartDate + 'T00:00:00');

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);
        const dayOfWeek = currentDate.getDay();

        if (WORK_DAYS[pattern].includes(dayOfWeek)) {
          const dateStr = currentDate.toISOString().split('T')[0];
          entries.push({
            workDate: dateStr,
            projectId,
            hoursWorked: hoursPerDay,
            workLocation: 'Office',
          });
        }
      }

      return entries;
    };

    it('should generate 5 entries for MondayFriday pattern', () => {
      // Week starting Sunday Jan 19, 2025
      const entries = generateDefaultEntriesLogic('2025-01-19', 'MondayFriday', 1, 8);

      expect(entries).toHaveLength(5);
      expect(entries[0].workDate).toBe('2025-01-20'); // Monday
      expect(entries[1].workDate).toBe('2025-01-21'); // Tuesday
      expect(entries[2].workDate).toBe('2025-01-22'); // Wednesday
      expect(entries[3].workDate).toBe('2025-01-23'); // Thursday
      expect(entries[4].workDate).toBe('2025-01-24'); // Friday

      // All entries should have 8 hours
      entries.forEach((entry) => {
        expect(entry.hoursWorked).toBe(8);
        expect(entry.projectId).toBe(1);
        expect(entry.workLocation).toBe('Office');
      });
    });

    it('should generate 5 entries for TuesdaySaturday pattern', () => {
      // Week starting Sunday Jan 19, 2025
      const entries = generateDefaultEntriesLogic('2025-01-19', 'TuesdaySaturday', 1, 8);

      expect(entries).toHaveLength(5);
      expect(entries[0].workDate).toBe('2025-01-21'); // Tuesday
      expect(entries[1].workDate).toBe('2025-01-22'); // Wednesday
      expect(entries[2].workDate).toBe('2025-01-23'); // Thursday
      expect(entries[3].workDate).toBe('2025-01-24'); // Friday
      expect(entries[4].workDate).toBe('2025-01-25'); // Saturday

      // All entries should have 8 hours
      entries.forEach((entry) => {
        expect(entry.hoursWorked).toBe(8);
        expect(entry.projectId).toBe(1);
        expect(entry.workLocation).toBe('Office');
      });
    });

    it('should not include Sunday for either pattern', () => {
      const mfEntries = generateDefaultEntriesLogic('2025-01-19', 'MondayFriday', 1, 8);
      const tsEntries = generateDefaultEntriesLogic('2025-01-19', 'TuesdaySaturday', 1, 8);

      // Neither pattern should include Sunday (Jan 19 or Jan 26)
      const sundayDates = ['2025-01-19', '2025-01-26'];

      mfEntries.forEach((entry) => {
        expect(sundayDates).not.toContain(entry.workDate);
      });

      tsEntries.forEach((entry) => {
        expect(sundayDates).not.toContain(entry.workDate);
      });
    });
  });
});
