import { create } from 'zustand';
import { addDays, startOfWeek } from 'date-fns';

interface AppState {
  currentWeekStart: Date;
  notificationCount: number;
  setCurrentWeekStart: (date: Date) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToCurrentWeek: () => void;
  setNotificationCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  notificationCount: 0,

  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),

  goToNextWeek: () =>
    set((state) => ({
      currentWeekStart: addDays(state.currentWeekStart, 7),
    })),

  goToPreviousWeek: () =>
    set((state) => ({
      currentWeekStart: addDays(state.currentWeekStart, -7),
    })),

  goToCurrentWeek: () =>
    set({
      currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
    }),

  setNotificationCount: (count) => set({ notificationCount: count }),
}));
