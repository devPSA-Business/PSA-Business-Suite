import { create } from 'zustand';
import { StockCategory } from '../../domain/models/StockCategory';

interface AppState {
  categories: StockCategory[];
}

export const useAppStore = create<AppState>(() => ({
  categories: Object.values(StockCategory) as StockCategory[],
}));
