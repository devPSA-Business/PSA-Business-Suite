import React, { useState } from 'react';
import { X, Wallet, FileText, Loader2, DollarSign } from 'lucide-react';
import { useAuthStore } from '../../../shared/store/authStore';
import { DIContainer } from '@infrastructure/di/Container';
import { useToastStore } from '../../../shared/store/toastStore';
import { handleNumberInputKeyDown, sanitizeNumberInput } from '../../../shared/utils/inputUtils';

interface PettyCashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PettyCashModal({ isOpen, onClose }: PettyCashModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'BELANJA' | 'UTILITAS' | 'UANG_MUKA'>('BELANJA');
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!amount || Number(amount) <= 0) {
      addToast('Nominal harus lebih dari 0', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await DIContainer.recordPettyCashUseCase.execute({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        category: type,
        description: note || `Pengeluaran ${type}`,
        amount: Number(amount),
        user: user.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      addToast('Pengeluaran berhasil dicatat', 'success');
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Gagal mencatat pengeluaran', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in transition-all">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-900">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="font-bold text-stone-800 text-lg">Kas Keluar</h2>
              <p className="text-xs text-stone-500">Ambil dari laci kasir</p>
            </div>
          </div>
          <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Tipe Pengeluaran</label>
            <div className="grid grid-cols-3 gap-2">
               {['BELANJA', 'UTILITAS', 'UANG_MUKA'].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => setType(cat as any)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold transition-colors border ${
                    type === cat 
                      ? 'bg-brand-900 text-gold-500 border-brand-900' 
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Nominal (Rp)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input
                type="text"
                required
                value={amount}
                onKeyDown={handleNumberInputKeyDown}
                onChange={(e) => setAmount(sanitizeNumberInput(e.target.value))}
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-brand-900/20 outline-none text-xl font-mono transition-shadow"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Catatan</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 text-stone-400" size={20} />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-brand-900/20 outline-none resize-none transition-shadow min-h-[100px]"
                placeholder="Contoh: Beli lakban dan nota..."
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !amount}
              className="w-full py-4 bg-brand-900 text-gold-500 rounded-xl font-bold hover:bg-brand-800 disabled:opacity-50 flex flex-col justify-center items-center shadow-lg active:scale-[0.98] transition-all"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Memproses...</span>
                </div>
              ) : (
                <>
                  <span>Catat Pengeluaran</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
