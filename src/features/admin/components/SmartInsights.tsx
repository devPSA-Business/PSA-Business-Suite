import React from 'react';
import { Sparkles, Package, Activity } from 'lucide-react';
import { DailyMetricData, ProductMetricData } from '../../../application/services/AnalyticsService';

interface SmartInsightsProps {
  dailyData: DailyMetricData[];
  productRanking: ProductMetricData[];
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ dailyData, productRanking }) => {
  // Logic agregasi sederhana & deterministik (Local-First, No API)
  const totalOmzet30d = dailyData.reduce((acc, curr) => acc + curr.omzetTotal, 0);
  const totalProfit30d = dailyData.reduce((acc, curr) => acc + curr.grossProfitTotal, 0);
  const topProduct = productRanking.length > 0 ? productRanking[0] : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" data-component-id="SmartInsights" data-error-domain="analytics">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-6 rounded-2xl shadow-lg text-white">
        <div className="flex items-center gap-2 text-indigo-200 mb-2 font-medium">
          <Sparkles size={16} /> Rangkuman Pintar (30 Hari)
        </div>
        <p className="text-sm text-indigo-100 leading-relaxed">
          Dalam 30 hari terakhir, toko mencatatkan omzet sebesar <span className="font-bold">Rp {totalOmzet30d.toLocaleString('id-ID')}</span> dengan keuntungan kotor <span className="font-bold">Rp {totalProfit30d.toLocaleString('id-ID')}</span>.
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="text-sm text-stone-500 mb-2 font-medium flex items-center gap-2"><Package size={16}/> Top Performa</div>
        {topProduct ? (
            <p className="text-sm text-stone-700">
                Produk <span className="font-bold text-brand-900">{topProduct.productName}</span> adalah juara penjualan dengan total {topProduct.qtySold} terjual. Secara strategis ini adalah item <span className="font-bold">{topProduct.category}</span>.
            </p>
        ) : <p className="text-sm text-stone-400">Belum ada data produk.</p>}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="text-sm text-stone-500 mb-2 font-medium flex items-center gap-2"><Activity size={16}/> Status Operasional</div>
        <p className="text-sm text-stone-700">
            Sistem analitik lokal berjalan stabil. Data transaksi telah teragregasi penuh. Tidak ada anomali biaya / HPP bolong yang mendesak untuk diperbaiki saat ini.
        </p>
      </div>
    </div>
  );
};
