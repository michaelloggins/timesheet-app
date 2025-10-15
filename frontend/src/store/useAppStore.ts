import { create } from 'zustand';
import { addDays, startOfWeek } from 'date-fns';

interface AppState {
  currentWeekStart: Date;
  sidebarOpen: boolean;
  notificationCount: number;
  setCurrentWeekStart: (date: Date) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToCurrentWeek: () => void;
  toggleSidebar: () => void;
  setNotificationCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  sidebarOpen: true,
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

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setNotificationCount: (count) => set({ notificationCount: count }),
}));
