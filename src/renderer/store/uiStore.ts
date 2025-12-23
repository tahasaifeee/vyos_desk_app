/**
 * UI Store - Zustand state management for UI state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  activeView: string;

  // Actions
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveView: (view: string) => void;
}

export const useThemeStore = create(
  persist<UIState>(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      activeView: 'devices',

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'vyos-ui-settings',
    }
  )
);
