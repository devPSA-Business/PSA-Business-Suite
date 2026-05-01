import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useCheckoutStore } from '../store/useCheckoutStore';

export function CheckoutButton() {
  const totalItems = useCartStore((state) => state.totalItems);
  const openCheckoutModal = useCheckoutStore((state) => state.openCheckoutModal);
  
  return (
    <button
      onClick={openCheckoutModal}
      disabled={totalItems === 0}
      className="w-full bg-brand-900 hover:bg-brand-800 disabled:bg-stone-300 disabled:text-stone-500 text-gold-500 font-bold text-lg py-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 relative"
    >
      <ShoppingCart size={24} />
      <span>Bayar Sekarang</span>
      <span className="absolute right-4 text-xs font-mono bg-brand-800 text-gold-500/70 px-2 py-1 rounded border border-brand-700 hidden sm:block">
        F9
      </span>
    </button>
  );
}
