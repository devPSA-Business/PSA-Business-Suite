import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { BarChart3, Wallet, Package, Wrench, ShieldAlert, DollarSign, TrendingUp, Clock, User, Activity, CloudCog, Settings, Database, ShieldCheck, AlertTriangle, Loader2, Lightbulb } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '../infrastructure/di/Container';
import { BackButton } from '../shared/components/BackButton';
import { UI_REGISTRY } from '../shared/constants/ui_registry';
import { useAuthStore } from '../shared/store/authStore';
import { useToastStore } from '../shared/store/toastStore';

export function OfficePage() {
  const dailyStats = useLiveQuery(() => DIContainer.reportQuery.getDailyStats(), []);
  const user = useAuthStore(state => state.user);
  const auditLogs = useLiveQuery(() => DIContainer.liveQueries.observeAuditLogs(user?.branchId, 3), [user?.branchId]);
  const addToast = useToastStore(state => state.addToast);
  
  const [chainStatus, setChainStatus] = useState<'verifying' | 'valid' | 'broken'>('verifying');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (user) {
      DIContainer.auditIntegrityService.verifyChain(user.branchId || 'HQ').then(result => {
        setChainStatus(result.isValid ? 'valid' : 'broken');
      });
    }
  }, [user]);

  const handleDailyClosure = async () => {
    if (!confirm('Anda akan mengunci data keuangan hari ini. Tindakan ini tidak dapat dibatalkan. Lanjutkan?')) return;
    setIsClosing(true);
    try {
      if (!user) throw new Error("Pengguna tidak ditemukan");
      await DIContainer.auditIntegrityService.createDailyClosure(new Date(), user.branchId || 'HQ');
      addToast('Tutup buku harian berhasil.', 'success');
      // Re-verify chain
      const result = await DIContainer.auditIntegrityService.verifyChain(user.branchId || 'HQ');
      setChainStatus(result.isValid ? 'valid' : 'broken');
    } catch (error) {
      addToast((error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setIsClosing(false);
    }
  };

  const recentLogs = auditLogs;

  const menuItems = [
    { to: '/dashboard', icon: BarChart3, label: 'Dashboard Analitik', description: 'Ringkasan performa bisnis.', color: 'bg-blue-50 text-blue-600' },
    { to: '/finance', icon: Wallet, label: 'Laporan Keuangan', description: 'Analisis pendapatan & arus kas.', color: 'bg-emerald-50 text-emerald-600' },
    { to: '/inventory', icon: Package, label: 'Gudang & Penerimaan', description: 'Kontrol stok & pergerakan.', color: 'bg-amber-50 text-amber-600' },
    { to: '/customers', icon: User, label: 'Data Pelanggan', description: 'Kelola CRM & Loyalitas.', color: 'bg-indigo-50 text-indigo-600' },
    { to: '/services', icon: Wrench, label: 'Layanan & Reparasi', description: 'Pantau status perbaikan.', color: 'bg-stone-100 text-stone-600' },
    { to: '/audit', icon: ShieldAlert, label: 'Audit Log', description: 'Catatan aktivitas sistem.', color: 'bg-rose-50 text-rose-600' },
    { to: '/office/sync-status', icon: CloudCog, label: 'Status Sinkronisasi', description: 'Pantau antrean data cloud.', color: 'bg-sky-50 text-sky-600' },
    { to: '/settings', icon: Settings, label: 'Pengaturan Sistem', description: 'Konfigurasi aplikasi.', color: 'bg-stone-100 text-stone-600' },
  ];

  return (
    <div className="flex flex-col h-full max-h-screen max-w-4xl mx-auto relative pb-12 animate-in fade-in duration-500" data-testid="W-O-01">
      <div className="shrink-0 mb-6 flex justify-between items-center">
        <BackButton />
      </div>
      {/* Header */}
      <div className="shrink-0 mb-8">
        <h1 className="text-3xl font-serif font-bold text-brand-900">{UI_REGISTRY.PAGES.OFFICE.label}</h1>
        <p className="text-stone-500 mt-2">Pusat kendali analitik dan laporan toko.</p>
      </div>

      {/* Integrity Chain Status */}
      <div className="shrink-0 mb-6">
        {chainStatus === 'verifying' && (
          <div className="flex items-center gap-2 text-sm font-bold text-stone-500 p-3 bg-stone-100 rounded-xl border border-stone-200">
            <Loader2 size={16} className="animate-spin" /> Memverifikasi Integritas Ledger...
          </div>
        )}
        {chainStatus === 'valid' && (
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <ShieldCheck size={16} /> Integritas Rantai Data Terjaga
          </div>
        )}
        {chainStatus === 'broken' && (
          <div className="flex items-center gap-2 text-sm font-bold text-red-700 p-3 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle size={16} /> PERINGATAN: Rantai Integritas Data Rusak!
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
        {/* Omzet Hari Ini */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex items-center gap-4">
          <div className="bg-brand-50 p-4 rounded-full text-brand-900">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">Omzet Hari Ini</p>
            {dailyStats === undefined ? (
              <div className="h-8 w-32 bg-stone-200 animate-pulse rounded-md mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-brand-900 mt-1">
                Rp {dailyStats.totalRevenue.toLocaleString('id-ID')}
              </p>
            )}
          </div>
        </div>

        {/* Transaksi Berhasil */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex items-center gap-4">
          <div className="bg-emerald-50 p-4 rounded-full text-emerald-600">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">Transaksi Berhasil</p>
            {dailyStats === undefined ? (
              <div className="h-8 w-16 bg-stone-200 animate-pulse rounded-md mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {dailyStats.totalTransactions}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grid Menu Manajemen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 shrink-0">
        
        {/* Kolom Kiri: Manajemen Ritel & Operasional */}
        <div className="space-y-4">
          <h2 className="font-bold text-stone-800 flex items-center gap-2 mb-4">
            <Package className="text-brand-900" size={20} />
            Manajemen Ritel & Operasional
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/inventory" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform"><Package size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs">Gudang Ritel (Imitasi)</h3>
            </Link>
            <Link to="/services" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-stone-100 text-stone-600 group-hover:scale-110 transition-transform"><Wrench size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs">Layanan & Reparasi</h3>
            </Link>
            <Link to="/customers" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform"><User size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs">Data Pelanggan</h3>
            </Link>
          </div>
        </div>

        {/* Kolom Kanan: Manajemen Brankas Emas & Keuangan */}
        <div className="space-y-4">
          <h2 className="font-bold text-stone-800 flex items-center gap-2 mb-4">
            <Wallet className="text-brand-900" size={20} />
            Manajemen Brankas Emas & Keuangan
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {user?.role === 'ADMIN' && (
              <Link to="/owner-dashboard" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group md:col-span-2 bg-gradient-to-br from-brand-900 to-brand-800">
                <div className="p-3 rounded-xl bg-gold-500/20 text-gold-400 group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
                <h3 className="font-bold text-gold-500 text-xs uppercase tracking-wider">Owner Command Center</h3>
              </Link>
            )}
            <Link to="/gold-buyback-sales" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-gold-100 text-gold-600 group-hover:scale-110 transition-transform"><DollarSign size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs">Aset Emas (Treasury)</h3>
            </Link>
            <Link to="/finance" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform"><Wallet size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs">Laporan Keuangan</h3>
            </Link>
            <Link to="/dashboard" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform"><BarChart3 size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs">Dashboard Analitik</h3>
            </Link>
          </div>
        </div>

        {/* Sistem & Audit */}
        <div className="md:col-span-2 space-y-4 mt-4">
          <h2 className="font-bold text-stone-800 flex items-center gap-2 mb-4">
            <Settings className="text-brand-900" size={20} />
            Diagnostic & IT Reporting
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/employees" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform"><User size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs">Karyawan</h3>
            </Link>
            <Link to="/audit" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform"><ShieldAlert size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs text-rose-700">Audit Log (IT)</h3>
            </Link>
            <Link to="/settings/sync-dlq" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs text-sky-700">Dead Letter (DLQ)</h3>
            </Link>
            <Link to="/settings" className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group">
              <div className="p-3 rounded-xl bg-stone-100 text-stone-600 group-hover:scale-110 transition-transform"><Settings size={24} /></div>
              <h3 className="font-bold text-stone-800 text-xs">Pengaturan Default</h3>
            </Link>
            <button
              onClick={handleDailyClosure}
              disabled={isClosing}
              className="md:col-span-4 bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-3 text-center group"
            >
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                {isClosing ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />}
              </div>
              <h3 className="font-bold text-stone-800 text-xs uppercase tracking-widest">Tutup Buku Harian (Auto-Backup)</h3>
            </button>
          </div>
        </div>
      </div>

      {/* Widget Aktivitas Audit Terakhir */}
      <div className="pt-4 flex-1 min-h-0 flex flex-col">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4 shrink-0">Aktivitas Sistem Terkini</h3>
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex-1 min-h-0">
          {recentLogs === undefined ? (
            <div className="p-8 text-center text-stone-400">Memuat aktivitas...</div>
          ) : recentLogs.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-stone-500 h-full">
              <Activity size={32} className="text-stone-300 mb-3" />
              <p className="font-medium">Belum ada aktivitas sistem.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 overflow-y-auto h-full">
              {recentLogs.map((log) => (
                <div key={log.id} className="p-5 hover:bg-stone-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 text-xs text-stone-400 font-medium shrink-0">
                    <Clock size={14} />
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-700 shrink-0">
                    <User size={14} className="text-stone-400" />
                    {log.user}
                  </div>
                  <div className="text-sm text-stone-600 truncate">
                    {log.action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <span className="text-[9px] text-stone-300 font-mono absolute bottom-1 right-2">[W-O-01]</span>
    </div>
  );
}
