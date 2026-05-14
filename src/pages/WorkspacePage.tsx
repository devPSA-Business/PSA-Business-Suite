import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '../infrastructure/di/Container';
import { db } from '../shared/api/db';
import { PettyCashWidget } from '../features/workspace/components/PettyCashWidget';
import { CustomOrderWidget } from '../features/workspace/components/CustomOrderWidget';
import { SmartShiftCard } from '../features/workspace/components/SmartShiftCard';
import { DailyReviewModal } from '../features/workspace/components/DailyReviewModal';
import { RecentTransactionWidget } from '../features/workspace/components/RecentTransactionWidget';
import { CommunicationBoard } from '../features/workspace/components/CommunicationBoard';
import { QuickCatalogWidget } from '../features/workspace/components/QuickCatalogWidget';
import { Shift } from '../domain/models/Shift';
import { 
  ShoppingCart, 
  Wrench, 
  Coins,
  LogOut
} from 'lucide-react';

export function WorkspacePage() {
  const navigate = useNavigate();
  const openShift = useLiveQuery(() => DIContainer.liveQueries.observeOpenShift()) as Shift | undefined;
  const [showReview, setShowReview] = useState(false);

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = new Date().setHours(23, 59, 59, 999);

  const transactions = useLiveQuery(
    () => DIContainer.reportQuery.getTransactionsByDateRange(todayStart, todayEnd),
    [todayStart, todayEnd]
  );

  const pettyCashRecords = useLiveQuery(
    () => db.petty_cash.where('date').between(todayStart, todayEnd).toArray(),
    [todayStart, todayEnd]
  );

  const expectedCash = useLiveQuery(
    () => openShift ? DIContainer.shiftRepository.calculateExpectedCash(openShift.id) : Promise.resolve(0),
    [openShift?.id]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalSales = transactions?.reduce((sum: number, tx: any) => sum + (tx.status === 'SUCCESS' ? tx.total : 0), 0) || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPettyCash = pettyCashRecords?.reduce((sum: number, record: any) => sum + (record.category === 'KELUHAN' ? 0 : record.amount), 0) || 0; 
  // Note: Adjust the reduce based on your actual petty_cash struct if needed

  const handleCloseShift = async (_notes: string) => {
    setShowReview(false);
    navigate({ to: '/shift' });
  };

  const currentHour = new Date().getHours();
  const isLate = currentHour >= 17;
  const buttonClass = isLate
    ? "w-full py-4 bg-rose-600 text-white font-bold rounded-3xl hover:bg-rose-700 transition-all animate-pulse shadow-lg shadow-rose-500/30 flex items-center justify-center gap-3 text-lg"
    : "w-full py-4 bg-stone-800 text-white font-bold rounded-3xl hover:bg-stone-900 transition-all flex items-center justify-center gap-3 text-lg shadow-lg";
  const buttonText = isLate ? "Tutup Toko & Review" : "Akhiri Shift Lebih Awal";

  return (
    <div className="flex flex-col h-full max-h-screen max-w-7xl mx-auto pb-24 animate-in fade-in duration-500 overflow-y-auto pt-6 px-4 md:px-0">
      
      {/* ZONA KONTEKS (Header) */}
      <div className="shrink-0 mb-6">
        <SmartShiftCard shift={openShift || null} />
      </div>

      {openShift && (
        <div className="flex flex-col gap-6">
          
          {/* ZONA AKSI UTAMA (Hero Section) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 shrink-0">
            <Link
              to="/cashier"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-brand-900 to-brand-800 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group min-h-[140px] border border-brand-700 shadow-md"
            >
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/20 transition-all">
                <ShoppingCart className="w-8 h-8 text-gold-500" />
              </div>
              <span className="font-bold text-white text-center">Kasir Ritel</span>
            </Link>

            <Link
              to="/service-pos"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-stone-800 to-stone-700 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group min-h-[140px] border border-stone-600 shadow-md"
            >
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/20 transition-all">
                <Wrench className="w-8 h-8 text-rose-400" />
              </div>
              <span className="font-bold text-white text-center">Masuk Reparasi</span>
            </Link>

            <Link
              to="/gold-buyback-sales"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-600 to-amber-500 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group min-h-[140px] border border-amber-400 shadow-md col-span-2 md:col-span-1"
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <span className="font-bold text-white text-center">Trx Emas & Buyback</span>
            </Link>
          </div>

          {/* BENTO GRID AREA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Kolom Kiri: Riwayat & Komunikasi */}
            <div className="flex flex-col gap-6 h-full">
              <div className="min-h-[300px] flex-shrink-0">
                <RecentTransactionWidget />
              </div>
              <div className="flex-1 min-h-[300px]">
                <CommunicationBoard />
              </div>
            </div>

            {/* Kolom Tengah: Keuangan (Petty Cash) & Katalog Cepat */}
            <div className="flex flex-col gap-6 h-full">
              <div className="min-h-[300px] flex-shrink-0">
                <PettyCashWidget />
              </div>
              <div className="flex-1 min-h-[300px]">
                <QuickCatalogWidget />
              </div>
            </div>

            {/* Kolom Kanan: Customer Service & Shift Control */}
            <div className="flex flex-col gap-6 h-full">
              <div className="min-h-[300px] flex-1">
                <CustomOrderWidget />
              </div>
              
              {/* Tombol Tutup Shift di area paling bawah kanan */}
              <div className="shrink-0 mt-auto">
                <button
                  onClick={() => setShowReview(true)}
                  className={buttonClass}
                >
                  <LogOut size={24} />
                  {buttonText}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {showReview && (
        <DailyReviewModal
          isOpen={showReview}
          onClose={() => setShowReview(false)}
          summary={{ totalSales, totalPettyCash, expectedCash: expectedCash || 0 }}
          onConfirm={handleCloseShift}
        />
      )}
    </div>
  );
}

