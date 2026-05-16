import React from 'react';
import { Search } from 'lucide-react';
import { Transaction } from '../../../shared/api/db';

interface TransactionListProps {
  transactions: Transaction[] | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-brand-900 flex items-center gap-2">
          <Search size={20} className="text-stone-400" />
          Detail Transaksi
        </h2>
        <div className="text-sm text-stone-500 font-medium">
          Menampilkan {transactions?.length || 0} transaksi
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {transactions?.map((tx) => (
          <div key={tx.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:bg-stone-50 transition-colors flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600">
                  {tx.user.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">{tx.user}</div>
                  <div className="text-xs text-stone-500 font-mono">{tx.id.slice(0, 8)}...</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-stone-900">
                  {new Date(tx.date).toLocaleDateString('id-ID')}
                </div>
                <div className="text-xs text-stone-500">
                  {new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-stone-100">
              <div className="flex gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  tx.paymentMethod === 'CASH' ? 'bg-emerald-100 text-emerald-700' :
                  tx.paymentMethod === 'QRIS' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {tx.paymentMethod}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  tx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {tx.status === 'SUCCESS' ? 'Berhasil' : 'Dibatalkan'}
                </span>
              </div>
              <div className="text-lg font-black text-brand-900">
                {formatCurrency(tx.total)}
              </div>
            </div>
          </div>
        ))}
        {(!transactions || transactions.length === 0) && (
          <div className="col-span-full p-12 text-center text-stone-400 italic bg-white rounded-2xl border border-stone-100">
            Tidak ada transaksi ditemukan untuk filter ini.
          </div>
        )}
      </div>
    </div>
  );
};
