import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '@infrastructure/di/Container';
import { Scale, Landmark, ArrowDownRight, ArrowUpRight, Plus, ExternalLink } from 'lucide-react';
import { GoldBuyback } from '../../../shared/api/db';
import { BuybackForm } from './BuybackForm';
import { GoldLiquidationForm } from '../components/GoldLiquidationForm';
import { BackButton } from '../../../shared/components/BackButton';
import { useToastStore } from '../../../shared/store/toastStore';
import { MathUtils } from '../../../shared/utils/decimalUtils';

/**
 * @ai_context Halaman manajemen integrasi treasury (Kasir Emas).
 */
export function GoldBuybackSalesPage() {
  const buybacks = useLiveQuery(() => DIContainer.liveQueries.observeGoldBuybacks()) || [];
  const [isBuybackOpen, setIsBuybackOpen] = useState(false);
  const [isLiquidationOpen, setIsLiquidationOpen] = useState(false);
  
  const addToast = useToastStore(s => s.addToast);

  const totalBuybackWeight = buybacks.reduce((sum: number, b: GoldBuyback) => sum + b.weightGram, 0);
  const totalSoldWeight = buybacks.filter(b => b.status === 'sold_to_collector').reduce((sum: number, b: GoldBuyback) => sum + b.weightGram, 0);
  const currentGoldAssetWeight = totalBuybackWeight - totalSoldWeight;

  const currentStoredTx = buybacks.filter(b => b.status === 'stored');
  const pastSoldTx = buybacks.filter(b => b.status === 'sold_to_collector');

  return (
    <div 
      data-component-id="GoldBuybackSalesPage" 
      data-error-domain="gold"
      className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24"
    >
      <BackButton />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-900">Manajemen Aset Emas</h1>
          <p className="text-stone-500 mt-1">
            Pantau aset emas riil (Treasury) yang tersimpan di toko.
          </p>
        </div>
        <div className="flex gap-2">
          {!isLiquidationOpen && !isBuybackOpen && currentStoredTx.length > 0 && (
            <button
              onClick={() => setIsLiquidationOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <ExternalLink size={20} />
              Jual ke Pengepul
            </button>
          )}
          {!isBuybackOpen && !isLiquidationOpen && (
            <button
              onClick={() => setIsBuybackOpen(true)}
              className="flex items-center gap-2 bg-brand-900 hover:bg-brand-800 text-gold-500 px-5 py-3 rounded-2xl font-bold shadow-lg shadow-brand-900/20 transition-all active:scale-95"
            >
              <Plus size={20} />
              Beli Emas (Buyback)
            </button>
          )}
        </div>
      </div>

      {isBuybackOpen ? (
         <div className="mb-8 p-4 bg-stone-100 rounded-2xl shadow-sm border border-stone-200">
           <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl">
             <h2 className="text-xl font-bold">Input Beli Emas Baru</h2>
             <button onClick={() => setIsBuybackOpen(false)} className="text-stone-500 hover:text-stone-800 font-medium bg-stone-100 px-4 py-2 rounded-xl">Batal</button>
           </div>
           <BuybackForm hideBackButton />
         </div>
      ) : isLiquidationOpen ? (
         <div className="mb-8 p-4 bg-stone-100 rounded-2xl shadow-sm border border-stone-200">
           <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl">
             <h2 className="text-xl font-bold">Likuidasi Aset</h2>
             <button onClick={() => setIsLiquidationOpen(false)} className="text-stone-500 hover:text-stone-800 font-medium bg-stone-100 px-4 py-2 rounded-xl">Batal</button>
           </div>
           <GoldLiquidationForm currentStoredItems={currentStoredTx} onSuccess={() => setIsLiquidationOpen(false)} />
         </div>
      ) : (
        <>
          {/* Dashboard Aset Emas (Treasury Balance) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                <ArrowDownRight className="w-32 h-32 text-emerald-600" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <ArrowDownRight size={20} />
                  </div>
                  <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Total Masuk</p>
                </div>
                <h3 className="text-3xl font-black text-stone-800 tracking-tight">
                  {totalBuybackWeight.toFixed(2)} <span className="text-sm font-bold text-stone-400">Gram</span>
                </h3>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                <ArrowUpRight className="w-32 h-32 text-rose-600" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                    <ArrowUpRight size={20} />
                  </div>
                  <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Total Terjual (Pengepul)</p>
                </div>
                <h3 className="text-3xl font-black text-stone-800 tracking-tight">
                  {totalSoldWeight.toFixed(2)} <span className="text-sm font-bold text-stone-400">Gram</span>
                </h3>
              </div>
            </div>

            <div className="bg-brand-900 p-6 rounded-3xl border border-brand-800 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Landmark className="w-32 h-32 text-gold-500" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand-800 rounded-xl text-gold-500">
                    <Landmark size={20} />
                  </div>
                  <p className="text-gold-200 text-xs font-bold uppercase tracking-wider">Saldo Brankas (Tersimpan)</p>
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight">
                  {currentGoldAssetWeight.toFixed(2)} <span className="text-sm font-bold text-gold-500/80">Gram</span>
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* List Tersimpan */}
            <div>
              <h2 className="text-xl font-serif font-bold text-brand-900 mb-6 flex items-center gap-2">
                <Scale className="text-brand-900" size={24} /> Aset Emas Tersimpan
              </h2>
              {currentStoredTx.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-stone-200/60 rounded-3xl p-12 text-center shadow-sm">
                   <Scale className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                   <p className="text-stone-500 text-lg font-medium">Belum ada emas yang tersimpan di brankas.</p>
                </div>
              ) : (
                 <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                   {currentStoredTx.map((tx) => (
                      <div key={tx.id} className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-brand-900/30 hover:shadow-md transition-all">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                               <p className="text-xs font-bold text-stone-400">{new Date(tx.date).toLocaleDateString('id-ID')} • {new Date(tx.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                            <p className="text-lg font-bold text-stone-800">{tx.customerName}</p>
                            <div className="flex gap-2 mt-2">
                               <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-md text-xs font-bold font-mono text-center border border-stone-200">
                                 {tx.weightGram} g
                               </span>
                               <span className="px-2 py-1 bg-gold-50 text-gold-700 rounded-md text-xs font-bold text-center border border-gold-200">
                                 {MathUtils.roundInt(MathUtils.mul(tx.kadar, 100))}%
                               </span>
                            </div>
                         </div>
                         <div className="text-left sm:text-right border-t sm:border-t-0 border-stone-100 pt-3 sm:pt-0">
                            <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Dibeli Seharga</p>
                            <p className="text-xl font-black text-brand-900 font-mono tracking-tight">Rp {tx.buybackPrice.toLocaleString('id-ID')}</p>
                         </div>
                      </div>
                   ))}
                 </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-2">
                <ArrowUpRight className="text-stone-400" size={24} /> Riwayat Terjual
              </h2>
              {pastSoldTx.length === 0 ? (
                <div className="bg-stone-50 border border-stone-200 rounded-3xl p-8 text-center shadow-inner">
                   <p className="text-stone-500">Toko belum pernah mencatat penjualan ke pengepul.</p>
                </div>
              ) : (
                 <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                   {pastSoldTx.map((tx) => (
                      <div key={tx.id} className="bg-white opacity-80 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:opacity-100 transition-opacity shadow-sm">
                         <div>
                            <p className="text-xs font-bold text-stone-400 mb-0.5">{new Date(tx.soldDate || tx.date).toLocaleDateString('id-ID')}</p>
                            <p className="font-bold text-stone-700 text-sm">{tx.customerName}</p>
                            <p className="text-xs font-mono text-stone-500 mt-1">{tx.weightGram}g • {(tx.kadar*100).toFixed(1)}%</p>
                         </div>
                         <div className="text-left sm:text-right border-t sm:border-t-0 border-stone-100 pt-2 sm:pt-0">
                            <p className="text-[10px] font-bold text-stone-400 uppercase mb-0.5">Dijual Seharga</p>
                            <p className="text-base font-black text-emerald-700 font-mono">Rp {(tx.soldPrice || 0).toLocaleString('id-ID')}</p>
                         </div>
                      </div>
                   ))}
                 </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
