import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  segmentationThresholds: {
    vip: number;
    loyal: number;
  };
  setSegmentationThresholds: (vip: number, loyal: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      segmentationThresholds: {
        vip: 20000000,
        loyal: 5000000,
      },
      setSegmentationThresholds: (vip, loyal) =>
        set({ segmentationThresholds: { vip, loyal } }),
    }),
    {
      name: 'psa-settings-storage',
    }
  )
);
