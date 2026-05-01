import React, { useState } from 'react';
import { Landmark, TrendingUp, Handshake, ArrowDownRight, ArrowRight } from 'lucide-react';
import { BuybackForm } from '../../gold/ui/BuybackForm';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { handleNumberInputKeyDown, sanitizeNumberInput } from '../../../shared/utils/inputUtils';
import { formatCurrency } from '../../../shared/utils/formatUtils';

export function GoldCashierForm() {
  const [mode, setMode] = useState<'SIMPAN' | 'LANGSUNG_JUAL'>('SIMPAN');

  const { addCustomItem } = useCartStore();
  const addToast = useToastStore((state) => state.addToast);
  
  const [brokerageData, setBrokerageData] = useState({
    description: '',
    buyPrice: '',
    sellPrice: ''
  });

  const handleBrokerageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const buy = Number(brokerageData.buyPrice);
    const sell = Number(brokerageData.sellPrice);
    
    if (buy <= 0 || sell <= 0) {
      addToast('Harga beli dan harga jual pengepul harus diisi', 'error');
      return;
    }

    const margin = sell - buy;
    if (margin <= 0) {
      addToast('Harga jual harus lebih tinggi atau sama dengan harga beli ke konsumen untuk mendapat margin', 'error');
      return;
    }

    addCustomItem({
      stockId: `GOLD-BROKER-${Date.now()}`,
      name: `[Brokerase Emas] ${brokerageData.description || 'Tanpa Keterangan'}`,
      price: margin,
      quantity: 1,
      subtotal: margin,
      maxStock: 999,
      isCustomItem: true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    addToast(`Margin Trx Emas Rp ${margin.toLocaleString()} masuk ke kasir`, 'success');
    setBrokerageData({ description: '', buyPrice: '', sellPrice: '' });
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Mode Selector */}
      <div className="bg-white p-2 rounded-2xl flex gap-2 border border-stone-200 shadow-sm mb-6">
        <button
          onClick={() => setMode('SIMPAN')}
          className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
            mode === 'SIMPAN'
              ? 'bg-amber-100 text-amber-900 shadow-sm'
              : 'text-stone-500 hover:bg-stone-50'
          }`}
        >
          <Landmark size={18} />
          Simpan ke Brankas (Buyback)
        </button>
        <button
          onClick={() => setMode('LANGSUNG_JUAL')}
          className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
            mode === 'LANGSUNG_JUAL'
              ? 'bg-emerald-100 text-emerald-900 shadow-sm'
              : 'text-stone-500 hover:bg-stone-50'
          }`}
        >
          <Handshake size={18} />
          Langsung Jual (Brokerase)
        </button>
      </div>

      {mode === 'SIMPAN' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-4 flex gap-3">
             <ArrowDownRight className="text-amber-600 shrink-0" />
             <div>
               <h3 className="font-bold text-amber-900 text-sm">Informasi Alur Buyback</h3>
               <p className="text-xs text-amber-700 mt-1">Uang tunai di laci kasir akan dipotong otomatis sebagai Kas Keluar. Emas akan masuk ke aset Treasury toko dengan pencatatan HPP Specific Identification.</p>
             </div>
          </div>
          <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <BuybackForm hideBackButton={true} />
          </div>
        </div>
      )}

      {mode === 'LANGSUNG_JUAL' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-4 flex gap-3">
             <ArrowRight className="text-emerald-600 shrink-0" />
             <div>
               <h3 className="font-bold text-emerald-900 text-sm">Informasi Alur Pengepul</h3>
               <p className="text-xs text-emerald-700 mt-1">Gunakan ini jika Emas tidak ditahan di laci, tapi langsung dioper ke pengepul. Selisih (Margin) laba akan dimasukkan sebagai produk ke keranjang kasir Ritel untuk menambah total setoran uang laci hari ini.</p>
             </div>
          </div>
          
          <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-800">Brokerase Emas</h2>
                <p className="text-sm text-stone-500">Catat selisih laba penjualan langsung</p>
              </div>
            </div>

            <form onSubmit={handleBrokerageSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Deskripsi Barang Emas</label>
                <input
                  type="text"
                  required
                  value={brokerageData.description}
                  onChange={(e) => setBrokerageData({ ...brokerageData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-shadow"
                  placeholder="Contoh: Kalung Emas 24k 5g"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-rose-600">Harga Beli dr Konsumen</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">Rp</span>
                    <input
                      type="text"
                      required
                      value={brokerageData.buyPrice}
                      onKeyDown={handleNumberInputKeyDown}
                      onChange={(e) => setBrokerageData({ ...brokerageData, buyPrice: sanitizeNumberInput(e.target.value) })}
                      className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-mono transition-shadow"
                      placeholder="0"
                    />
                    {brokerageData.buyPrice && (
                      <p className="text-xs text-stone-400 mt-1 font-mono">Rp {formatCurrency(brokerageData.buyPrice)}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-emerald-600">Harga Tembak Pengepul</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">Rp</span>
                    <input
                      type="text"
                      required
                      value={brokerageData.sellPrice}
                      onKeyDown={handleNumberInputKeyDown}
                      onChange={(e) => setBrokerageData({ ...brokerageData, sellPrice: sanitizeNumberInput(e.target.value) })}
                      className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-mono transition-shadow"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {Number(brokerageData.sellPrice) > 0 && Number(brokerageData.buyPrice) > 0 && (
                <div className="bg-stone-900 text-white p-4 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-stone-400">Total Laba Selisih:</span>
                  <span className="font-mono font-bold text-lg text-emerald-400">
                    + Rp {(Number(brokerageData.sellPrice) - Number(brokerageData.buyPrice)).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Handshake size={20} />
                  <span>Masukkan Margin ke Kasir (+ Kas Masuk)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
