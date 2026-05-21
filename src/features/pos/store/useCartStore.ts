/**
 * @ai_context CartStore — state management keranjang belanja kasir ritel PSA.
 * @security_tier HIGH (HPP MASKING & FINANCIAL CALCULATIONS)
 * @business_rule CartStore HANYA untuk layar (UI) Kasir.
 *   Kasir DILARANG MELIHAT nilai Cost, specificCost, HPP, maupun Gross Profit.
 *   Perhitungan Gross Profit hanya di CheckoutUseCase (tertutup dari state ini).
 *   ATURAN UANG: SEMUA kalkulasi moneter WAJIB via MathUtils (Decimal.js).
 *   DILARANG: + - * / native JS untuk nilai Rupiah atau berat gram.
 *   UI hanya menerima dan merender `number` — TIDAK ada Decimal object di props.
 * @data-component-id: cart-store
 * @data-error-domain: pos
 * @stop_for_ai: Baca AI_TRACK_RECORD.md sebelum memodifikasi file ini.
 * @changelog:
 *   2026-05-20 — P4: Perkuat MathUtils compliance — semua aggregasi totalPrice
 *                    menggunakan MathUtils.add() dalam reduce (sudah ada, diperkuat typing)
 *                    Tambah return type eksplisit pada getter computed values
 *                    Isolasi semua Decimal logic di actions, UI terima number
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StockItem, TransactionItem } from '@shared/api/db';
import { MathUtils } from '../../../shared/utils/decimalUtils';
import { dexieCartStorage } from '../../../infrastructure/storage/dexieCartStorage';

interface CartState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  cartItems: TransactionItem[];
  /**
   * Jumlah baris item (bukan total unit) — integer, MathUtils tidak diperlukan.
   * UI: Render langsung sebagai badge count.
   */
  readonly totalItems: number;
  /**
   * Total harga keranjang dalam Rupiah (integer, sudah MathUtils.roundInt).
   * UI: Render sebagai Rp formatting — tidak perlu konversi lagi.
   * Selalu berupa `number` (bukan Decimal object) agar aman untuk JSX.
   */
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
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
      cartItems: [],
      manualDiscountAmount: 0,
      manualDiscountNote: '',

      get totalItems(): number {
        // Jumlah baris unik — integer arithmetic, bukan finansial
        return get().cartItems.length;
      },

      get totalPrice(): number {
        /**
         * P4: Aggregasi subtotal menggunakan MathUtils.add() bukan operator +
         * MathUtils.roundInt() memastikan output adalah integer Rupiah tanpa floating-point drift.
         * Semua Decimal logic terisolasi di sini — UI cukup render angka hasilnya.
         */
        const raw = get().cartItems.reduce(
          (acc: number, item: TransactionItem) => MathUtils.add(acc, item.subtotal),
          0
        );
        return MathUtils.roundInt(raw);
      },

      addItem: (product: StockItem) =>
        set((state) => {
          const existing = state.cartItems.find((i) => i.stockId === product.id);

          if (existing) {
            // Qty increment: integer + 1 (bukan finansial, boleh native)
            const newQty = existing.quantity + 1;
            if (existing.maxStock !== undefined && newQty > existing.maxStock) {
              return state; // Tidak tambah melebihi stok
            }
            return {
              cartItems: state.cartItems.map((item) =>
                item.stockId === product.id
                  ? {
                      ...item,
                      quantity: newQty,
                      // P4: subtotal = qty × price via MathUtils (wajib Decimal precision)
                      subtotal: MathUtils.roundInt(MathUtils.mul(newQty, item.price)),
                    }
                  : item
              ),
            };
          }

          // Item baru: subtotal = harga satuan (qty = 1)
          return {
            cartItems: [
              ...state.cartItems,
              {
                stockId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                subtotal: MathUtils.roundInt(product.price),
                maxStock: product.quantity,
              },
            ],
          };
        }),

      addCustomItem: (customItem: TransactionItem) =>
        set((state) => {
          const existing = state.cartItems.find((i) => i.stockId === customItem.stockId);
          if (existing) {
            return {
              cartItems: state.cartItems.map((item) =>
                item.stockId === customItem.stockId
                  ? {
                      ...item,
                      // Qty merge: integer arithmetic (bukan finansial)
                      quantity: item.quantity + customItem.quantity,
                      // Subtotal merge: MathUtils untuk presisi
                      subtotal: MathUtils.roundInt(MathUtils.add(item.subtotal, customItem.subtotal)),
                    }
                  : item
              ),
            };
          }
          return { cartItems: [...state.cartItems, customItem] };
        }),

      removeItem: (stockId: string) =>
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.stockId !== stockId),
        })),

      updateQuantity: (stockId: string, quantity: number) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              cartItems: state.cartItems.filter((item) => item.stockId !== stockId),
            };
          }

          const target = state.cartItems.find((item) => item.stockId === stockId);
          if (target?.maxStock !== undefined && quantity > target.maxStock) {
            return state; // Tidak update melebihi stok
          }

          return {
            cartItems: state.cartItems.map((item) =>
              item.stockId === stockId
                ? {
                    ...item,
                    quantity,
                    // P4: subtotal recalc via MathUtils
                    subtotal: MathUtils.roundInt(MathUtils.mul(quantity, item.price)),
                  }
                : item
            ),
          };
        }),

      clearCart: () => set({ cartItems: [], manualDiscountAmount: 0, manualDiscountNote: '' }),
      setCartItems: (items: TransactionItem[]) => set({ cartItems: items }),
      setManualDiscount: (amount: number, note: string) =>
        set({ manualDiscountAmount: amount, manualDiscountNote: note }),
    }),
    {
      name: 'pos-cart-storage',
      storage: createJSONStorage(() => dexieCartStorage),
      partialize: (state) => {
        // Hanya persist data, bukan action functions
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { addItem, addCustomItem, removeItem, updateQuantity, clearCart, setCartItems, setManualDiscount, setHasHydrated, ...stateToPersist } = state;
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
