import React, { useState, useMemo } from 'react';
import { BarChart3, Calendar, User, CreditCard, Filter } from 'lucide-react';
import { useTransactions } from '../../features/reports/hooks/useTransactions';
import { TransactionList } from '../../features/reports/components/TransactionList';

export const FinanceReportPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cashier, setCashier] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const startTimestamp = useMemo(() => new Date(startDate).setHours(0, 0, 0, 0), [startDate]);
  const endTimestamp = useMemo(() => new Date(endDate).setHours(23, 59, 59, 999), [endDate]);

  const { transactions, cashiers } = useTransactions(startTimestamp, endTimestamp, cashier, paymentMethod);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      {!embedded && (
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
      )}

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
      
      {/* Transaction List */}
      <TransactionList transactions={transactions} />
    </div>
  );
};
