import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '@infrastructure/di/Container';
import { Calendar, TrendingUp, DollarSign, Percent, Activity, Box, Gem, Wrench } from 'lucide-react';

// Hook untuk mengambil dan menghitung data keuangan
const useFinancialReport = (startDate: number, endDate: number) => {
  return useLiveQuery(async () => {
    return await DIContainer.reportQuery.getFinancialReport(startDate, endDate);
  }, [startDate, endDate], {
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    margin: 0,
    transactionCount: 0,
    breakdown: {
      retail: { revenue: 0, cogs: 0, grossProfit: 0 },
      gold: { revenue: 0, cogs: 0, grossProfit: 0 },
      services: { revenue: 0, cogs: 0, grossProfit: 0 }
    },
    cashFlow: {
      cashIn: 0,
      cashOut: 0,
      netCash: 0
    }
  });
};

export const RevenueReport: React.FC = () => {
  // Default: Hari ini
  const [startDateStr, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDateStr, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Konversi string YYYY-MM-DD ke timestamp (start of day & end of day)
  const startTimestamp = useMemo(() => {
    const d = new Date(startDateStr);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [startDateStr]);

  const endTimestamp = useMemo(() => {
    const d = new Date(endDateStr);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, [endDateStr]);

  const reportData = useFinancialReport(startTimestamp, endTimestamp);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Filter Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-50 text-brand-900 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800">Filter Laporan</h2>
            <p className="text-sm text-stone-500">Pilih rentang tanggal untuk melihat performa.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto min-h-[48px] px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all cursor-pointer"
            />
          </div>
          <div className="hidden sm:block text-stone-300 mt-6">-</div>
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto min-h-[48px] px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Omzet Card - Most Prominent */}
        <div className="bg-brand-900 rounded-2xl p-6 md:p-8 shadow-md border border-brand-800 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <DollarSign className="w-40 h-40 text-gold-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <DollarSign className="text-gold-500" size={24} />
              </div>
              <p className="text-brand-100 text-sm font-bold uppercase tracking-wider">Total Omzet</p>
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-gold-500 mb-6 tracking-tight">
              {formatCurrency(reportData.totalRevenue)}
            </h3>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-brand-50 px-4 py-2 rounded-xl text-sm font-medium border border-white/10">
              <Activity size={18} className="text-gold-500" />
              {reportData.transactionCount} Transaksi Berhasil
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-stone-200 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-6 -top-6 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-40 h-40 text-green-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <p className="text-stone-500 text-sm font-bold uppercase tracking-wider">Laba Kotor</p>
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-green-600 mb-6 tracking-tight">
              {formatCurrency(reportData.grossProfit)}
            </h3>
            <div className="inline-flex items-center gap-2 bg-stone-50 text-stone-600 px-4 py-2 rounded-xl text-sm font-medium border border-stone-100">
              <span className="text-stone-400">Modal:</span> {formatCurrency(reportData.totalCost)}
            </div>
          </div>
        </div>

        {/* Margin Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-stone-200 relative overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <Percent className="w-40 h-40 text-amber-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Percent className="text-amber-500" size={24} />
              </div>
              <p className="text-stone-500 text-sm font-bold uppercase tracking-wider">Margin Keuntungan</p>
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-amber-500 mb-6 tracking-tight">
              {reportData.margin.toFixed(2)}%
            </h3>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out relative" 
                style={{ width: `${Math.min(Math.max(reportData.margin, 0), 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)' }}></div>
              </div>
            </div>
            <p className="text-xs text-stone-400 font-medium mt-2 text-right">Target Margin: &gt; 20%</p>
          </div>
        </div>
      </div>

      {/* Sector Breakdown */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200">
        <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
          <Activity className="text-brand-900" size={20} />
          Analisis Laba per Sektor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Retail Sector */}
          <div className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Box size={20} />
              </div>
              <h4 className="font-bold text-stone-700">Ritel (Imitasi)</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Pendapatan</span>
                <span className="font-medium text-stone-800">{formatCurrency(reportData.breakdown.retail.revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">HPP (Moving Avg)</span>
                <span className="font-medium text-rose-600">-{formatCurrency(reportData.breakdown.retail.cogs)}</span>
              </div>
              <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                <span className="text-sm font-bold text-stone-600">Laba Kotor</span>
                <span className="font-black text-green-600">{formatCurrency(reportData.breakdown.retail.grossProfit)}</span>
              </div>
            </div>
          </div>

          {/* Gold Sector */}
          <div className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gold-100 text-gold-600 rounded-lg">
                <Gem size={20} />
              </div>
              <h4 className="font-bold text-stone-700">Emas (Treasury)</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Likuidasi</span>
                <span className="font-medium text-stone-800">{formatCurrency(reportData.breakdown.gold.revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">HPP (Avg PGE)</span>
                <span className="font-medium text-rose-600">-{formatCurrency(reportData.breakdown.gold.cogs)}</span>
              </div>
              <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                <span className="text-sm font-bold text-stone-600">Laba Kotor</span>
                <span className="font-black text-green-600">{formatCurrency(reportData.breakdown.gold.grossProfit)}</span>
              </div>
            </div>
          </div>

          {/* Services Sector */}
          <div className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Wrench size={20} />
              </div>
              <h4 className="font-bold text-stone-700">Jasa (Reparasi)</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Pendapatan Jasa</span>
                <span className="font-medium text-stone-800">{formatCurrency(reportData.breakdown.services.revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Biaya Bahan</span>
                <span className="font-medium text-rose-600">-{formatCurrency(reportData.breakdown.services.cogs)}</span>
              </div>
              <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                <span className="text-sm font-bold text-stone-600">Laba Kotor</span>
                <span className="font-black text-green-600">{formatCurrency(reportData.breakdown.services.grossProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Cash Flow Summary */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200">
        <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
          <DollarSign className="text-brand-900" size={20} />
          Ringkasan Arus Kas (Tunai)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50">
            <div className="text-sm text-stone-500 mb-1">Total Uang Masuk (Cash In)</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.cashFlow.cashIn)}</div>
            <div className="text-xs text-stone-400 mt-2">Penjualan Ritel, Jasa, Likuidasi (Tunai)</div>
          </div>
          <div className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50">
            <div className="text-sm text-stone-500 mb-1">Total Uang Keluar (Cash Out)</div>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(reportData.cashFlow.cashOut)}</div>
            <div className="text-xs text-stone-400 mt-2">Buyback Emas, Kas Kecil (Tunai)</div>
          </div>
          <div className="p-5 rounded-2xl border border-stone-100 bg-brand-50">
            <div className="text-sm text-brand-700 mb-1 font-medium">Kas Bersih (Net Cash)</div>
            <div className={`text-3xl font-black ${reportData.cashFlow.netCash >= 0 ? 'text-brand-900' : 'text-rose-600'}`}>
              {formatCurrency(reportData.cashFlow.netCash)}
            </div>
            <div className="text-xs text-brand-600/70 mt-2">Selisih Uang Masuk & Keluar</div>
          </div>
        </div>
      </div>

    </div>
  );
};

