import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { TransactionItem } from '../../../shared/api/db';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../../../lib/haptic';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: TransactionItem[];
  total: number;
  onRemove: (stockId: string) => void;
  onCheckout: () => void;
}

export const CartModal = React.memo(({ isOpen, onClose, items, total, onRemove, onCheckout }: CartModalProps) => {
  if (!isOpen) return null;

  const handleRemove = (stockId: string) => {
    triggerHaptic('light');
    onRemove(stockId);
  };

  const handleCheckout = () => {
    triggerHaptic('success');
    onCheckout();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm sm:p-4"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100) {
              onClose();
            }
          }}
          className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
        >
          {/* Mobile drag handle indicator */}
          <div className="w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
          </div>

          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
            <h2 className="text-lg sm:text-2xl font-bold text-brand-900">Keranjang</h2>
            <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 sm:p-2 hover:bg-stone-100 rounded-full transition-colors active:scale-95">
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-stone-500" />
            </button>
          </div>
          
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {items.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl">🛒</span>
                </div>
                <p className="text-stone-500 font-medium text-sm sm:text-base">Keranjang masih kosong</p>
              </div>
            ) : (
              <ul className="space-y-3 sm:space-y-4">
                {items.map((item) => (
                  <motion.li
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
                    className="flex items-center justify-between gap-3 sm:gap-4 bg-stone-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl relative overflow-hidden"
                  >
                    <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center text-white">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0 bg-stone-50 relative z-10">
                      <p className="font-bold text-stone-800 truncate text-sm sm:text-base">{item.name}</p>
                      <p className="text-xs sm:text-sm text-stone-500 mt-0.5 font-mono">{item.quantity} x Rp {item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 bg-stone-50 relative z-10">
                      <p className="font-bold text-brand-900 font-mono text-sm sm:text-base">Rp {item.subtotal.toLocaleString()}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-stone-100 bg-white shrink-0 pb-safe">
            <div className="flex justify-between items-end mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm font-medium text-stone-500">Total Pembayaran</span>
              <span className="text-xl sm:text-3xl font-bold text-brand-900 font-mono">Rp {total.toLocaleString()}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="w-full h-12 sm:h-14 bg-brand-900 hover:bg-brand-800 text-white font-bold rounded-xl sm:rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-brand-900/20 flex items-center justify-center text-base sm:text-lg"
            >
              <span>Proses Pembayaran</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

CartModal.displayName = 'CartModal';

