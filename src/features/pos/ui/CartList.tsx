import { Trash2, ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { CheckoutButton } from './CheckoutButton';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../../../lib/haptic';

export function CartList() {
  const { cartItems, totalPrice, removeItem, updateQuantity } = useCartStore();

  const handleRemove = (stockId: string) => {
    triggerHaptic('error');
    removeItem(stockId);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col h-full" data-component-id="cart-list" data-error-domain="pos-transaction">
      <div className="p-5 border-b border-stone-100 bg-stone-50 rounded-t-2xl flex justify-between items-center">
        <h2 className="text-xl font-serif font-bold text-brand-900 flex items-center gap-2">
          <ShoppingBag size={24} />
          Keranjang
        </h2>
        <span className="bg-brand-900 text-gold-500 text-xs font-bold px-3 py-1.5 rounded-full">
          {cartItems.length} Item
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
            <ShoppingBag size={48} className="text-stone-300" />
            <p className="font-medium text-stone-500">Keranjang kosong</p>
          </div>
        ) : (
          <AnimatePresence>
            {cartItems.map((item) => (
              <motion.div 
                key={item.stockId} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) {
                    handleRemove(item.stockId);
                  }
                }}
                className="flex flex-col gap-3 p-4 bg-stone-50 rounded-xl border border-stone-100 relative overflow-hidden"
              >
                <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center text-white">
                  <Trash2 size={24} />
                </div>
                <div className="flex justify-between items-start gap-2 bg-stone-50 relative z-10">
                  <h4 className="font-bold text-stone-800 leading-tight">{item.name}</h4>
                  <button 
                    onClick={() => handleRemove(item.stockId)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-1 bg-stone-50 relative z-10">
                  <p className="text-lg text-brand-900 font-bold">
                    Rp {item.price.toLocaleString('id-ID')}
                  </p>
                  
                  <div className="flex items-center gap-2 bg-white rounded-xl border border-stone-200 p-1 shadow-sm">
                    <button 
                      onClick={() => updateQuantity(item.stockId, item.quantity - 1)}
                      className="w-11 h-11 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-lg transition-colors active:scale-95"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="w-10 text-center font-bold text-lg text-stone-800">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.stockId, item.quantity + 1)}
                      className="w-11 h-11 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-lg transition-colors active:scale-95"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-5 border-t border-stone-100 bg-stone-50 rounded-b-2xl space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-stone-500 font-medium text-lg">Total</span>
          <span className="text-4xl font-bold text-brand-900 tracking-tight">
            Rp {totalPrice.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="h-16">
          <CheckoutButton />
        </div>
      </div>
    </div>
  );
}
