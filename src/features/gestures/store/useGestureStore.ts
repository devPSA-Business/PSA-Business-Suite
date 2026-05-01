import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GestureAction = 'SYNC_NOW' | 'OPEN_CASH_DRAWER' | 'NEW_REPAIR' | 'NONE';

interface GestureStore {
  swipeUp: GestureAction;
  swipeLeft: GestureAction;
  swipeRight: GestureAction;
  setSwipeAction: (direction: 'swipeUp' | 'swipeLeft' | 'swipeRight', action: GestureAction) => void;
}

export const useGestureStore = create<GestureStore>()(
  persist(
    (set) => ({
      swipeUp: 'SYNC_NOW',
      swipeLeft: 'OPEN_CASH_DRAWER',
      swipeRight: 'NEW_REPAIR',
      setSwipeAction: (direction, action) => set((state) => ({ ...state, [direction]: action })),
    }),
    {
      name: 'gesture-storage',
    }
  )
);
