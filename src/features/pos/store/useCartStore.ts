import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StockItem, TransactionItem } from '@shared/api/db';
import { MathUtils } from '../../../shared/utils/decimalUtils';
import { dexieCartStorage } from '../../../infrastructure/storage/dexieCartStorage';

/**
 * ============================================================================
 * 🛑 AI EMERGENCY STOP & AUDIT PROTOCOL
 * ============================================================================
 * @security_tier HIGH (HPP MASKING & FINANCIAL CALCULATIONS)
 * STOP! JIKA ANDA (AI MODEL) MENGAKSES FILE INI, BACA `/AI_TRACK_RECORD.md` SEGERA.
 * Aturan Visibilitas (SANGAT KRITIS):
 * - CartStore HANYA untuk layar (UI) Kasir.
 * - Kasir DILARANG MELIHAT nilai Cost, specificCost, HPP, maupun Gross Profit.
 * - Perhitungan Gross Profit dilakukan di Backend (Firestore Rules/Functions) atau
 *   CheckoutUseCase (yang tertutup dari state ini). JANGAN taruh HPP di sini.
 * - PERHATIAN UANG: JANGAN HILANGKAN Math.round() pada setiap parameter nominal.
 * ============================================================================
 */

interface CartState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  cartItems: TransactionItem[];
  readonly totalItems: number;
  readonly totalPrice: number;
  manualDiscountAmount: number;
  manualDiscountNote: string;
  addItem: (product: StockItem) => void;
  addCustomItem: (customItem: TransactionItem) => void;
  removeItem: (stockId: string) => void;
  updateQuantity: (stockId: string, quantity: number) => void;
  clearCart: () => void;
  setCartItems: (items: TransactionItem[]) => void;
  setManualDiscount: (amount: number, note: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      cartItems: [],
      manualDiscountAmount: 0,
      manualDiscountNote: '',

      get totalItems() {
        return get().cartItems.length;
      },

      get totalPrice() {
        return Math.round(get().cartItems.reduce((sum, item) => MathUtils.add(sum, item.subtotal), 0));
      },

      addItem: (product) =>
        set((state) => {
          const existingItem = state.cartItems.find(
            (item) => item.stockId === product.id
          );

          if (existingItem) {
            const newQuantity = existingItem.quantity + 1;
            if (existingItem.maxStock !== undefined && newQuantity > existingItem.maxStock) {
              return state; // Do not add more than maxStock
            }
            return {
              cartItems: state.cartItems.map((item) =>
                item.stockId === product.id
                  ? {
                      ...item,
                      quantity: newQuantity,
                      subtotal: Math.round(Number(MathUtils.mul(newQuantity, item.price))),
                    }
                  : item
              ),
            };
          }

          return {
            cartItems: [
              ...state.cartItems,
              {
                stockId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                subtotal: Math.round(Number(product.price)),
                maxStock: product.quantity,
              },
            ],
          };
        }),

      addCustomItem: (customItem) =>
        set((state) => {
          const existingItem = state.cartItems.find((i) => i.stockId === customItem.stockId);
          if (existingItem) {
            return {
              cartItems: state.cartItems.map((item) =>
                item.stockId === customItem.stockId
                  ? {
                      ...item,
                      quantity: item.quantity + customItem.quantity,
                      subtotal: Math.round(Number(MathUtils.add(item.subtotal, customItem.subtotal))),
                    }
                  : item
              ),
            };
          }
          return {
            cartItems: [...state.cartItems, customItem],
          };
        }),

      removeItem: (stockId) =>
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.stockId !== stockId),
        })),

      updateQuantity: (stockId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              cartItems: state.cartItems.filter((item) => item.stockId !== stockId),
            };
          }

          const itemToUpdate = state.cartItems.find(item => item.stockId === stockId);
          if (itemToUpdate && itemToUpdate.maxStock !== undefined && quantity > itemToUpdate.maxStock) {
            return state; // Do not update if exceeds maxStock
          }

          return {
            cartItems: state.cartItems.map((item) =>
              item.stockId === stockId
                ? {
                    ...item,
                    quantity,
                    subtotal: Math.round(Number(MathUtils.mul(quantity, item.price))),
                  }
                : item
            ),
          };
        }),

      clearCart: () => set({ cartItems: [], manualDiscountAmount: 0, manualDiscountNote: '' }),
      setCartItems: (items: TransactionItem[]) => set({ cartItems: items }),
      setManualDiscount: (amount: number, note: string) => set({ manualDiscountAmount: amount, manualDiscountNote: note }),
    }),
    {
      name: 'pos-cart-storage',
      storage: createJSONStorage(() => dexieCartStorage),
      partialize: (state) => {
        const { 
          addItem, 
          addCustomItem, 
          removeItem, 
          updateQuantity, 
          clearCart, 
          setCartItems, 
          setManualDiscount,
          setHasHydrated,
          ...stateToPersist 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } = state as any;
        return stateToPersist;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
