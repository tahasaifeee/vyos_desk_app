/**
 * Device Store - Zustand state management for devices
 */

import { create } from 'zustand';
import { DeviceProfile } from '@shared/types';

interface DeviceState {
  devices: DeviceProfile[];
  selectedDeviceId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  setDevices: (devices: DeviceProfile[]) => void;
  addDevice: (device: DeviceProfile) => void;
  updateDevice: (device: DeviceProfile) => void;
  removeDevice: (deviceId: string) => void;
  selectDevice: (deviceId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getSelectedDevice: () => DeviceProfile | null;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedDeviceId: null,
  loading: false,
  error: null,

  setDevices: (devices) => set({ devices }),

  addDevice: (device) =>
    set((state) => ({ devices: [...state.devices, device] })),

  updateDevice: (device) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === device.id ? device : d)),
    })),

  removeDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== deviceId),
      selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
    })),

  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  getSelectedDevice: () => {
    const state = get();
    return state.devices.find((d) => d.id === state.selectedDeviceId) || null;
  },
}));
