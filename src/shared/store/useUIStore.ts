import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  isMasterMenuOpen: boolean;
  setMasterMenuOpen: (isOpen: boolean) => void;
  isContextualMenuOpen: boolean;
  setContextualMenuOpen: (isOpen: boolean) => void;
  isBottomBarOpen: boolean;
  toggleBottomBar: () => void;
  isStoragePersisted: boolean | null;
  setStoragePersisted: (status: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      isMasterMenuOpen: false,
      setMasterMenuOpen: (isOpen) => set({ isMasterMenuOpen: isOpen }),
      isContextualMenuOpen: false,
      setContextualMenuOpen: (isOpen) => set({ isContextualMenuOpen: isOpen }),
      isBottomBarOpen: true,
      toggleBottomBar: () => set((state) => ({ isBottomBarOpen: !state.isBottomBarOpen })),
      isStoragePersisted: null,
      setStoragePersisted: (status) => set({ isStoragePersisted: status }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
