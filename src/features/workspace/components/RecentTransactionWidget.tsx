import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../shared/api/db';
import { DIContainer } from '../../../infrastructure/di/Container';
import { ReceiptText, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function RecentTransactionWidget() {
  const openShift = useLiveQuery(() => DIContainer.liveQueries.observeOpenShift(), []);

  const recentTransactions = useLiveQuery(
    async () => {
      if (!openShift) return [];
      return await db.transactions
        .where('date')
        .aboveOrEqual(openShift.startTime)
        .reverse()
        .limit(5)
        .toArray();
    },
    [openShift?.startTime]
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full min-h-[300px]">
      <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
        <h2 className="font-bold text-brand-900 flex items-center gap-2">
          <ReceiptText size={20} className="text-stone-500" />
          Riwayat Transaksi
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 relative">
        {recentTransactions === undefined ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-stone-100 rounded-xl"></div>
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 text-center p-4">
            <ReceiptText size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Belum ada transaksi di shift ini.</p>
            <Link 
              to="/cashier"
              className="mt-4 px-4 py-2 bg-brand-900 text-gold-500 rounded-xl font-bold text-sm hover:bg-brand-800 transition-colors"
            >
              Lakukan Transaksi Pertama
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-stone-800 text-sm">
                    {new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-stone-500 font-mono">
                    {tx.id.split('-')[0].toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-900 text-sm">
                    Rp {tx.total.toLocaleString('id-ID')}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${tx.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-stone-100 bg-white">
        <Link 
          to="/finance" 
          className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
        >
          Lihat Laporan Penuh
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
