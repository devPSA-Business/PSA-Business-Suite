import { useState } from 'react';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';
import { Wallet } from 'lucide-react';
import { useToastStore } from '../../../shared/store/toastStore';
import { MorningReadinessUI } from '../../auth/components/MorningReadinessUI';
import { mapErrorToUser } from '../../../shared/utils/errorMapper';

import { Decimal } from 'decimal.js';

export function ShiftOpenForm({ onShiftOpened }: { onShiftOpened: () => void }) {
  const { addToast } = useToastStore();
  const [startCash, setStartCash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReadiness, setShowReadiness] = useState(false);
  const user = useAuthStore(state => state.user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('Anda harus login terlebih dahulu.', 'error');
      return;
    }

    const cashAmount = new Decimal(startCash.replace(/[^0-9]/g, '') || '0').toNumber();
    if (cashAmount < 0) {
      addToast('Masukkan jumlah modal awal yang valid.', 'error');
      return;
    }

    // Tampilkan UI Morning Readiness sebelum memproses buka shift
    setShowReadiness(true);
  };

  const handleReadinessSuccess = async () => {
    setShowReadiness(false);
    setIsProcessing(true);
    
    const cashAmount = new Decimal(startCash.replace(/[^0-9]/g, '') || '0').toNumber();
    
    try {
      const result = await DIContainer.openShiftUseCase.execute({
        startCash: cashAmount,
        userId: user!.name
      });
      
      if (result.warning) {
        addToast(result.warning, 'warning');
      } else {
        addToast('Shift berhasil dibuka.', 'success');
      }
      
      onShiftOpened();
    } catch (error) {
      const mapped = mapErrorToUser(error);
      addToast(`Gagal membuka shift: ${mapped.userMessage}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^,\d]/g, '').toString();
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    return rupiah;
  };

  return (
    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-stone-200 shadow-xl shadow-stone-200/50 max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-16 h-16 bg-brand-900/5 text-brand-900 rounded-3xl flex items-center justify-center mb-6">
        <Wallet size={32} />
      </div>
      <h2 className="text-3xl font-serif font-bold text-brand-900 mb-3">Buka Shift Baru</h2>
      <p className="text-stone-500 text-lg mb-8 leading-relaxed">Siapkan laci kasir dengan memasukkan jumlah modal awal untuk kembalian.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Modal Awal (Cash In Drawer)</label>
          <div className="relative group">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 text-2xl font-bold group-focus-within:text-brand-900 transition-colors">Rp</span>
            <input
              type="text"
              required
              value={startCash}
              onChange={(e) => setStartCash(formatRupiah(e.target.value))}
              className="w-full pl-16 pr-6 py-6 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-brand-900 text-4xl font-black tracking-tight"
              placeholder="0"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-3 min-h-[72px] bg-brand-900 hover:bg-brand-800 text-gold-500 font-black text-xl rounded-2xl shadow-lg shadow-brand-900/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Memproses...' : 'Buka Shift Sekarang'}
        </button>
      </form>

      {showReadiness && (
        <MorningReadinessUI 
          onSuccess={handleReadinessSuccess}
          onCancel={() => setShowReadiness(false)}
        />
      )}
    </div>
  );
}
