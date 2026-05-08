import React from 'react';
import { Link } from '@tanstack/react-router';
import { Clock, Wallet } from 'lucide-react';
import { Shift } from '../../../domain/models/Shift';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '../../../infrastructure/di/Container';

interface SmartShiftCardProps {
  shift: Shift | null;
  turnover?: number; // Kept for backward compatibility if ever needed
}

export const SmartShiftCard: React.FC<SmartShiftCardProps> = ({ shift }) => {
  // Ambil data arus kas secara real-time
  const cashSummary = useLiveQuery(
    () => shift?.startTime ? DIContainer.liveQueries.observeTodayCashSummary(shift.startTime) : Promise.resolve({ cashIn: 0, cashOut: 0 }),
    [shift?.startTime]
  );

  const currentBalance = (shift?.startCash || 0) + (cashSummary?.cashIn || 0) - (cashSummary?.cashOut || 0);

  if (!shift) {
    return (
      <div className="bg-brand-900 p-8 rounded-[2rem] shadow-lg text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-serif font-bold">Shift Tertutup</h2>
        <p className="text-brand-300">Silakan buka shift kasir untuk memulai operasional.</p>
        <Link to="/shift" className="px-8 py-4 bg-gold-500 text-brand-900 font-bold rounded-2xl shadow-lg hover:bg-gold-400 transition-all">
          Buka Shift Sekarang
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-brand-900 p-6 rounded-[2rem] shadow-lg text-white flex flex-col items-start gap-4">
      <div className="flex justify-between items-center w-full">
        <div>
          <p className="text-brand-300 text-xs font-bold uppercase tracking-widest mb-1">Status Shift Aktif</p>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold">{shift.userId}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-brand-800/50 px-3 py-1.5 rounded-xl border border-brand-700">
          <Clock size={16} className="text-gold-500" />
          <span className="font-mono text-sm font-bold text-brand-100">
            {new Date(shift.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full mt-2">
        <div className="flex-1 bg-emerald-900/40 p-4 rounded-xl border border-emerald-800 flex items-center justify-between">
          <div>
             <p className="text-brand-300 text-[10px] uppercase font-bold tracking-wider mb-1">Saldo Laci Saat Ini</p>
             <div className="font-mono text-2xl sm:text-3xl font-bold text-emerald-400">
                Rp {currentBalance.toLocaleString('id-ID')}
             </div>
          </div>
          <Wallet size={32} className="text-emerald-500 opacity-50" />
        </div>
        
        <div className="flex-1 flex gap-4">
           <div className="flex-1 bg-brand-800/50 p-3 rounded-xl border border-brand-700">
             <p className="text-brand-400 lg:text-brand-300 text-[10px] uppercase tracking-wider mb-1">Uang Masuk (+)</p>
             <div className="font-mono text-sm sm:text-base text-white">
                Rp {(cashSummary?.cashIn || 0).toLocaleString('id-ID')}
             </div>
           </div>
           <div className="flex-1 bg-brand-800/50 p-3 rounded-xl border border-brand-700">
             <p className="text-brand-400 lg:text-brand-300 text-[10px] uppercase tracking-wider mb-1">Uang Keluar (-)</p>
             <div className="font-mono text-sm sm:text-base text-red-300">
                Rp {(cashSummary?.cashOut || 0).toLocaleString('id-ID')}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
