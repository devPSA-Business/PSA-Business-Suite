import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '@infrastructure/di/Container';
import { SuspendedCart } from '@domain/models/SuspendedCart';
import { Clock, Play } from 'lucide-react';

interface HeldCartsProps {
  onResume: (cart: SuspendedCart) => void;
}

export const HeldCarts = React.memo(({ onResume }: HeldCartsProps) => {
  const suspendedCarts = useLiveQuery(() => DIContainer.liveQueries.observeSuspendedCarts());

  if (!suspendedCarts || suspendedCarts.length === 0) return null;

  return (
    <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-stone-100">
      <h3 className="text-base sm:text-lg font-bold text-brand-900 mb-3 sm:mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 sm:w-5 sm:h-5" /> Keranjang Ditangguhkan
      </h3>
      <ul className="space-y-2">
        {suspendedCarts.map((cart) => (
          <li key={cart.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-stone-50 rounded-lg">
            <div>
              <p className="font-semibold text-brand-900 text-sm sm:text-base">{cart.name}</p>
              <p className="text-xs sm:text-sm text-stone-500">Rp {cart.total.toLocaleString()}</p>
            </div>
            <button 
              onClick={() => DIContainer.resumeCartUseCase.execute(cart.id, 'admin').then(c => c && onResume(c))}
              className="p-1.5 sm:p-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

HeldCarts.displayName = 'HeldCarts';
