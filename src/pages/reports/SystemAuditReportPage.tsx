import React, { useState } from 'react';
import { Calendar, Activity, Lock, Search } from 'lucide-react';
import { BackButton } from '../../shared/components/BackButton';

export function SystemAuditReportPage() {
  const [activeTab, setActiveTab] = useState('ov');

  return (
    <div className="h-full flex flex-col gap-6 font-sans">
      <BackButton />
      
      <header className="bg-brand-900 text-white p-5 rounded-2xl shadow-sm z-10 sticky top-0 border border-brand-800">
        <h1 className="text-xl font-bold font-serif">🔍 PSA Business Suite — Audit Report v2.0</h1>
        <p className="text-xs opacity-70 mt-1">Bedah komprehensif: Bisnis · Arsitektur · Keamanan · UX · Roadmap · Keputusan Teknis</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="bg-white/15 px-3 py-1 rounded-full text-xs flex items-center gap-1 font-medium"><Calendar size={12}/> 11 Mei 2026</span>
          <span className="bg-white/15 px-3 py-1 rounded-full text-xs flex items-center gap-1 font-medium"><Activity size={12}/> v1.4.7 (ZIP v7)</span>
          <span className="bg-white/15 px-3 py-1 rounded-full text-xs flex items-center gap-1 font-medium"><Lock size={12}/> 318 file source</span>
          <span className="bg-white/15 px-3 py-1 rounded-full text-xs flex items-center gap-1 font-medium">💼 3 Model Bisnis</span>
          <span className="bg-white/15 px-3 py-1 rounded-full text-xs flex items-center gap-1 font-medium">🤖 2 Auditor: Claude Sonnet 4.6 + HTML Audit v1.0</span>
        </div>
      </header>

      <div className="flex border-b-2 border-stone-200 overflow-x-auto gap-1">
        <button className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-4 transition-colors ${activeTab === 'ov' ? 'text-brand-900 border-brand-900' : 'text-stone-500 border-transparent hover:text-stone-800'}`} onClick={() => setActiveTab('ov')}>📊 Executive Summary</button>
        <button className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-4 transition-colors ${activeTab === 'biz' ? 'text-brand-900 border-brand-900' : 'text-stone-500 border-transparent hover:text-stone-800'}`} onClick={() => setActiveTab('biz')}>💼 3 Model Bisnis</button>
        <button className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-4 transition-colors ${activeTab === 'arch' ? 'text-brand-900 border-brand-900' : 'text-stone-500 border-transparent hover:text-stone-800'}`} onClick={() => setActiveTab('arch')}>🏗️ Arsitektur & Teknis</button>
        <button className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-4 transition-colors ${activeTab === 'sec' ? 'text-brand-900 border-brand-900' : 'text-stone-500 border-transparent hover:text-stone-800'}`} onClick={() => setActiveTab('sec')}>🔐 Keamanan</button>
        <button className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-4 transition-colors ${activeTab === 'ux' ? 'text-brand-900 border-brand-900' : 'text-stone-500 border-transparent hover:text-stone-800'}`} onClick={() => setActiveTab('ux')}>📱 UX & Navigasi</button>
        <button className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-4 transition-colors ${activeTab === 'gap' ? 'text-brand-900 border-brand-900' : 'text-stone-500 border-transparent hover:text-stone-800'}`} onClick={() => setActiveTab('gap')}>⚠️ Gap Analysis</button>
        <button className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-4 transition-colors ${activeTab === 'road' ? 'text-brand-900 border-brand-900' : 'text-stone-500 border-transparent hover:text-stone-800'}`} onClick={() => setActiveTab('road')}>🎯 Roadmap</button>
        <button className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-4 transition-colors ${activeTab === 'inst' ? 'text-brand-900 border-brand-900' : 'text-stone-500 border-transparent hover:text-stone-800'}`} onClick={() => setActiveTab('inst')}>🚀 Setup & Deploy</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 relative">
        <div className={activeTab === 'ov' ? 'block' : 'hidden'}>
          <div className="mb-4">
            <h2 className="text-xl font-bold font-serif mb-1">Ringkasan Eksekutif</h2>
            <p className="text-stone-500 text-sm">Hasil audit menyeluruh PSA Business Suite v1.4.7 — proyek POS offline-first untuk toko perhiasan imitasi satu lokasi dengan 3 stream pendapatan berbeda.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-brand-900 leading-none">85%</div>
              <div className="text-xs font-semibold text-stone-500 mt-2">Kesiapan Teknis (naik dari 78%)</div>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-gold-600 leading-none">55%</div>
              <div className="text-xs font-semibold text-stone-500 mt-2">Kesiapan UX / Lapangan</div>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-blue-600 leading-none">92%</div>
              <div className="text-xs font-semibold text-stone-500 mt-2">Keamanan Data (naik dari 90%)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold mb-3 border-b border-stone-100 pb-2">✅ Sudah Berjalan Baik (v7)</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">Clean Architecture + FSD konsisten di 318+ file</span></li>
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">Offline-first nyata — Dexie.js + sync queue berfungsi</span></li>
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">BFF Migration selesai: hashPin + queryGemini → Cloud Functions</span></li>
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">Blokir transaksi Rp 0 di CheckoutUseCase.ts</span></li>
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">Nuclear Lockout pindah ke Dexie (keyval)</span></li>
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">Per-user UUID salt PBKDF2 via ensureUserSalt()</span></li>
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">Decimal.js di semua kalkulasi uang (56+ test passing)</span></li>
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">VITE_CRYPTO_PEPPER dihapus dari api/index.ts & deploy.yml</span></li>
                <li className="flex items-start gap-2"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">DONE</span> <span className="text-stone-600 leading-relaxed">Gold Buyback: schema baru stored→sold_to_collector</span></li>
              </ul>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold mb-3 border-b border-stone-100 pb-2">⚠️ Masih Perlu Diselesaikan</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2"><span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">P1</span> <span className="text-stone-600 leading-relaxed">Dexie schema v40–41 belum di-squash (Sudah diatasi)</span></li>
                <li className="flex items-start gap-2"><span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">P1</span> <span className="text-stone-600 leading-relaxed">api/index.ts masih ada di repo (Sudah dihapus)</span></li>
                <li className="flex items-start gap-2"><span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">P1</span> <span className="text-stone-600 leading-relaxed">Cloud Functions Gen2 butuh Blaze Plan</span></li>
                <li className="flex items-start gap-2"><span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">P2</span> <span className="text-stone-600 leading-relaxed">Workspace/Petty Cash UI belum terhubung (Sudah terhubung)</span></li>
                <li className="flex items-start gap-2"><span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">P2</span> <span className="text-stone-600 leading-relaxed">Navigasi 22+ rute flat — belum ada hierarki 5 halaman</span></li>
                <li className="flex items-start gap-2"><span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">P2</span> <span className="text-stone-600 leading-relaxed">PrintServiceImpl ada tapi tidak ada UI printer di Settings</span></li>
                <li className="flex items-start gap-2"><span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">P3</span> <span className="text-stone-600 leading-relaxed">NLQ Chat UI untuk owner</span></li>
                <li className="flex items-start gap-2"><span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">P3</span> <span className="text-stone-600 leading-relaxed">Dead Stock Report</span></li>
              </ul>
            </div>
          </div>
        </div>

        {activeTab === 'biz' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold font-serif mb-1">3 Model Bisnis PSA — Logika & Implementasi</h2>
              <p className="text-stone-500 text-sm">Setiap stream memiliki logika kas, kalkulasi, dan alur transaksi yang berbeda. Inilah tantangan inti arsitektur PSA.</p>
            </div>
            {/* Model 1 */}
            <div className="border-2 border-brand-800 rounded-xl overflow-hidden mb-4">
              <div className="bg-brand-50 p-4 flex justify-between items-center">
                <div>
                  <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">MODEL 1 — UTAMA</span>
                  <h3 className="text-brand-900 font-bold text-sm mt-1">🛍️ Retail Perhiasan Imitasi</h3>
                  <p className="text-brand-700 text-xs">Xuping · Yaxiya · Titanium · Stainless Steel — Jual langsung ke konsumen</p>
                </div>
                <div className="text-right">
                  <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Margin 50–70%</span>
                  <div className="mt-1"><span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">DONE</span></div>
                </div>
              </div>
            </div>
            {/* Model 2 */}
            <div className="border-2 border-stone-200 rounded-xl overflow-hidden mb-4">
              <div className="bg-blue-50 p-4 flex justify-between items-center">
                <div>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">MODEL 2 — DIFERENSIASI</span>
                  <h3 className="text-blue-900 font-bold text-sm mt-1">🔧 Layanan Jasa Perhiasan</h3>
                  <p className="text-blue-700 text-xs">Sepuh · Reparasi · Restorasi · Penyesuaian Ukuran</p>
                </div>
                <div className="text-right">
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Bayar Saat Ambil</span>
                  <div className="mt-1"><span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full">PARTIAL</span></div>
                </div>
              </div>
            </div>
            {/* Model 3 */}
            <div className="border-2 border-orange-200 rounded-xl overflow-hidden mb-4">
              <div className="bg-orange-50 p-4 flex justify-between items-center">
                <div>
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">MODEL 3 — MARGIN TERTINGGI</span>
                  <h3 className="text-orange-900 font-bold text-sm mt-1">🏅 Buyback Emas (Gold Treasury)</h3>
                  <p className="text-orange-700 text-xs">Beli emas dari konsumen → simpan → jual ke pengepul.</p>
                </div>
                <div className="text-right">
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Spread Margin</span>
                  <div className="mt-1"><span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">DONE</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'arch' && (
          <div className="space-y-4">
             <div className="mb-4">
              <h2 className="text-xl font-bold font-serif mb-1">Arsitektur Sistem & Status Migrasi</h2>
              <p className="text-stone-500 text-sm">Stack teknologi, keputusan arsitektur kritis, dan status migrasi BFF → Cloud Functions.</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <h4 className="text-green-800 font-bold text-sm">✅ MIGRASI BFF SELESAI (Keputusan Strategis)</h4>
              <p className="text-green-700 text-xs mt-1">Semua endpoint sensitif (hash-pin, ask-gemini) telah dipindahkan dari Express BFF ke Firebase Cloud Functions Gen1.</p>
            </div>
            <div className="bg-white border text-sm border-stone-200 rounded-xl p-4 shadow-sm font-mono overflow-x-auto text-xs whitespace-pre">
{`┌──────────────────────────────────────────────────────────┐
│  TABLET/HP KASIR (PWA — Offline-First)                   │
│  React 19 + Vite + TanStack Router + Tailwind v4         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ UI Layer (features/*/ui/)                          │  │
│  │    ↓ dispatch                                      │  │
│  │ Application Layer (features/*/usecases/)           │  │
│  │    ↓ via UnitOfWork                                │  │
│  │ Infrastructure Layer                               │  │
│  │ ├─ Dexie.js (IndexedDB) ← PRIMARY READ/WRITE      │  │
└──────────────┬───────────────────────────────────────────┘
               │ HTTPS (Firebase SDK)
┌──────────────▼───────────────────────────────────────────┐
│  FIREBASE CLOUD (Free Tier + Blaze untuk Functions)      │
└──────────────────────────────────────────────────────────┘`}
            </div>
          </div>
        )}

        {activeTab === 'sec' && (
          <div className="space-y-4">
             <div className="mb-4">
              <h2 className="text-xl font-bold font-serif mb-1">Audit Keamanan — Zero-Trust Architecture</h2>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <h4 className="text-green-800 font-bold text-sm">✅ Keamanan Skor 92%</h4>
              <p className="text-green-700 text-xs mt-1">Peningkatan signifikan. Semua P1 keamanan dari audit sebelumnya ditutup di v7.</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-stone-50"><th className="p-2">Layer</th><th className="p-2">Mekanisme</th><th className="p-2">Status</th></tr></thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Database Lokal</td><td className="p-2">AES-GCM 256-bit</td><td className="p-2">✅ Aktif</td></tr>
                  <tr className="border-b"><td className="p-2">PIN Hashing</td><td className="p-2">PBKDF2 + CRYPTO_PEPPER</td><td className="p-2">✅ Aktif</td></tr>
                  <tr className="border-b"><td className="p-2">RBAC & API Rules</td><td className="p-2">ADMIN · MANAGER · CASHIER</td><td className="p-2">✅ Aktif</td></tr>
                  <tr className="border-b"><td className="p-2">Secret Management</td><td className="p-2">GCP Secret Manager</td><td className="p-2">✅ Aktif</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {['ux', 'road', 'gap', 'inst'].includes(activeTab) && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-8 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mb-4"><Search size={24} className="text-stone-400"/></div>
             <p className="text-brand-900 font-bold">Menu ini tersedia di versi desktop penuh.</p>
             <p className="text-stone-500 text-sm mt-1">Implementasi tab roadmap & workflow sedang berjalan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
