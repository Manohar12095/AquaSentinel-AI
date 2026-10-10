import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DataMode, User, Alert, Station, DashboardSummary } from '../lib/types';

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;

  // Data mode
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;

  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Selected station (for dashboard)
  selectedStationId: number | null;
  setSelectedStationId: (id: number | null) => void;

  // Live data (populated by SSE)
  stations: Station[];
  setStations: (stations: Station[]) => void;
  updateStation: (station: Partial<Station> & { id: number }) => void;

  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  updateAlert: (id: number, changes: Partial<Alert>) => void;
  setAlerts: (alerts: Alert[]) => void;

  dashboard: DashboardSummary | null;
  setDashboard: (d: DashboardSummary) => void;

  // Unread alert count
  unreadAlerts: number;
  markAlertsRead: () => void;

  // SSE connection status
  sseConnected: boolean;
  setSseConnected: (v: boolean) => void;

  // Browser offline
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),

      dataMode: 'simulation',
      setDataMode: (mode) => set({ dataMode: mode }),

      darkMode: false,
      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      selectedStationId: null,
      setSelectedStationId: (id) => set({ selectedStationId: id }),

      stations: [],
      setStations: (stations) => set({ stations }),
      updateStation: (update) =>
        set((state) => ({
          stations: state.stations.map((s) =>
            s.id === update.id ? { ...s, ...update } : s
          ),
        })),

      alerts: [],
      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 200),
          unreadAlerts: state.unreadAlerts + 1,
        })),
      updateAlert: (id, changes) =>
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...changes } : a)),
        })),
      setAlerts: (alerts) => set({ alerts }),

      dashboard: null,
      setDashboard: (d) => set({ dashboard: d }),

      unreadAlerts: 0,
      markAlertsRead: () => set({ unreadAlerts: 0 }),

      sseConnected: false,
      setSseConnected: (v) => set({ sseConnected: v }),

      isOnline: navigator.onLine,
      setIsOnline: (v) => set({ isOnline: v }),
    }),
    {
      name: 'aquasentinel-app',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        dataMode: state.dataMode,
        darkMode: state.darkMode,
        selectedStationId: state.selectedStationId,
      }),
    }
  )
);
