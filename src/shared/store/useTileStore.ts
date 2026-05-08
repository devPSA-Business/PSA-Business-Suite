import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QuickActionTile } from '../../domain/models/Tile';

interface TileState {
  tiles: QuickActionTile[];
  addTile: (tile: Omit<QuickActionTile, 'id'>) => void;
  updateTile: (id: string, tile: Partial<QuickActionTile>) => void;
  removeTile: (id: string) => void;
  reorderTiles: (tiles: QuickActionTile[]) => void;
}

const DEFAULT_TILES: QuickActionTile[] = [
  // SALES
  { id: '1', label: 'Kasir', iconName: 'ShoppingCart', action: 'NAVIGATE', target: '/cashier', division: 'SALES', isLocked: true, shortcutKey: 'F1', order: 1 },
  { id: '2', label: 'Likuidasi Aset', iconName: 'Landmark', action: 'NAVIGATE', target: '/gold-buyback-sales', division: 'SALES', isLocked: false, shortcutKey: 'F2', order: 2 },
  { id: '3', label: 'Buyback', iconName: 'Undo2', action: 'NAVIGATE', target: '/buyback', division: 'SALES', isLocked: false, shortcutKey: 'F3', order: 3 },
  
  // SERVICE
  { id: '4', label: 'Reparasi Baru', iconName: 'Wrench', action: 'NAVIGATE', target: '/service-pos', division: 'SERVICE', isLocked: true, shortcutKey: 'F4', order: 1 },
  { id: '5', label: 'Daftar Servis', iconName: 'ListChecks', action: 'NAVIGATE', target: '/services', division: 'SERVICE', isLocked: false, shortcutKey: 'F5', order: 2 },
  
  // INVENTORY (Workspace: Katalog & Pembelian)
  { id: '6', label: 'Katalog', iconName: 'BookOpen', action: 'NAVIGATE', target: '/inventory', division: 'INVENTORY', isLocked: true, shortcutKey: 'F6', order: 1 },
  { id: '7', label: 'Pembelian', iconName: 'ShoppingCart', action: 'NAVIGATE', target: '/purchase', division: 'INVENTORY', isLocked: false, shortcutKey: 'F7', order: 2 },
  { id: '8', label: 'Cetak Barcode', iconName: 'Printer', action: 'NAVIGATE', target: '/barcode-print', division: 'INVENTORY', isLocked: false, shortcutKey: 'F8', order: 3 },

  // ADMIN
  { id: '9', label: 'Dashboard', iconName: 'LayoutDashboard', action: 'NAVIGATE', target: '/dashboard', division: 'ADMIN', isLocked: true, shortcutKey: 'F10', order: 1 },
  { id: '10', label: 'Audit Log', iconName: 'History', action: 'NAVIGATE', target: '/audit', division: 'ADMIN', isLocked: false, shortcutKey: 'F11', order: 2 },
  { id: '11', label: 'Pengaturan', iconName: 'Settings', action: 'NAVIGATE', target: '/settings', division: 'ADMIN', isLocked: true, shortcutKey: 'F12', order: 3 },
];

export const useTileStore = create<TileState>()(
  persist(
    (set) => ({
      tiles: DEFAULT_TILES,
      addTile: (tile) => set((state) => ({
        tiles: [...state.tiles, { ...tile, id: crypto.randomUUID() }]
      })),
      updateTile: (id, updatedTile) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, ...updatedTile } : t))
      })),
      removeTile: (id) => set((state) => ({
        tiles: state.tiles.filter((t) => t.id !== id)
      })),
      reorderTiles: (newTiles) => set({ tiles: newTiles }),
    }),
    {
      name: 'psa-tile-storage',
    }
  )
);
