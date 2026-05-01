import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../shared/api/db';
import { useAuthStore } from '../../../shared/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { Wallet, Plus, X } from 'lucide-react';
import { UI_REGISTRY } from '../../../shared/constants/ui_registry';
import { DIContainer } from '../../../infrastructure/di/Container';
import { handleNumberInputKeyDown } from '../../../shared/utils/inputUtils';

export function PettyCashWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'PEMBELIAN_PRODUK' | 'BAYAR_UTANG' | 'GAJI' | 'PERALATAN' | 'OPERASIONAL' | 'LAINNYA'>('OPERASIONAL');
  
  const { user } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);

  // Get today's petty cash
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const pettyCashToday = useLiveQuery(
    () => db.petty_cash.where('date').aboveOrEqual(startOfDay).toArray(),
    []
  );

  const totalPettyCash = pettyCashToday?.reduce((sum, item) => sum + item.amount, 0) || 0;

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
    
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      addToast('Jumlah tidak valid', 'error');
      return;
    }

    try {
      await DIContainer.recordPettyCashUseCase.execute({
        id: crypto.randomUUID(),
        date: Date.now(),
        category,
        amount: numAmount,
        description,
        user: user.name
      });
      addToast('Kas keluar berhasil dicatat', 'success');
      setIsOpen(false);
      setAmount('');
      setDescription('');
    } catch (error) {
      addToast((error instanceof Error ? error.message : String(error)) || 'Gagal mencatat kas keluar', 'error');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full min-h-[300px]">
      <div className="p-5 border-b border-stone-100 bg-rose-50/30 flex items-center justify-between">
        <h2 className="font-bold text-brand-900 flex items-center gap-2">
          <Wallet size={20} className="text-rose-500" />
          Kas Keluar (Petty Cash)
        </h2>
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-rose-100 text-rose-700 hover:bg-rose-200 p-1.5 rounded-lg transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="p-5 flex-1 flex flex-col justify-center items-center text-center relative">
        {pettyCashToday === undefined ? (
          <div className="flex flex-col items-center justify-center space-y-3 animate-pulse w-full">
            <div className="h-4 bg-stone-200 rounded w-24"></div>
            <div className="h-10 bg-stone-200 rounded w-40"></div>
            <div className="h-3 bg-stone-200 rounded w-20"></div>
          </div>
        ) : totalPettyCash > 0 ? (
          <>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-1">Total Hari Ini</p>
            <p className="text-3xl font-black text-rose-600">Rp {totalPettyCash.toLocaleString('id-ID')}</p>
            <p className="text-xs text-stone-500 mt-2">
              {pettyCashToday.length} transaksi tercatat
            </p>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
            <Wallet size={40} className="text-stone-200" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold text-stone-600">Belum ada kas keluar</p>
              <p className="text-xs text-stone-400 mt-1">Toko berjalan efisien hari ini!</p>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="mt-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              Catat Pengeluaran Pertama
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-rose-50/50">
              <h2 className="text-xl font-bold text-brand-900">Catat Kas Keluar</h2>
              <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Kategori</label>
                <select 
                  value={category} 
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="PEMBELIAN_PRODUK">Pembelian Produk</option>
                  <option value="BAYAR_UTANG">Bayar Utang</option>
                  <option value="GAJI">Gaji</option>
                  <option value="PERALATAN">Peralatan</option>
                  <option value="OPERASIONAL">Operasional</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Nominal (Rp)</label>
                <input 
                  type="text" 
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAmount(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                  }}
                  onKeyDown={handleNumberInputKeyDown}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-mono text-lg"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Keterangan</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none h-24"
                  placeholder="Tuliskan rincian pengeluaran..."
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3.5 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-colors active:scale-95"
              >
                {UI_REGISTRY.ACTIONS.SAVE.label}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
