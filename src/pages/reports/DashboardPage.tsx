import React, { useState } from 'react';
import { Calendar, Download, TrendingUp, TrendingDown, Minus, Filter, X, BarChart3 } from 'lucide-react';
import { BackButton } from '../../shared/components/BackButton';
import { useToastStore } from '../../shared/store/toastStore';
import { useDashboardData } from '../../features/reports/hooks/useDashboardData';
import { DashboardKPI } from '../../features/reports/components/DashboardKPI';
import { DashboardCharts } from '../../features/reports/components/DashboardCharts';
import { DashboardSecondary } from '../../features/reports/components/DashboardSecondary';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '@infrastructure/di/Container';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#1a365d', '#D4AF37', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function CustomerSegmentationChart() {
  const segmentation = useLiveQuery(() => DIContainer.reportQuery.getCustomerSegmentation(), []);

  if (!segmentation) {
    return <div className="flex-1 flex items-center justify-center animate-pulse bg-stone-100 rounded-2xl"></div>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (segmentation.length === 0 || segmentation.every((s: any) => s.count === 0)) {
    return (
      <div className="flex-1 flex items-center justify-center border-2 border-dashed border-stone-100 rounded-2xl text-stone-400 text-sm p-8 text-center">
        Belum ada data pelanggan untuk dianalisis.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={segmentation} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="segment" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={120} />
          <Tooltip 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => {
              if (name === 'revenue') return [`Rp ${value.toLocaleString()}`, 'Total Omzet'];
              if (name === 'count') return [value, 'Jumlah Pelanggan'];
              return [value, name];
            }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="revenue" fill="#D4AF37" radius={[0, 4, 4, 0]} name="revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  totalTransactions: number;
}

export function DashboardPage() {
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const[exportConfig, setExportConfig] = useState({
    includeItems: true,
    includeCashier: true,
    includePaymentMethod: true,
    status: 'SUCCESS' as 'SUCCESS' | 'VOIDED' | 'ALL'
  });

  const { loading, transactions, revenueByCategory, revenueByPaymentMethod, salesTrends, topCustomers, lowStockItems, smartAlert, stats, cashierPerformance } = useDashboardData(startDate, endDate);

  const addToast = useToastStore((state) => state.addToast);

  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) {
      addToast("Tidak ada data untuk diekspor pada rentang tanggal ini.", "error");
      return;
    }

    let filteredTx = transactions;
    if (exportConfig.status !== 'ALL') {
      filteredTx = transactions.filter(tx => tx.status === exportConfig.status);
    }

    const headers = ['Tanggal', 'ID Transaksi'];
    if (exportConfig.includeCashier) headers.push('Kasir');
    if (exportConfig.includePaymentMethod) headers.push('Metode Pembayaran');
    headers.push('Total');
    headers.push('Status');
    if (exportConfig.includeItems) headers.push('Item');

    const rows = filteredTx.map(tx => {
      const date = new Date(tx.date).toLocaleString('id-ID').replace(/,/g, '');
      const row = [date, tx.id];
      if (exportConfig.includeCashier) row.push(`"${tx.user.replace(/"/g, '""')}"`);
      if (exportConfig.includePaymentMethod) row.push(tx.paymentMethod);
      row.push(tx.total.toString());
      row.push(tx.status);
      if (exportConfig.includeItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = tx.items.map((i: any) => `${i.name} (x${i.quantity})`).join('; ');
        row.push(`"${items.replace(/"/g, '""')}"`);
      }
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Penjualan_Custom_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
    addToast("Ekspor berhasil diunduh.", "success");
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 bg-stone-200 rounded-md w-64"></div>
          <div className="h-10 bg-stone-200 rounded-xl w-72"></div>
        </div>
        <div className="h-24 bg-stone-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-stone-200 rounded-3xl"></div>
          <div className="h-32 bg-stone-200 rounded-3xl"></div>
          <div className="h-32 bg-stone-200 rounded-3xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-stone-200 rounded-3xl"></div>
          <div className="h-96 bg-stone-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <BackButton />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif font-bold text-brand-900">Executive Dashboard</h1>
        
        {/* Date Filter & Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-stone-200 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className="flex items-center w-full sm:w-auto">
              <Calendar className="text-stone-400 ml-2 shrink-0" size={20} />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm font-medium text-stone-700 cursor-pointer w-full" />
            </div>
            <span className="text-stone-300 hidden sm:inline">-</span>
            <div className="flex items-center w-full sm:w-auto border-t sm:border-t-0 border-stone-100 pt-2 sm:pt-0">
              <Calendar className="text-stone-400 ml-2 shrink-0 sm:hidden" size={20} />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm font-medium text-stone-700 cursor-pointer w-full" />
            </div>
          </div>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-brand-900 hover:bg-brand-800 text-gold-500 px-4 py-3 sm:py-2.5 rounded-xl font-medium transition-colors shadow-sm w-full sm:w-auto"
          >
            <Download size={18} />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Smart Alert Section */}
      {smartAlert && (
        <div className={`p-5 rounded-2xl border flex items-start sm:items-center gap-4 shadow-sm ${
          smartAlert.type === 'positive' ? 'bg-emerald-50 border-emerald-200' :
          smartAlert.type === 'negative' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className={`p-3 rounded-full shrink-0 ${
            smartAlert.type === 'positive' ? 'bg-emerald-100 text-emerald-600' :
            smartAlert.type === 'negative' ? 'bg-red-100 text-red-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            {smartAlert.type === 'positive' ? <TrendingUp size={24} /> :
             smartAlert.type === 'negative' ? <TrendingDown size={24} /> :
             <Minus size={24} />}
          </div>
          <div>
            <h3 className={`font-bold text-lg ${
              smartAlert.type === 'positive' ? 'text-emerald-900' :
              smartAlert.type === 'negative' ? 'text-red-900' :
              'text-blue-900'
            }`}>Insight Hari Ini</h3>
            <p className={`text-sm mt-1 ${
              smartAlert.type === 'positive' ? 'text-emerald-700' :
              smartAlert.type === 'negative' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {smartAlert.message}
            </p>
          </div>
        </div>
      )}

      <DashboardKPI stats={stats} lowStockCount={lowStockItems?.length || 0} />
      <DashboardCharts salesTrends={salesTrends} revenueByCategory={revenueByCategory} />
      <DashboardSecondary 
        revenueByPaymentMethod={revenueByPaymentMethod} 
        cashierPerformance={cashierPerformance} 
        lowStockItems={lowStockItems} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers by Revenue */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-lg font-bold text-brand-900 mb-6 flex items-center gap-2">
            <TrendingUp className="text-stone-400" size={20} />
            Pelanggan Teratas (Berdasarkan Omzet)
          </h2>
          {topCustomers && topCustomers.length > 0 ? (
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {topCustomers.map((customer: any, idx: number) => (
                <div key={customer.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-stone-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-900 text-gold-500 flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-stone-800">{customer.name}</div>
                      <div className="text-xs text-stone-500">{customer.phoneNumber} • {customer.totalTransactions} Transaksi</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-brand-900">Rp {customer.totalRevenue.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{customer.loyaltyPoints} Poin</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-stone-400 text-sm">
              Tidak ada data pelanggan
            </div>
          )}
        </div>

        {/* Customer Segment Sales Trends */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col">
          <h2 className="text-lg font-bold text-brand-900 mb-6 flex items-center gap-2">
            <BarChart3 className="text-stone-400" size={20} />
            Tren Penjualan per Segmen
          </h2>
          <CustomerSegmentationChart />
        </div>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-brand-900 text-gold-500">
              <div className="flex items-center gap-3">
                <Download size={24} />
                <h2 className="text-xl font-serif font-bold">Kustomisasi Ekspor CSV</h2>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                  <Filter size={16} />
                  Filter Data
                </h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Status Transaksi</label>
                  <select 
                    value={exportConfig.status}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onChange={e => setExportConfig(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none"
                  >
                    <option value="SUCCESS">Hanya Berhasil</option>
                    <option value="VOIDED">Hanya Dibatalkan</option>
                    <option value="ALL">Semua Status</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">Kolom Tambahan</h3>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={exportConfig.includeItems}
                      onChange={e => setExportConfig(prev => ({ ...prev, includeItems: e.target.checked }))}
                      className="w-5 h-5 rounded border-stone-300 text-brand-900 focus:ring-brand-900"
                    />
                    <span className="text-sm font-medium text-stone-700">Detail Item (Nama & Qty)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={exportConfig.includeCashier}
                      onChange={e => setExportConfig(prev => ({ ...prev, includeCashier: e.target.checked }))}
                      className="w-5 h-5 rounded border-stone-300 text-brand-900 focus:ring-brand-900"
                    />
                    <span className="text-sm font-medium text-stone-700">Nama Kasir</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={exportConfig.includePaymentMethod}
                      onChange={e => setExportConfig(prev => ({ ...prev, includePaymentMethod: e.target.checked }))}
                      className="w-5 h-5 rounded border-stone-300 text-brand-900 focus:ring-brand-900"
                    />
                    <span className="text-sm font-medium text-stone-700">Metode Pembayaran</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 bg-stone-50 border-t border-stone-100 flex gap-3">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="flex-1 py-3 px-4 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-100 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleExportCSV}
                className="flex-2 py-3 px-4 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-colors shadow-md"
              >
                Unduh CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
