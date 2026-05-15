import { useState } from 'react';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';
import { useGoldStore } from '../../../shared/store/useGoldStore';
import { ManagerAuthDialog } from '../../../shared/components/ManagerAuthDialog';
import { Loader2, CheckCircle2, Scale, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../../../shared/store/toastStore';
import { BackButton } from '../../../shared/components/BackButton';
import { scaleService } from '../../../infrastructure/services/ScaleService';
import { Decimal } from 'decimal.js';
import { MathUtils } from '../../../shared/utils/decimalUtils';
import { handleNumberInputKeyDown, isValidNumericValue, sanitizeNumberInput } from '../../../shared/utils/inputUtils';

interface BuybackFormProps {
  hideBackButton?: boolean;
  onSuccess?: () => void;
}

import { mapErrorToUser } from '../../../shared/utils/errorMapper';

export function BuybackForm({ hideBackButton, onSuccess }: BuybackFormProps = {}) {
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const marketPricePerGram = useGoldStore((state) => state.marketPricePerGram);
  const isPriceStale = useGoldStore((state) => state.isPriceStale());
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isWeighing, setIsWeighing] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    weightGram: '',
    kadar: '0.750', // Default 18K
    margin: '8',    // Default 8%
    buyPriceOverride: '', 
    paymentMethod: 'CASH' as 'CASH' | 'TRANSFER',
  });

  // Kalkulasi Auto: (Berat × Kadar × Harga Acuan) × (1 - Margin/100)
  const weight = new Decimal(formData.weightGram || '0').toNumber();
  const kadar = new Decimal(formData.kadar || '0').toNumber();
  const marginPct = new Decimal(formData.margin || '0').toNumber();
  
  const calculatedBuyPrice = MathUtils.roundInt(
    MathUtils.mul(
      MathUtils.mul(MathUtils.mul(weight, kadar), marketPricePerGram),
      MathUtils.sub(1, MathUtils.div(marginPct, 100))
    )
  );

  const buybackPrice = formData.buyPriceOverride ? new Decimal(formData.buyPriceOverride).toNumber() : calculatedBuyPrice;

  const handleAutoWeigh = async () => {
    setIsWeighing(true);
    try {
      await scaleService.connect();
      const w = await scaleService.readWeight();
      setFormData(prev => ({ ...prev, weightGram: w.toString() }));
      addToast(`Berat ditarik: ${w}g`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addToast(message, 'error');
    } finally {
      await scaleService.disconnect();
      setIsWeighing(false);
    }
  };

  const processBuyback = async () => {
    if (!user) {
      addToast('Anda harus login terlebih dahulu.', 'error');
      return;
    }

    if (!isValidNumericValue(formData.weightGram, 0.01, 10000)) {
      addToast('Berat Emas tidak valid.', 'error'); return;
    }
    if (buybackPrice <= 0) {
      addToast('Harga beli harus lebih besar dari 0.', 'error'); return;
    }

    setIsLoading(true);
    try {
      await DIContainer.buybackUseCase.execute({
        customerName: formData.customerName,
        weightGram: weight,
        kadar: kadar,
        pricePerGram: marketPricePerGram,
        margin: marginPct,
        buyPrice: buybackPrice,
        paymentMethod: formData.paymentMethod,
        userId: user.name,
      });
      
      setIsSuccess(true);
      if (onSuccess) { setTimeout(onSuccess, 1500); }
      setFormData({
        customerName: '',
        weightGram: '',
        kadar: '0.750',
        margin: '8',
        buyPriceOverride: '',
        paymentMethod: 'CASH',
      });
      setTimeout(() => setIsSuccess(false), 3000);
      addToast('Aset emas berhasil disimpan ke Treasury!', 'success');
    } catch (error) {
      const mapped = mapErrorToUser(error);
      addToast(mapped.userMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPriceStale) {
      setIsAuthOpen(true);
    } else {
      await processBuyback();
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200 w-full max-w-3xl mx-auto animate-in fade-in duration-300">
      {!hideBackButton && <BackButton />}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-900 mb-2">Beli Emas (Buyback)</h2>
        <p className="text-stone-500 text-xs sm:text-sm">Beli emas konsumen (SOP: Dana dari Kas Emas, tidak dijual eceran).</p>
      </div>
      
      {isPriceStale && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertTriangle size={20} className="shrink-0 sm:w-5 sm:h-5 w-4 h-4" />
          Harga acuan usang (&gt; 2 Jam). Membutuhkan otorisasi Manager.
        </div>
      )}

      <div className="mb-6 p-4 bg-stone-50 border border-stone-200 rounded-xl">
         <p className="text-sm font-bold text-stone-700">Harga Acuan Antam / Indikator (Per Gram)</p>
         <p className="text-2xl font-mono text-brand-900 font-bold">Rp {marketPricePerGram.toLocaleString('id-ID')}</p>
      </div>

      {isSuccess && <div className="mb-4 p-4 bg-green-50 text-green-700 border border-green-100 rounded-xl text-sm font-medium flex items-center gap-2"><CheckCircle2 size={20} /> Transaksi selesai!</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-stone-700 mb-2">Nama Konsumen</label>
            <input 
              type="text" required 
              value={formData.customerName} 
              onChange={(e) => setFormData({...formData, customerName: e.target.value})} 
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900 focus:border-brand-900" 
              placeholder="Contoh: Bp. Budi"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Berat Emas (g)</label>
            <div className="flex gap-2">
              <input 
                type="number" step="0.01" required inputMode="decimal"
                value={formData.weightGram} 
                onChange={(e) => setFormData({...formData, weightGram: sanitizeNumberInput(e.target.value)})} 
                onKeyDown={handleNumberInputKeyDown}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900 font-mono" 
                placeholder="0.00"
              />
              <button 
                type="button" onClick={handleAutoWeigh} disabled={isWeighing}
                className="px-4 bg-brand-900 text-gold-500 rounded-xl hover:bg-brand-800 disabled:opacity-50"
              >
                {isWeighing ? <Loader2 className="animate-spin" size={20} /> : <Scale size={20} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Estimasi Kadar</label>
            <select
              value={formData.kadar}
              onChange={(e) => setFormData({...formData, kadar: e.target.value})}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900"
            >
              <option value="0.999">24K (99.9%)</option>
              <option value="0.916">22K (91.6%)</option>
              <option value="0.750">18K (75.0%)</option>
              <option value="0.585">14K (58.5%)</option>
              <option value="0.375">9K (37.5%)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Margin Toko (%)</label>
            <input 
              type="number" step="1" required
              value={formData.margin} 
              onChange={(e) => setFormData({...formData, margin: sanitizeNumberInput(e.target.value)})}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900 text-stone-800 font-mono" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Estimasi (Auto-kalkulasi)</label>
            <input 
              type="text" disabled 
              value={'Rp ' + calculatedBuyPrice.toLocaleString('id-ID')}
              className="w-full p-4 bg-stone-100 border border-stone-200 rounded-xl text-stone-500 font-bold font-mono cursor-not-allowed" 
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-stone-700 mb-2">Harga Beli Deal (Override)</label>
            <input 
              type="number" inputMode="numeric"
              value={formData.buyPriceOverride} 
              onChange={(e) => setFormData({...formData, buyPriceOverride: sanitizeNumberInput(e.target.value)})} 
              onKeyDown={handleNumberInputKeyDown}
              className="w-full p-4 bg-white border border-brand-900 rounded-xl focus:ring-2 focus:ring-brand-900 text-brand-900 font-bold text-xl font-mono shadow-sm" 
              placeholder={'Rp ' + calculatedBuyPrice.toLocaleString('id-ID')}
            />
             <p className="text-xs text-stone-500 mt-2">Biarkan kosong jika setuju dengan harga estimasi otomatis.</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-stone-700 mb-2">Modal (Cash Source)</label>
            <div className="p-4 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
               KAS EMAS (Treasury Fund)
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-200">
          <button 
            type="submit" disabled={isLoading} 
            className="w-full min-h-[56px] text-lg font-bold bg-brand-900 text-gold-500 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Simpan Transaksi Beli Emas'}
          </button>
        </div>
        <ManagerAuthDialog 
          isOpen={isAuthOpen}
          actionName="Otorisasi Harga Emas Usang"
          onSuccess={() => { setIsAuthOpen(false); processBuyback(); }}
          onCancel={() => setIsAuthOpen(false)}
        />
      </form>
    </div>
  );
}

