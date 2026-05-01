import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, Building, Info, X, TrendingUp, Wallet, Package, Activity } from 'lucide-react';
import { useAuthStore } from '../shared/store/authStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '../infrastructure/di/Container';
import { db } from '../shared/api/db';

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const [showFtue, setShowFtue] = useState(false);
  const dailyStats = useLiveQuery(() => DIContainer.reportQuery.getDailyStats(), []);

  useEffect(() => {
    if (user?.id === 'USR-ADMIN') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db.keyval.get('psa_has_seen_ftue').then((hasSeenFtue: any) => {
        if (!hasSeenFtue) {
          setShowFtue(true);
        }
      }).catch(console.error);
    }
  }, [user]);

  const dismissFtue = () => {
    db.keyval.put({ key: 'psa_has_seen_ftue', value: 'true' }).catch(console.error);
    setShowFtue(false);
  };

  if (!user) return null;

  const isCashier = user.role === 'CASHIER';

  return (
    <div className="flex flex-col h-full max-h-screen p-6 max-w-5xl mx-auto justify-center animate-in fade-in duration-300">
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-brand-900">
              Selamat datang, {user.name}
            </h1>
            <p className="text-stone-500 mt-2">
              Pusat Kendali PSA Business Suite
            </p>
          </div>
          <div className="text-sm font-medium text-stone-400 bg-stone-100 px-3 py-1.5 rounded-lg w-fit">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {showFtue && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 relative animate-in slide-in-from-top-4">
            <button 
              onClick={dismissFtue}
              className="absolute top-4 right-4 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900 mb-2">Panduan Pengguna Baru</h3>
                <p className="text-emerald-800 text-sm leading-relaxed mb-4">
                  Selamat datang di PSA Business Suite! Sebagai Administrator, berikut adalah langkah-langkah awal yang disarankan:
                </p>
                <ul className="space-y-2 text-sm text-emerald-700 font-medium">
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-xs">1</span>
                    Buka menu <strong>Manajemen &gt; Pengaturan Sistem</strong> untuk mengubah PIN default Anda.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-xs">2</span>
                    Buka menu <strong>Manajemen &gt; Karyawan</strong> untuk menambahkan staf kasir Anda.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-xs">3</span>
                    Buka menu <strong>Operasional Toko &gt; Cek Katalog</strong> untuk mulai memasukkan stok barang.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!isCashier && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-2 text-stone-500">
                <TrendingUp size={18} />
                <h3 className="font-bold text-xs uppercase tracking-wider">Transaksi Hari Ini</h3>
              </div>
              <p className="text-2xl font-bold text-stone-800">{dailyStats?.totalTransactions || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-2 text-stone-500">
                <Wallet size={18} />
                <h3 className="font-bold text-xs uppercase tracking-wider">Omzet Kotor</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(dailyStats?.totalRevenue || 0)}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 md:col-span-2 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-800 mb-1">Butuh Pantauan Cepat?</h3>
                <p className="text-xs text-stone-500">Akses laporan dan analitik instan toko Anda.</p>
              </div>
              <Link to="/dashboard" className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors flex items-center gap-2">
                <Activity size={16} /> Buka Analitik
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/workspace"
            className="flex flex-col items-center justify-center p-8 bg-brand-50 border-2 border-brand-100 rounded-[2rem] hover:bg-brand-100 hover:border-brand-300 transition-all active:scale-95 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-200 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform relative z-10">
              <ShoppingCart className="w-8 h-8 text-brand-900" />
            </div>
            <h2 className="text-2xl font-bold text-brand-900 mb-2 relative z-10">Operasional Toko</h2>
            <p className="text-brand-700/70 text-center text-sm relative z-10 max-w-xs">
              Portal pelayanan pelanggan, Kasir (POS), dan penerimaan Reparasi perhiasan.
            </p>
          </Link>

          <Link
            to="/office"
            className={`flex flex-col items-center justify-center p-8 bg-white border-2 border-stone-200 rounded-[2rem] hover:bg-stone-50 hover:border-stone-300 transition-all active:scale-95 group relative overflow-hidden ${
              isCashier ? 'opacity-50 pointer-events-none grayscale' : ''
            }`}
          >
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-stone-200 rounded-full blur-3xl opacity-50 -ml-10 -mb-10 pointer-events-none"></div>
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform relative z-10">
              <Building className="w-8 h-8 text-stone-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2 relative z-10">Manajemen Pusat</h2>
            <p className="text-stone-500 text-center text-sm relative z-10 max-w-xs">
              Pusat laporan, kontrol Gudang (Inventory), audit keamanan, & pengaturan staf.
            </p>
            {isCashier && <div className="absolute top-4 right-4 bg-stone-100 border border-stone-200 text-stone-500 text-xs px-2 py-1 rounded font-bold">Terkunci (Khusus Admin)</div>}
          </Link>

          {!isCashier && (
            <Link
              to="/inventory"
              className="flex items-center gap-4 p-5 bg-white border-2 border-stone-100 rounded-[1.5rem] hover:bg-stone-50 hover:border-amber-300 transition-all group md:col-span-2"
            >
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-stone-800">Manajemen Gudang & Stok</h3>
                <p className="text-stone-500 text-xs mt-0.5">Tambah produk baru, cetak barcode, dan cek pergerakan stok real-time.</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                &rarr;
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
