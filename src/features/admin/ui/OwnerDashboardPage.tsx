import { logger } from '@lib/logger';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../../../shared/store/authStore';
import { analyticsService, DailyMetricData, ProductMetricData } from '../../../application/services/AnalyticsService';
import { UserRole } from '../../../domain/models/User';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TrendingUp, AlertTriangle, Package, DollarSign, Activity, Settings, ArrowRight, Save, LayoutGrid, Filter, ShieldAlert, CheckCircle2, MessageSquare } from 'lucide-react';
import { db } from '../../../shared/api/db';
import { SmartInsights } from '../components/SmartInsights';
import { useToastStore } from '../../../shared/store/toastStore';
import { MathUtils } from '../../../shared/utils/decimalUtils';

/**
 * @ai_context Halaman Dashboard Khusus Owner (Phase 7.1 & 7.2 Extension + SPRINT 7.3 Fraud Watchdog).
 * @security_tier HIGH (Hanya Admin).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomScatterTooltip = ({ active, payload }: { active?: boolean, payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-stone-200 shadow-xl rounded-lg text-xs z-50">
        <p className="font-bold text-stone-800 mb-1">{data.name}</p>
        <div className="flex justify-between gap-4 text-stone-600"><span>Kategori:</span> <span className="font-mono">{data.category || 'N/A'}</span></div>
        <div className="flex justify-between gap-4 text-stone-600"><span>Terjual:</span> <span className="font-mono">{data.quantity}</span></div>
        <div className="flex justify-between gap-4 text-stone-600"><span>Gross Profit:</span> <span className="font-mono text-emerald-600">Rp {Math.round(data.grossProfit).toLocaleString('id-ID')}</span></div>
        <div className="flex justify-between gap-4 text-stone-600"><span>Turnover:</span> <span className="font-mono">{typeof data.turnover === 'number' ? data.turnover.toFixed(2) : data.turnover}</span></div>
      </div>
    );
  }
  return null;
};

interface TxItem {
  stockId: string;
  name: string;
  unitCost: number;
  quantity: number;
  price: number;
  suggestedCost?: number;
}

interface Tx {
  id: string;
  date: string;
  items: TxItem[];
}

export const OwnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { addToast } = useToastStore();

  const [dailyData, setDailyData] = useState<DailyMetricData[]>([]);
  const [productData, setProductData] = useState<ProductMetricData[]>([]);
  const [productRanking, setProductRanking] = useState<ProductMetricData[]>([]);
  const [missingCostTxs, setMissingCostTxs] = useState<Tx[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isPatching, setIsPatching] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [pendingCostPatch, setPendingCostPatch] = useState<Record<string, Record<string, string>>>({});

  // Feature flags SPRINT 7.4 Soft Launch
  const [flags] = useState({ nlq: true, nlqCache: true, nlqFallback: true });

  // 7.2 Extension: Category Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const prevCategoryRef = useRef<string>('ALL');

  const endDateMs = Date.now();
  const startDateMs = endDateMs - 30 * 24 * 60 * 60 * 1000;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dData = await analyticsService.getDailyMetrics(startDateMs, endDateMs);
      const ranking = await analyticsService.getProductRanking(startDateMs, endDateMs);
      const anomalies = await analyticsService.getMissingCostScan(startDateMs, endDateMs);

      setDailyData(dData);
      setProductRanking(ranking);
      // Top 10 unfiltered default
      setProductData(ranking.slice(0, 10)); 
      
      setMissingCostTxs(anomalies);
      
      const initPatches: Record<string, Record<string, string>> = {};
      anomalies.forEach(tx => {
        initPatches[tx.id] = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tx.items.forEach((item: any) => {
          if (!item.unitCost || item.unitCost === 0) {
            initPatches[tx.id][item.stockId] = (item.suggestedCost || 0).toString();
          }
        });
      });
      setPendingCostPatch(initPatches);

      if (!sessionStorage.getItem('dashboard_audited')) {
        const lastLog = await db.audit_logs.orderBy('timestamp').last();
        const lastHash = lastLog ? lastLog.hash : '0';
        const details = `Owner mengakses Profit Analytics Dashboard (Cost Anomaly: ${anomalies.length})`;
        const encoder = new TextEncoder();
        const data = encoder.encode(lastHash + Date.now().toString() + 'ACCESS_ANALYTICS' + user!.id + details);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        await db.audit_logs.add({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          action: 'ACCESS_ANALYTICS',
          user: user!.id,
          details,
          hash,
          previousHash: lastHash
        });
        sessionStorage.setItem('dashboard_audited', 'true');
      }

    } catch (e) {
      logger.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== UserRole.ADMIN) {
      navigate({ to: '/' });
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Derived state with useMemo for fast filtering
  const filteredRanking = useMemo(() => {
      if (selectedCategory === 'ALL') return productRanking;
      return productRanking.filter(p => p.stockCategory === selectedCategory);
  }, [productRanking, selectedCategory]);

  useEffect(() => {
      setProductData(filteredRanking.slice(0, 10));
  }, [filteredRanking]);

  const handleApplyCostPatch = async (txId: string) => {
    if (!user) return;
    setIsPatching(true);
    try {
      const numRecord: Record<string, number> = {};
      Object.keys(pendingCostPatch[txId] || {}).forEach(k => {
        numRecord[k] = parseInt(pendingCostPatch[txId][k].replace(/\D/g, '') || '0', 10);
      });

      const success = await analyticsService.patchTransactionCost(txId, numRecord, user.id);
      if (success) {
        addToast("HPP Transaksi berhasil diperbaiki dan diamankan ke Audit Log.", "success");
        await loadData();
      } else {
        addToast("Gagal menambal HPP, cek konsol.", "error");
      }
    } finally {
      setIsPatching(false);
    }
  };

  const handlePatchInputChange = (txId: string, stockId: string, val: string) => {
     setPendingCostPatch(prev => ({
       ...prev,
       [txId]: {
         ...(prev[txId] || {}),
         [stockId]: val
       }
     }));
  };

  if (isLoading) {
    return <div className="p-8 text-center mt-20"><Activity className="animate-spin inline-block mr-2 text-brand-900"/> <span className="font-medium text-stone-500">Mengkalkulasi Agregasi HPP...</span></div>;
  }

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const totalOmzet30d = dailyData.reduce((acc, curr) => acc + curr.omzetTotal, 0);
  const totalProfit30d = dailyData.reduce((acc, curr) => acc + curr.grossProfitTotal, 0);

  const getCategoryCount = (cat: string) => filteredRanking.filter(p => p.category?.includes(cat)).length;

  return (
    <div className="p-4 md:p-6 lg:p-8" data-component-id="OwnerDashboard" data-error-domain="analytics">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="text-brand-900" size={32} />
            Owner Command Center
          </h1>
          <p className="text-stone-500 mt-1">Intelegensi Profit & Audit Integritas HPP</p>
        </div>
        <div className="text-sm font-bold bg-stone-100 text-stone-600 px-4 py-2 rounded-full border border-stone-200">
          30 Hari Terakhir
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-center">
          <div className="text-sm font-semibold text-stone-500 mb-1 flex items-center gap-2"><DollarSign size={16}/> Total Omzet (30d)</div>
          <div className="text-3xl lg:text-4xl font-bold text-brand-900">{formatRupiah(totalOmzet30d)}</div>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-200 flex flex-col justify-center">
          <div className="text-sm font-semibold text-emerald-800 mb-1 flex items-center gap-2"><Activity size={16}/> Gross Profit (30d)</div>
          <div className="text-3xl lg:text-4xl font-bold text-emerald-700">{formatRupiah(totalProfit30d)}</div>
        </div>
        <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-center cursor-pointer transition-colors ${missingCostTxs.length > 0 ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-white border-stone-200'}`} onClick={() => missingCostTxs.length > 0 && setShowCostModal(true)}>
          <div className={`text-sm font-semibold mb-1 flex items-center justify-between ${missingCostTxs.length > 0 ? 'text-amber-800' : 'text-stone-500'}`}>
            <span className="flex items-center gap-2"><AlertTriangle size={16}/> HPP Bolong</span>
          </div>
          <div className={`text-3xl lg:text-4xl font-bold ${missingCostTxs.length > 0 ? 'text-amber-700' : 'text-stone-300'}`}>
            {missingCostTxs.length} <span className="text-sm font-medium ml-1">Nota</span>
          </div>
        </div>
      </div>

      <SmartInsights dailyData={dailyData} productRanking={productRanking} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Trend Omzet & Profit Harian</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <Line type="monotone" dataKey="omzetTotal" stroke="#3b82f6" strokeWidth={3} name="Omzet Harian" dot={false} />
                <Line type="monotone" dataKey="grossProfitTotal" stroke="#10b981" strokeWidth={3} name="Gross Profit" dot={false} />
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} minTickGap={30} />
                <YAxis tickFormatter={(val) => `Rp ${val / 1000}k`} tick={{fontSize: 12}} width={80} />
                <RechartsTooltip formatter={(value: unknown) => formatRupiah(Number(value))} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Intelligence Category breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <LayoutGrid className="text-brand-900" /> Matrix Margin vs Kecepatan Penjualan
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {['ALL', 'GOLD_BAR', 'GOLD_JEWELLERY', 'ACCESSORIES'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-brand-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  {cat === 'ALL' ? 'Semua Produk' : cat === 'GOLD_BAR' ? 'Logam Mulia (24K)' : cat === 'GOLD_JEWELLERY' ? 'Perhiasan' : 'Jasa/Aksesoris'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl relative overflow-hidden group">
                 <div className="text-sm font-bold text-emerald-800">⭐ STAR</div>
                 <div className="text-xs text-emerald-600 mb-2">Fast Mover + Margin Optimal</div>
                 <div className="text-3xl font-bold text-emerald-900">{getCategoryCount('STAR')} <span className="text-sm font-medium">Item</span></div>
                 <div className="absolute top-2 right-2 opacity-10 blur-[2px] group-hover:blur-0 group-hover:opacity-40 transition-all"><TrendingUp size={48} /></div>
               </div>
               <div className="p-4 border border-blue-200 bg-blue-50 rounded-xl relative overflow-hidden group">
                 <div className="text-sm font-bold text-blue-800">🛒 TRAFFIC BUILDER</div>
                 <div className="text-xs text-blue-600 mb-2">Fast Mover + Margin Tipis</div>
                 <div className="text-3xl font-bold text-blue-900">{getCategoryCount('TRAFFIC')} <span className="text-sm font-medium">Item</span></div>
                 <div className="absolute top-2 right-2 opacity-10 blur-[2px] group-hover:blur-0 group-hover:opacity-40 transition-all"><Activity size={48} /></div>
               </div>
               <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl relative overflow-hidden group">
                 <div className="text-sm font-bold text-amber-800">💤 SLEEPING GIANT</div>
                 <div className="text-xs text-amber-600 mb-2">Slow Mover + Margin Lebar</div>
                 <div className="text-3xl font-bold text-amber-900">{getCategoryCount('SLEEPING')} <span className="text-sm font-medium">Item</span></div>
                 <div className="absolute top-2 right-2 opacity-10 blur-[2px] group-hover:blur-0 group-hover:opacity-40 transition-all"><DollarSign size={48} /></div>
               </div>
               <div className="p-4 border border-rose-200 bg-rose-50 rounded-xl relative overflow-hidden group">
                 <div className="text-sm font-bold text-rose-800">❌ DEAD STOCK</div>
                 <div className="text-xs text-rose-600 mb-2">Slow Mover + Margin Minus/Kecil</div>
                 <div className="text-3xl font-bold text-rose-900">{getCategoryCount('DEAD')} <span className="text-sm font-medium">Item</span></div>
                 <div className="absolute top-2 right-2 opacity-10 blur-[2px] group-hover:blur-0 group-hover:opacity-40 transition-all"><AlertTriangle size={48} /></div>
               </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Detailed Scatter Plot for Kuadran Visual */}
             <div>
               <h3 className="font-bold text-sm text-stone-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                 <span>📍 Sebaran Matrix (Scatter)</span>
               </h3>
               <div className="bg-white border rounded-lg overflow-hidden h-64 p-2 shadow-sm relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                      <XAxis type="number" dataKey="turnover" name="Turnover" tick={{fontSize: 10}} label={{ value: 'Turnover (Kecepatan)', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#78716c' }} />
                      <YAxis type="number" dataKey="normalizedMarginPct" name="Margin" tick={{fontSize: 10}} label={{ value: 'Normalized Margin', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#78716c' }} />
                      <ZAxis type="number" range={[50, 400]} />
                      <RechartsTooltip cursor={{strokeDasharray: '3 3'}} content={<CustomScatterTooltip />} />
                      
                      {/* Separate scatters to get different colors per semantic category */}
                      <Scatter name="Star" data={filteredRanking.filter(p => (p.category||'').includes('STAR'))} fill="#059669" />
                      <Scatter name="Traffic" data={filteredRanking.filter(p => (p.category||'').includes('TRAFFIC'))} fill="#2563eb" />
                      <Scatter name="Sleeping" data={filteredRanking.filter(p => (p.category||'').includes('SLEEPING'))} fill="#d97706" />
                      <Scatter name="Dead" data={filteredRanking.filter(p => (p.category||'').includes('DEAD'))} fill="#e11d48" />
                    </ScatterChart>
                  </ResponsiveContainer>
               </div>
             </div>
             
             {/* Product Bar Chart representation of current filtered mode */}
             <div>
                <h3 className="font-bold text-sm text-stone-500 uppercase tracking-widest mb-3">Top 10 Volume Paling Laris</h3>
                <div className="h-64 w-full bg-stone-50 border rounded-lg p-2 shadow-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                      <XAxis type="number" hide />
                      <YAxis dataKey="productName" type="category" width={110} tick={{fontSize: 10, fill: '#57534e'}} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: '#f5f5f4'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="qtySold" fill="#4f46e5" name="Qty Terjual" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Modal Missing Cost */}
      {showCostModal && (
        // (Isi modal sama seperti yang kemarin)
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 text-rose-900">
                <div className="bg-rose-200 p-2 rounded-full"><AlertTriangle size={20} className="text-rose-700"/></div>
                <div>
                  <h2 className="text-xl font-bold">Audit Harga Pokok (HPP) Bolong</h2>
                  <p className="text-sm text-rose-700 mt-1">Ditemukan <b>{missingCostTxs.length} transaksi</b> yang berpotensi merusak akurasi Gross Profit. Mohon tambal nilai HPP.</p>
                </div>
              </div>
              <button className="text-rose-500 hover:text-rose-800 font-bold px-4 py-2" onClick={() => setShowCostModal(false)}>TUTUP (X)</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-stone-50 space-y-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 text-sm">
                 <b className="font-bold">Info Keamanan Bisnis (Emas vs Imitasi):</b> HPP untuk emas dinamis setiap hari. Sistem menyarankan Cost berdasarkan harga stok hari ini, namun Anda WAJIB memvalidasi dan memodifikasi angkanya menjadi harga beli riil di masa lalu agar laporan valid.
              </div>

              {missingCostTxs.map((tx: Tx) => {
                const isReady = Object.values(pendingCostPatch[tx.id] || {}).every(v => parseInt(v.replace(/\D/g, '') || '0', 10) > 0);
                return (
                  <div key={tx.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-stone-100 p-3 border-b flex justify-between items-center text-sm">
                      <div className="font-bold text-stone-700">Nota: {tx.id}</div>
                      <div className="text-stone-500">{new Date(tx.date).toLocaleDateString()}</div>
                    </div>
                    <div className="p-4 space-y-4">
                      {tx.items.filter((i: TxItem) => i.unitCost === 0 || !i.unitCost).map((item: TxItem) => (
                        <div key={item.stockId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-stone-50 rounded-lg border border-rose-100 border-l-4 border-l-rose-500">
                           <div className="flex-1">
                             <div className="font-bold text-stone-800">{item.name}</div>
                             <div className="text-xs text-stone-500">Terjual: {item.quantity} | Revenue: {formatRupiah(MathUtils.mul(item.price, item.quantity))}</div>
                           </div>
                           <div className="flex flex-col gap-1 w-full sm:w-64">
                             <label className="text-[10px] font-bold text-stone-500 uppercase">Perbaiki HPP per Unit <span className="text-rose-500">*</span></label>
                             <div className="relative">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">Rp</span>
                               <input 
                                 type="text" 
                                 className="w-full pl-9 pr-3 py-2 border rounded-md font-bold text-stone-800 border-stone-300 focus:border-brand-900 focus:ring-1 focus:ring-brand-900"
                                 value={pendingCostPatch[tx.id]?.[item.stockId] ? parseInt(pendingCostPatch[tx.id][item.stockId].replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''}
                                 onChange={(e) => handlePatchInputChange(tx.id, item.stockId, e.target.value)}
                               />
                             </div>
                             <div className="text-[10px] text-blue-600 mt-1 cursor-pointer hover:underline" onClick={() => handlePatchInputChange(tx.id, item.stockId, (item.suggestedCost || 0).toString())}>
                               Gunakan nilai stok saat ini: {formatRupiah(item.suggestedCost || 0)}
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-stone-50 border-t flex justify-end">
                      <button 
                        onClick={() => handleApplyCostPatch(tx.id)}
                        disabled={!isReady || isPatching}
                        className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${isReady ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
                      >
                         {isPatching ? 'Memproses...' : 'Terapkan (Patch) HPP Transaksi'} <ArrowRight size={16}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OwnerDashboardPage;
