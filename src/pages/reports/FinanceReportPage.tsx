import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DIContainer } from '@infrastructure/di/Container';
import { BarChart3, Calendar, User, CreditCard, Search, Filter, TrendingUp, DollarSign, Percent, Activity } from 'lucide-react';
import { BackButton } from '../../shared/components/BackButton';
import { Transaction } from '../../shared/api/db';

export const FinanceReportPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cashier, setCashier] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const startTimestamp = useMemo(() => new Date(startDate).setHours(0, 0, 0, 0), [startDate]);
  const endTimestamp = useMemo(() => new Date(endDate).setHours(23, 59, 59, 999), [endDate]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportData, setReportData] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [cashiers, setCashiers] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const txs = await DIContainer.reportQuery.getTransactionsByDateRange(startTimestamp, endTimestamp);
      const uniqueCashiers = Array.from(new Set(txs.map(t => t.user)));
      setCashiers(uniqueCashiers.sort());
      
      const filteredTxs = await DIContainer.reportQuery.getTransactionsByFilters({
        startDate: startTimestamp,
        endDate: endTimestamp,
        cashier: cashier || undefined,
        paymentMethod: paymentMethod || undefined
      });
      setTransactions(filteredTxs);

      const report = await DIContainer.reportQuery.getFinancialReport(startTimestamp, endTimestamp);
      setReportData(report);
    } catch (e) {
      console.error("Failed to fetch finance report data", e);
    } finally {
      setLoading(false);
    }
  }, [startTimestamp, endTimestamp, cashier, paymentMethod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredStats = useMemo(() => {
    if (!transactions) return { totalRevenue: 0, count: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.status === 'SUCCESS') {
        acc.totalRevenue += tx.total;
        acc.count += 1;
      }
      return acc;
    }, { totalRevenue: 0, count: 0 });
  }, [transactions]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <BackButton />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-gold-500" />
            Laporan Keuangan
          </h1>
          <p className="text-stone-500 mt-1">
            Analisis mendalam performa penjualan dan profitabilitas.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
        <div className="flex items-center gap-2 text-stone-800 font-bold">
          <Filter size={20} className="text-stone-400" />
          Filter Laporan
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Dari Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-brand-900/20"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Sampai Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-brand-900/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Kasir</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <select 
                value={cashier} 
                onChange={e => setCashier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-brand-900/20 appearance-none"
              >
                <option value="">Semua Kasir</option>
                {cashiers?.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Metode Pembayaran</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <select 
                value={paymentMethod} 
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-brand-900/20 appearance-none"
              >
                <option value="">Semua Metode</option>
                <option value="CASH">Tunai (CASH)</option>
                <option value="QRIS">QRIS</option>
                <option value="TRANSFER">Transfer</option>
                <option value="SPLIT">Split Payment</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-900 rounded-3xl p-8 shadow-xl border border-brand-800 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <DollarSign className="w-40 h-40 text-gold-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm text-gold-500">
                <DollarSign size={24} />
              </div>
              <p className="text-brand-100 text-sm font-bold uppercase tracking-wider">Total Omzet</p>
            </div>
            <h3 className="text-4xl font-black text-gold-500 mb-6 tracking-tight">
              {formatCurrency(filteredStats.totalRevenue)}
            </h3>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-brand-50 px-4 py-2 rounded-xl text-sm font-medium border border-white/10">
              <Activity size={18} className="text-gold-500" />
              {filteredStats.count} Transaksi
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-6 -top-6 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-40 h-40 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingUp size={24} />
              </div>
              <p className="text-stone-500 text-sm font-bold uppercase tracking-wider">Laba Kotor (Estimasi)</p>
            </div>
            <h3 className="text-4xl font-black text-emerald-600 mb-6 tracking-tight">
              {reportData ? formatCurrency(reportData.grossProfit) : '...'}
            </h3>
            <div className="text-xs text-stone-400">
              *Laba kotor dihitung berdasarkan HPP pada saat transaksi.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200 relative overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <Percent className="w-40 h-40 text-amber-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
                <Percent size={24} />
              </div>
              <p className="text-stone-500 text-sm font-bold uppercase tracking-wider">Margin Keuntungan</p>
            </div>
            <h3 className="text-4xl font-black text-amber-500 mb-6 tracking-tight">
              {reportData ? `${reportData.margin.toFixed(2)}%` : '...'}
            </h3>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${Math.min(Math.max(reportData?.margin || 0, 0), 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Cards */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-brand-900 flex items-center gap-2">
            <Search size={20} className="text-stone-400" />
            Detail Transaksi
          </h2>
          <div className="text-sm text-stone-500 font-medium">
            Menampilkan {transactions?.length || 0} transaksi
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transactions?.map((tx) => (
            <div key={tx.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:bg-stone-50 transition-colors flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600">
                    {tx.user.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">{tx.user}</div>
                    <div className="text-xs text-stone-500 font-mono">{tx.id.slice(0, 8)}...</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-stone-900">
                    {new Date(tx.date).toLocaleDateString('id-ID')}
                  </div>
                  <div className="text-xs text-stone-500">
                    {new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                <div className="flex gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    tx.paymentMethod === 'CASH' ? 'bg-emerald-100 text-emerald-700' :
                    tx.paymentMethod === 'QRIS' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {tx.paymentMethod}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    tx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {tx.status === 'SUCCESS' ? 'Berhasil' : 'Dibatalkan'}
                  </span>
                </div>
                <div className="text-lg font-black text-brand-900">
                  {formatCurrency(tx.total)}
                </div>
              </div>
            </div>
          ))}
          {(!transactions || transactions.length === 0) && (
            <div className="col-span-full p-12 text-center text-stone-400 italic bg-white rounded-2xl border border-stone-100">
              Tidak ada transaksi ditemukan untuk filter ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
