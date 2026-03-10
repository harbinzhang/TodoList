import { create } from 'zustand';

interface SettingsState {
  timezone: string;
  isSettingsOpen: boolean;
  setTimezone: (timezone: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const getDefaultTimezone = (): string => {
  const saved = localStorage.getItem('todolist-timezone');
  if (saved) return saved;
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  timezone: getDefaultTimezone(),
  isSettingsOpen: false,
  setTimezone: (timezone) => {
    localStorage.setItem('todolist-timezone', timezone);
    set({ timezone });
  },
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
}));
