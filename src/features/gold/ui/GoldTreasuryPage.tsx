/**
 * @ai_context Halaman utama Gold Treasury — manajemen aset emas terpisah dari kas retail.
 * @business_rule Kas emas (Gold Treasury) adalah entitas TERPISAH dari kas utama toko.
 *   Buyback = Emas MASUK ke brankas, uang KELUAR dari gold_cash.
 *   Liquidasi = Emas KELUAR ke pengepul, uang MASUK ke gold_cash.
 * @security_tier HIGH — hanya ADMIN dan MANAGER
 */
import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '@infrastructure/di/Container';
import {
  Landmark, ArrowDownToLine, ArrowUpFromLine, TrendingUp,
  Scale, BarChart3, ShieldCheck, AlertTriangle, RefreshCw,
  ChevronRight, Info
} from 'lucide-react';
import { BackButton } from '@shared/components/BackButton';
import { MathUtils } from '@shared/utils/decimalUtils';
import { BuybackForm } from './BuybackForm';
import { GoldLiquidationForm } from '../components/GoldLiquidationForm';
import type { GoldBuyback } from '@shared/api/db';

// ─── Sub-component: KPI Card ──────────────────────────────────────────────
function KpiCard({
  title, value, unit, sub, color, icon: Icon, highlight
}: {
  title: string; value: string | number; unit?: string; sub?: string;
  color: string; icon: React.FC<{ size?: number; className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div
      data-component-id="GoldKpiCard"
      className={`relative overflow-hidden rounded-3xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md ${
        highlight
          ? 'bg-brand-900 border-brand-800 text-white'
          : 'bg-white border-stone-200'
      }`}
    >
      <div className="absolute -right-4 -top-4 opacity-[0.04]">
        <Icon size={96} className={color} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className={`p-2 rounded-xl ${highlight ? 'bg-brand-800' : 'bg-stone-50'}`}>
            <Icon size={18} className={color} />
          </div>
          <p className={`text-xs font-bold uppercase tracking-wider ${highlight ? 'text-gold-200' : 'text-stone-400'}`}>
            {title}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <p className={`text-3xl font-black tracking-tight ${highlight ? 'text-white' : 'text-stone-800'}`}>
            {value}
          </p>
          {unit && (
            <span className={`text-sm font-bold mb-1 ${highlight ? 'text-gold-400' : 'text-stone-400'}`}>
              {unit}
            </span>
          )}
        </div>
        {sub && (
          <p className={`text-xs mt-1 ${highlight ? 'text-gold-200/70' : 'text-stone-400'}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: Transaction Row ──────────────────────────────────────────
function TxRow({ tx, type }: { tx: GoldBuyback; type: 'stored' | 'sold' }) {
  const isSold = type === 'sold';
  const profit = isSold
    ? MathUtils.roundInt(MathUtils.sub(tx.soldPrice || 0, tx.buybackPrice))
    : null;
  const isProfit = profit !== null && profit >= 0;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-brand-300 hover:shadow-sm transition-all">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSold ? 'bg-stone-400' : 'bg-emerald-500 animate-pulse'}`} />
            <p className="text-xs text-stone-400 font-semibold">
              {new Date(isSold ? (tx.soldDate || tx.date) : tx.date).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <p className="font-bold text-stone-800 text-sm truncate">{tx.customerName}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-xs font-bold border border-stone-200">
              {tx.weightGram}g
            </span>
            <span className="px-2 py-0.5 bg-gold-50 text-gold-700 rounded-md text-xs font-bold border border-gold-200">
              {MathUtils.roundInt(MathUtils.mul(tx.kadar, 100))}%
            </span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-200">
              {tx.paymentMethod}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-stone-400 uppercase font-bold mb-1">
            {isSold ? 'Dijual' : 'Dibeli'}
          </p>
          <p className={`text-base font-black font-mono tracking-tight ${isSold ? 'text-emerald-700' : 'text-brand-900'}`}>
            Rp {(isSold ? (tx.soldPrice || 0) : tx.buybackPrice).toLocaleString('id-ID')}
          </p>
          {profit !== null && (
            <div className={`flex items-center justify-end gap-1 mt-1 text-xs font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isProfit ? <TrendingUp size={12} /> : <ArrowDownToLine size={12} />}
              {isProfit ? '+' : ''}Rp {Math.abs(profit).toLocaleString('id-ID')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ActiveView = 'dashboard' | 'buyback' | 'liquidate';

export function GoldTreasuryPage() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  const allBuybacks = useLiveQuery(
    () => DIContainer.liveQueries.observeGoldBuybacks(),
    [],
    [] as GoldBuyback[]
  );

  // ─── Computed Treasury Metrics ──────────────────────────────────────────
  const metrics = useMemo(() => {
    const stored = allBuybacks.filter(b => b.status === 'stored');
    const sold = allBuybacks.filter(b => b.status === 'sold_to_collector');

    const totalWeightIn = allBuybacks.reduce((s, b) => MathUtils.add(s, b.weightGram), 0);
    const totalWeightOut = sold.reduce((s, b) => MathUtils.add(s, b.weightGram), 0);
    const currentWeight = stored.reduce((s, b) => MathUtils.add(s, b.weightGram), 0);

    const totalCapital = allBuybacks.reduce((s, b) => MathUtils.add(s, b.buybackPrice), 0);
    const storedCapital = stored.reduce((s, b) => MathUtils.add(s, b.buybackPrice), 0);
    const soldRevenue = sold.reduce((s, b) => MathUtils.add(s, b.soldPrice || 0), 0);
    const soldCost = sold.reduce((s, b) => MathUtils.add(s, b.buybackPrice), 0);
    const realizedProfit = MathUtils.sub(soldRevenue, soldCost);

    const avgKadar = stored.length > 0
      ? stored.reduce((s, b) => MathUtils.add(s, b.kadar), 0) / stored.length
      : 0;

    const avgPricePerGram = stored.length > 0
      ? storedCapital / (currentWeight || 1)
      : 0;

    return {
      stored,
      sold,
      totalWeightIn: totalWeightIn.toFixed(2),
      totalWeightOut: totalWeightOut.toFixed(2),
      currentWeight: currentWeight.toFixed(2),
      totalCapital,
      storedCapital,
      soldRevenue,
      realizedProfit,
      avgKadar: MathUtils.roundInt(MathUtils.mul(avgKadar, 100)),
      avgPricePerGram: MathUtils.roundInt(avgPricePerGram),
      transactionCount: allBuybacks.length,
    };
  }, [allBuybacks]);

  const isLoaded = allBuybacks !== undefined;

  return (
    <div
      data-component-id="GoldTreasuryPage"
      data-error-domain="gold"
      className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-28"
    >
      <BackButton />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-gold-50 rounded-xl border border-gold-200">
              <Landmark size={22} className="text-gold-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-brand-900">Gold Treasury</h1>
          </div>
          <p className="text-stone-500 text-sm ml-12">
            Manajemen kas emas terpisah — beli, simpan, dan likuidasi ke pengepul.
          </p>
        </div>

        {activeView === 'dashboard' && (
          <div className="flex gap-2 self-end sm:self-auto">
            {metrics.stored.length > 0 && (
              <button
                onClick={() => setActiveView('liquidate')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 text-sm transition-all active:scale-95"
              >
                <ArrowUpFromLine size={16} />
                Jual ke Pengepul
              </button>
            )}
            <button
              onClick={() => setActiveView('buyback')}
              className="flex items-center gap-2 bg-brand-900 hover:bg-brand-800 text-gold-500 px-4 py-3 rounded-2xl font-bold shadow-lg shadow-brand-900/20 text-sm transition-all active:scale-95"
            >
              <ArrowDownToLine size={16} />
              Beli Emas
            </button>
          </div>
        )}

        {activeView !== 'dashboard' && (
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 px-4 py-3 rounded-2xl font-bold bg-stone-100 hover:bg-stone-200 text-sm transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            Kembali ke Dashboard
          </button>
        )}
      </div>

      {/* ── Form Views ── */}
      {activeView === 'buyback' && (
        <div className="mb-8 p-5 bg-stone-50 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-stone-200">
            <ArrowDownToLine size={18} className="text-brand-700" />
            <h2 className="text-lg font-bold text-brand-900">Input Pembelian Emas (Buyback)</h2>
          </div>
          <BuybackForm hideBackButton onSuccess={() => setActiveView('dashboard')} />
        </div>
      )}

      {activeView === 'liquidate' && (
        <div className="mb-8 p-5 bg-stone-50 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-stone-200">
            <ArrowUpFromLine size={18} className="text-emerald-700" />
            <h2 className="text-lg font-bold text-stone-900">Jual Emas ke Pengepul (Likuidasi)</h2>
          </div>
          <GoldLiquidationForm
            currentStoredItems={metrics.stored}
            onSuccess={() => setActiveView('dashboard')}
          />
        </div>
      )}

      {activeView === 'dashboard' && (
        <>
          {/* ── KPI Grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              title="Brankas (Tersimpan)"
              value={isLoaded ? metrics.currentWeight : '...'}
              unit="Gram"
              sub={`${metrics.stored.length} lot aktif`}
              color="text-gold-600"
              icon={Landmark}
              highlight
            />
            <KpiCard
              title="Total Masuk"
              value={isLoaded ? metrics.totalWeightIn : '...'}
              unit="Gram"
              sub={`Rp ${metrics.totalCapital.toLocaleString('id-ID')}`}
              color="text-emerald-600"
              icon={ArrowDownToLine}
            />
            <KpiCard
              title="Total Terjual"
              value={isLoaded ? metrics.totalWeightOut : '...'}
              unit="Gram"
              sub={`${metrics.sold.length} transaksi`}
              color="text-rose-500"
              icon={ArrowUpFromLine}
            />
            <KpiCard
              title="Realisasi Profit"
              value={`Rp ${Math.abs(metrics.realizedProfit).toLocaleString('id-ID')}`}
              sub={metrics.realizedProfit >= 0 ? '↑ Untung' : '↓ Rugi'}
              color={metrics.realizedProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}
              icon={TrendingUp}
            />
          </div>

          {/* ── Analytics Bar ── */}
          {metrics.stored.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-3xl p-5 mb-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-brand-700" />
                <h3 className="font-bold text-stone-800 text-sm">Analitik Aset Tersimpan</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs text-stone-400 font-bold uppercase mb-1">Modal Tersimpan</p>
                  <p className="text-lg font-black text-brand-900 font-mono">
                    Rp {metrics.storedCapital.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs text-stone-400 font-bold uppercase mb-1">HPP Rata-rata</p>
                  <p className="text-lg font-black text-stone-800 font-mono">
                    Rp {metrics.avgPricePerGram.toLocaleString('id-ID')}/g
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs text-stone-400 font-bold uppercase mb-1">Kadar Rata-rata</p>
                  <p className="text-lg font-black text-stone-800">
                    {metrics.avgKadar}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Risk Alert ── */}
          {metrics.stored.length > 0 && metrics.storedCapital > 5_000_000 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-sm text-amber-800">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Perhatian: Modal emas tersimpan &gt; Rp 5 juta</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Pertimbangkan segmentasi lot atau likuidasi parsial untuk menjaga likuiditas kas operasional.
                </p>
              </div>
            </div>
          )}

          {/* ── Transaction Lists ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tersimpan */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif font-bold text-brand-900 flex items-center gap-2">
                  <Scale size={20} className="text-brand-900" />
                  Aset Emas Aktif
                </h2>
                <span className="px-2.5 py-1 bg-brand-50 text-brand-800 rounded-xl text-xs font-bold border border-brand-200">
                  {metrics.stored.length} lot
                </span>
              </div>

              {metrics.stored.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-stone-200/60 rounded-3xl p-10 text-center">
                  <Scale className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400 font-medium text-sm">Brankas kosong.</p>
                  <button
                    onClick={() => setActiveView('buyback')}
                    className="mt-4 inline-flex items-center gap-2 text-brand-700 hover:text-brand-900 font-bold text-sm"
                  >
                    <ArrowDownToLine size={16} />
                    Beli Emas Pertama
                    <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {metrics.stored.map(tx => (
                    <TxRow key={tx.id} tx={tx} type="stored" />
                  ))}
                </div>
              )}
            </div>

            {/* Riwayat Terjual */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif font-bold text-stone-700 flex items-center gap-2">
                  <ArrowUpFromLine size={20} className="text-stone-400" />
                  Riwayat Likuidasi
                </h2>
                {metrics.sold.length > 0 && (
                  <span className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold border border-stone-200">
                    {metrics.sold.length} transaksi
                  </span>
                )}
              </div>

              {metrics.sold.length === 0 ? (
                <div className="bg-stone-50 border border-stone-200 rounded-3xl p-8 text-center">
                  <p className="text-stone-400 text-sm">Belum ada riwayat penjualan ke pengepul.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {metrics.sold.map(tx => (
                    <TxRow key={tx.id} tx={tx} type="sold" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Info Footer ── */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-8 text-xs text-blue-700">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-0.5">Tentang Gold Treasury</p>
              <p>
                Kas emas sepenuhnya terpisah dari kas retail. Setiap transaksi dicatat di{' '}
                <code className="bg-blue-100 px-1 rounded">gold_cash</code> dan audit trail otomatis.
                Data tersimpan offline-first di perangkat ini.{' '}
                <span className="inline-flex items-center gap-1 font-bold">
                  <ShieldCheck size={11} /> Dienkripsi AES-GCM.
                </span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
