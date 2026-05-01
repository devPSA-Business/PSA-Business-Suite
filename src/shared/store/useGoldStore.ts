import { create } from 'zustand';
import { db } from '../api/db';

interface GoldStore {
  marketPricePerGram: number;
  lastFetchedAt: number;
  isLoading: boolean;
  isManualPriceRequired: boolean;
  isPriceStale: () => boolean;
  setMarketPrice: (price: number) => void;
  fetchMarketPrice: () => Promise<void>;
}

export const useGoldStore = create<GoldStore>((set, get) => ({
  marketPricePerGram: 0,
  lastFetchedAt: 0,
  isLoading: false,
  isManualPriceRequired: false,
  isPriceStale: () => {
    const { lastFetchedAt } = get();
    return Date.now() - lastFetchedAt > 2 * 60 * 60 * 1000;
  },
  setMarketPrice: async (price) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await db.daily_gold_price.put({
        date: today,
        antamPrice: price,
        updatedBy: 'MANUAL',
        updatedAt: Date.now()
      });
    } catch(e) {
      console.warn('Failed to save to daily_gold_price', e);
    }
    set({ marketPricePerGram: price, lastFetchedAt: Date.now(), isManualPriceRequired: false });
  },
  fetchMarketPrice: async () => {
    set({ isLoading: true });
    try {
      const today = new Date().toISOString().split('T')[0];
      const localPrice = await db.daily_gold_price.get(today);
      
      // If we have a local price updated within the last 2 hours, use it immediately
      if (localPrice && (Date.now() - localPrice.updatedAt < 2 * 60 * 60 * 1000)) {
         set({ marketPricePerGram: localPrice.antamPrice, lastFetchedAt: localPrice.updatedAt, isManualPriceRequired: false, isLoading: false });
         return;
      }

      const response = await fetch('https://api.gold-api.com/price/XAU');
      if (response.ok) {
        const data = await response.json();
        const priceIdrPerGram = (data.price / 31.1035) * 16000; 
        const finalPrice = Math.round(priceIdrPerGram);
        
        await db.daily_gold_price.put({
           date: today,
           antamPrice: finalPrice,
           updatedBy: 'SYSTEM',
           updatedAt: Date.now()
        });

        set({ marketPricePerGram: finalPrice, lastFetchedAt: Date.now(), isManualPriceRequired: false });
      } else {
        throw new Error('API Error');
      }
    } catch (error) {
      console.warn('Failed to fetch live gold price, checking local cache or requiring manual input', error);
      const today = new Date().toISOString().split('T')[0];
      try {
        const localPriceFallback = await db.daily_gold_price.get(today);
        if (localPriceFallback) {
          set({ marketPricePerGram: localPriceFallback.antamPrice, lastFetchedAt: localPriceFallback.updatedAt, isManualPriceRequired: true });
        } else {
          set({ marketPricePerGram: 0, isManualPriceRequired: true });
        }
      } catch(e) {
        set({ marketPricePerGram: 0, isManualPriceRequired: true });
      }
    } finally {
      set({ isLoading: false });
    }
  }
}));
