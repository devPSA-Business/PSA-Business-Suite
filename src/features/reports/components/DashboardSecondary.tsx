import React from 'react';
import { DollarSign, Lightbulb, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardSecondaryProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revenueByPaymentMethod: any[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cashierPerformance: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lowStockItems: any[] | null;
}

export const DashboardSecondary: React.FC<DashboardSecondaryProps> = ({ revenueByPaymentMethod, cashierPerformance, lowStockItems }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Payment Method Distribution */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="text-lg font-bold text-brand-900 mb-6 flex items-center gap-2">
          <DollarSign className="text-stone-400" size={20} />
          Metode Pembayaran
        </h2>
        {revenueByPaymentMethod && revenueByPaymentMethod.length > 0 ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByPaymentMethod} layout="vertical" margin={{ left: 40, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="method" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Tooltip formatter={(value: unknown) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
                <Bar dataKey="revenue" fill="#1a365d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-stone-400 text-sm">
            Tidak ada data pembayaran
          </div>
        )}
      </div>

      {/* Cashier Performance */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="text-lg font-bold text-brand-900 mb-6 flex items-center gap-2">
          <Lightbulb className="text-stone-400" size={20} />
          Performa Kasir
        </h2>
        {cashierPerformance.length > 0 ? (
          <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {cashierPerformance.map((cashier, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-900 text-gold-500 flex items-center justify-center font-bold text-xs">
                    {cashier.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-stone-700">{cashier.name}</span>
                </div>
                <span className="text-sm font-mono font-bold text-brand-900">Rp {cashier.total.toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-stone-400 text-sm">
            Tidak ada data kasir
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="text-lg font-bold text-brand-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={20} /> 
          Stok Menipis (Qty &lt; 5)
        </h2>
        {lowStockItems && lowStockItems.length > 0 ? (
          <ul className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {lowStockItems.map(item => (
              <li key={item.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-xl text-amber-900 border border-amber-100/50">
                <span className="font-medium text-sm truncate mr-2">{item.name}</span>
                <span className="font-bold text-sm bg-amber-200/50 px-2 py-1 rounded-md shrink-0">{item.quantity} sisa</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-stone-500 text-sm p-4 bg-stone-50 rounded-xl text-center">Semua stok dalam kondisi aman.</p>
        )}
      </div>
    </div>
  );
};
