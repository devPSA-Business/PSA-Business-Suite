import React from 'react';
import { DollarSign, TrendingUp, Package, LucideIcon } from 'lucide-react';

interface DashboardKPIProps {
  stats: { totalRevenue: number; totalTransactions: number };
  lowStockCount: number;
}

interface CardConfig {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  change: string;
}

export const DashboardKPI: React.FC<DashboardKPIProps> = ({ stats, lowStockCount }) => {
  const cards: CardConfig[] =[
    { title: 'Total Omzet', value: `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-green-600', change: '+5%' },
    { title: 'Total Transaksi', value: stats.totalTransactions.toString(), icon: TrendingUp, color: 'text-blue-600', change: '+2%' },
    { title: 'Stok Menipis', value: lowStockCount.toString(), icon: Package, color: 'text-amber-600', change: '0%' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className={`p-4 rounded-2xl bg-stone-50 ${card.color}`}>
            <card.icon size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">{card.title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-brand-900 mt-1">{card.value}</p>
              <span className={`text-xs font-bold ${card.change.startsWith('+') ? 'text-emerald-600' : card.change.startsWith('-') ? 'text-red-600' : 'text-stone-400'}`}>
                {card.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
