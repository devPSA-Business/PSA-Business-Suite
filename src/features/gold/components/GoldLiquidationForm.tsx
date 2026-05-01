import React, { useState } from 'react';
import { useToastStore } from '../../../shared/store/toastStore';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';
import { Landmark, ArrowUpRight, Loader2, Check } from 'lucide-react';
import { handleNumberInputKeyDown, sanitizeNumberInput } from '../../../shared/utils/inputUtils';
import { GoldBuyback } from '../../../shared/api/db';
import { Decimal } from 'decimal.js';

interface GoldLiquidationFormProps {
  currentStoredItems: GoldBuyback[];
  onSuccess: () => void;
}

export const GoldLiquidationForm: React.FC<GoldLiquidationFormProps> = ({ currentStoredItems, onSuccess }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalSoldPrice, setTotalSoldPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  const { user } = useAuthStore();

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectedItems = currentStoredItems.filter(item => selectedIds.has(item.id));
  const totalWeight = selectedItems.reduce((sum, item) => sum + item.weightGram, 0);
  const totalHPP = selectedItems.reduce((sum, item) => sum + item.buybackPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('User tidak terautentikasi', 'error'); return;
    }
    if (selectedIds.size === 0) {
      addToast('Pilih setidaknya 1 item dari daftar aset tersimpan', 'error'); return;
    }
    const price = new Decimal(totalSoldPrice || '0').toNumber();
    if (isNaN(price) || price <= 0) {
      addToast('Total harga jual tidak valid', 'error'); return;
    }

    setIsLoading(true);
    try {
      await DIContainer.goldLiquidationUseCase.execute({
        buybackIds: Array.from(selectedIds),
        totalSoldPrice: price,
        paymentMethod,
        userId: user.name,
      });
      addToast('Likuidasi aset berhasil dicatat!', 'success');
      setSelectedIds(new Set());
      setTotalSoldPrice('');
      setPaymentMethod('CASH');
      onSuccess();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Gagal mencatat likuidasi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8 bg-white rounded-[2rem] border border-stone-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-stone-100">
        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
          <Landmark size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-stone-800">Likuidasi ke Pengepul</h3>
          <p className="text-xs text-stone-500">Pilih aset tersimpan untuk dijual ke pihak ketiga.</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-bold text-stone-700">1. Pilih Barang yang Dijual</p>
        {currentStoredItems.length === 0 ? (
          <div className="p-4 bg-stone-50 text-stone-500 rounded-xl text-sm border border-stone-200 text-center">
             Brankas kosong. Belum ada aset yang bisa dilikuidasi.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {currentStoredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => handleToggleSelect(item.id)}
                className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-colors ${selectedIds.has(item.id) ? 'border-brand-900 bg-brand-50' : 'border-stone-100 bg-white hover:border-stone-300'}`}
              >
                 <div className="flex items-center gap-3">
                   <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${selectedIds.has(item.id) ? 'bg-brand-900 border-brand-900 text-white' : 'border-stone-300 bg-white'}`}>
                     {selectedIds.has(item.id) && <Check size={14} strokeWidth={3} />}
                   </div>
                   <div>
                     <p className="font-bold text-sm text-stone-700">{item.customerName}</p>
                     <p className="text-xs text-stone-500 font-mono">{item.weightGram}g • {(item.kadar*100).toFixed(1)}%</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] uppercase font-bold text-stone-400">Modal (HPP)</p>
                   <p className="text-sm font-bold text-stone-800 font-mono">Rp {item.buybackPrice.toLocaleString('id-ID')}</p>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
         <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
           <div>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Total Berat</p>
              <p className="text-lg font-black text-stone-800">{totalWeight.toFixed(2)} gram</p>
           </div>
           <div className="text-right">
              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Total HPP</p>
              <p className="text-lg font-black text-stone-800 font-mono">Rp {totalHPP.toLocaleString('id-ID')}</p>
           </div>
         </div>
      )}

      <div>
        <label className="block text-sm font-bold text-stone-700 mb-2">2. Harga Deal (Rp)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-lg">Rp</span>
          <input 
            type="number" required inputMode="numeric"
            value={totalSoldPrice} 
            onChange={(e) => setTotalSoldPrice(sanitizeNumberInput(e.target.value))} 
            onKeyDown={handleNumberInputKeyDown}
            className="w-full pl-12 p-4 bg-white border-2 border-stone-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-black text-xl text-emerald-700 font-mono transition-all outline-none"
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">3. Status Pembayaran</label>
        <div className="flex gap-2">
          <label className="flex-1">
            <input type="radio" value="CASH" checked={paymentMethod === 'CASH'} onChange={(e) => setPaymentMethod(e.target.value as 'CASH')} className="peer sr-only" />
            <div className="p-4 text-center border-2 border-stone-200 rounded-2xl cursor-pointer peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 font-bold text-sm text-stone-500 transition-all hover:bg-stone-50">
              CASH (Tunai)
            </div>
          </label>
          <label className="flex-1">
            <input type="radio" value="TRANSFER" checked={paymentMethod === 'TRANSFER'} onChange={(e) => setPaymentMethod(e.target.value as 'TRANSFER')} className="peer sr-only" />
            <div className="p-4 text-center border-2 border-stone-200 rounded-2xl cursor-pointer peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 font-bold text-sm text-stone-500 transition-all hover:bg-stone-50">
              TRANSFER
            </div>
          </label>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isLoading || selectedIds.size === 0}
        className="w-full py-5 rounded-2xl text-white font-black text-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-stone-300 disabled:cursor-not-allowed shadow-xl shadow-emerald-600/20"
      >
        {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
          <>
            Konfirmasi Jual ke Pengepul <ArrowUpRight size={24} />
          </>
        )}
      </button>
    </form>
  );
};
