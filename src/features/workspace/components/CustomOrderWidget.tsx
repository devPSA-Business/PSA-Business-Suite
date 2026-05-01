import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../shared/api/db';
import { useAuthStore } from '../../../shared/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { ClipboardEdit, Plus, X, CheckCircle, Clock } from 'lucide-react';
import { DIContainer } from '../../../infrastructure/di/Container';

export function CustomOrderWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  
  const { user } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);

  const activeOrders = useLiveQuery(
    () => db.custom_orders.where('status').notEqual('DONE').reverse().sortBy('date'),
    []
  );

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const numPrice = parseInt(estimatedPrice.replace(/\D/g, ''), 10) || 0;

    try {
      await DIContainer.manageCustomOrderUseCase.createOrder({
        id: crypto.randomUUID(),
        date: Date.now(),
        customerName,
        description,
        estimatedPrice: numPrice,
        status: 'PENDING',
        user: user.name
      });
      addToast('Order kustom berhasil dicatat', 'success');
      setIsOpen(false);
      setCustomerName('');
      setDescription('');
      setEstimatedPrice('');
    } catch (error) {
      addToast((error instanceof Error ? error.message : String(error)) || 'Gagal mencatat order', 'error');
    }
  };

  const markAsDone = async (id: string) => {
    if (!user) return;
    try {
      await DIContainer.manageCustomOrderUseCase.markAsDone(id, user.name);
      addToast('Order diselesaikan', 'success');
    } catch (error) {
      addToast((error instanceof Error ? error.message : String(error)) || 'Gagal mengupdate order', 'error');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full min-h-[300px]">
      <div className="p-5 border-b border-stone-100 bg-emerald-50/30 flex items-center justify-between">
        <h2 className="font-bold text-brand-900 flex items-center gap-2">
          <ClipboardEdit size={20} className="text-emerald-600" />
          Order Kustom Aktif
        </h2>
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 p-1.5 rounded-lg transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-stone-50/30 relative">
        {activeOrders === undefined ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 w-1/2">
                    <div className="h-4 bg-stone-200 rounded w-full"></div>
                    <div className="h-3 bg-stone-200 rounded w-2/3"></div>
                  </div>
                  <div className="h-5 bg-stone-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-stone-200 rounded w-full mt-2"></div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-50">
                  <div className="h-4 bg-stone-200 rounded w-24"></div>
                  <div className="h-4 bg-stone-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 text-center space-y-3">
            <ClipboardEdit size={40} className="text-stone-200" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold text-stone-600">Belum ada order kustom</p>
              <p className="text-xs text-stone-400 mt-1">Semua pesanan khusus sudah selesai.</p>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="mt-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
            >
              Buat Order Baru
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map(order => (
              <div key={order.id} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-brand-900">{order.customerName}</h3>
                    <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                      <Clock size={12} />
                      {new Date(order.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-stone-600 line-clamp-2">{order.description}</p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-50">
                  <span className="text-sm font-bold text-emerald-700">
                    Est: Rp {order.estimatedPrice.toLocaleString('id-ID')}
                  </span>
                  <button 
                    onClick={() => markAsDone(order.id)}
                    className="text-xs font-bold text-stone-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle size={14} />
                    Selesai
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-emerald-50/50">
              <h2 className="text-xl font-bold text-brand-900">Catat Order Kustom</h2>
              <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Nama Pelanggan</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Detail Pesanan</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none h-24"
                  placeholder="Misal: Cincin emas putih 5 gram model..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Estimasi Harga (Rp)</label>
                <input 
                  type="text" 
                  value={estimatedPrice}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setEstimatedPrice(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                  }}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                  placeholder="0"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3.5 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-colors active:scale-95"
              >
                Simpan Order
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
