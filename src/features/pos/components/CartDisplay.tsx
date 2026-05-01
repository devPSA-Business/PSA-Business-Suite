import { useCartStore } from '../store/useCartStore';
import { useCheckoutStore } from '../store/useCheckoutStore';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';

export function CartDisplay() {
  const _hasHydrated = useCartStore((state) => state._hasHydrated);
  const cartItems = useCartStore((state) => state.cartItems);
  const totalPrice = useCartStore((state) => state.totalPrice);
  const totalItems = useCartStore((state) => state.totalItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const manualDiscountAmount = useCartStore((state) => state.manualDiscountAmount);
  
  const openCheckoutModal = useCheckoutStore((state) => state.openCheckoutModal);
  const user = useAuthStore((state) => state.user);

  if (!_hasHydrated) {
    return (
      <div className="h-full bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col overflow-hidden animate-pulse">
        <div className="p-3 sm:p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <div className="h-6 bg-stone-200 rounded w-1/3"></div>
          <div className="h-6 bg-stone-200 rounded w-16"></div>
        </div>

        <div className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
              <div className="h-4 bg-stone-200 rounded w-3/4"></div>
              <div className="flex justify-between items-end mt-2">
                <div className="h-8 bg-stone-200 rounded w-20"></div>
                <div className="flex flex-col items-end gap-1">
                  <div className="h-3 bg-stone-200 rounded w-16"></div>
                  <div className="h-5 bg-stone-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-6 bg-stone-50 border-t border-stone-100">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="h-5 bg-stone-200 rounded w-32"></div>
            <div className="h-8 bg-stone-200 rounded w-32"></div>
          </div>
          <div className="w-full h-14 bg-stone-200 rounded-xl shadow-sm"></div>
        </div>
      </div>
    );
  }

  const handleRemoveItem = (stockId: string) => {
    const itemToRemove = cartItems.find((item) => item.stockId === stockId);
    if (itemToRemove) {
      removeItem(stockId);
      DIContainer.logAuditUseCase.execute(
        'REMOVE_ITEM',
        user ? user.name : 'System',
        `Menghapus item ${itemToRemove.name} dari keranjang.`
      ).catch(console.error);
    }
  };

  const handleClearCart = () => {
    if (cartItems.length > 0) {
      const itemCount = cartItems.length;
      clearCart();
      DIContainer.logAuditUseCase.execute(
        'CLEAR_CART',
        user ? user.name : 'System',
        `Mengosongkan keranjang yang berisi ${itemCount} item.`
      ).catch(console.error);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="h-full bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-4">
          <ShoppingCartIcon className="text-stone-300 w-10 h-10" />
        </div>
        <h3 className="text-stone-800 font-serif font-bold text-xl mb-2">Keranjang Kosong</h3>
        <p className="text-stone-500 text-sm">Pilih produk dari daftar untuk ditambahkan ke keranjang.</p>
      </div>
    );
  }

  const finalTotal = Math.max(0, totalPrice - manualDiscountAmount);

  return (
    <>
      <div className="h-full bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <h3 className="font-serif font-bold text-base sm:text-lg text-brand-900">
            Pesanan Saat Ini <span className="text-xs sm:text-sm font-normal text-stone-500 ml-1 sm:ml-2">({totalItems} item)</span>
          </h3>
          <button
            onClick={handleClearCart}
            className="text-[10px] sm:text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors"
          >
            Kosongkan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 no-scrollbar">
          {cartItems.map((item) => (
            <div key={item.stockId} className="flex flex-col gap-2 sm:gap-3 p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-100">
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-semibold text-stone-800 text-xs sm:text-sm leading-tight line-clamp-2">
                  {item.name}
                </h4>
                <button
                  onClick={() => handleRemoveItem(item.stockId)}
                  className="text-stone-400 hover:text-red-500 transition-colors p-1"
                  aria-label="Hapus item"
                >
                  <Trash2 size={16} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2 sm:gap-3 bg-white border border-stone-200 rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(item.stockId, item.quantity - 1)}
                    className="p-1 text-stone-500 hover:text-brand-900 hover:bg-stone-100 rounded-md transition-colors"
                  >
                    <Minus size={14} className="sm:w-3.5 sm:h-3.5 w-3 h-3" />
                  </button>
                  <span className="font-medium text-xs sm:text-sm w-5 sm:w-6 text-center text-stone-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.stockId, item.quantity + 1)}
                    disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                    className="p-1 text-stone-500 hover:text-brand-900 hover:bg-stone-100 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-stone-500"
                  >
                    <Plus size={14} className="sm:w-3.5 sm:h-3.5 w-3 h-3" />
                  </button>
                </div>
                
                <div className="text-right">
                  <div className="text-[10px] sm:text-xs text-stone-500 mb-0.5">
                    Rp {item.price.toLocaleString('id-ID')}
                  </div>
                  <div className="font-bold text-brand-900 text-sm sm:text-base">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-6 bg-stone-50 border-t border-stone-100">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <span className="text-stone-500 font-medium text-sm sm:text-base">Total Keseluruhan</span>
            <span className="text-xl sm:text-2xl font-bold text-brand-900">
              Rp {finalTotal.toLocaleString('id-ID')}
            </span>
          </div>
          <button 
            onClick={openCheckoutModal}
            className="w-full bg-brand-900 hover:bg-brand-800 text-gold-500 font-bold text-base sm:text-lg py-3 sm:py-4 rounded-xl shadow-md transition-all active:scale-95"
          >
            Proses Pembayaran
          </button>
        </div>
      </div>
      <CheckoutModal />
    </>
  );
}

// Simple icon component for empty state
function ShoppingCartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
