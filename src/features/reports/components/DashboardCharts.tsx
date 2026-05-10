import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, PieChart as PieChartIcon } from 'lucide-react';
import { DailyRevenueTrend, CategoryRevenue } from '../../../application/queries/IReportQuery';

const COLORS =['#1a365d', '#D4AF37', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DashboardChartsProps {
  salesTrends: DailyRevenueTrend[] | null;
  revenueByCategory: CategoryRevenue[] | null;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ salesTrends, revenueByCategory }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Chart: Revenue Trend */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col">
        <h2 className="text-lg font-bold text-brand-900 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-stone-400" size={20} />
            Tren Penjualan Harian
          </div>
        </h2>
        <div className="flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrends ||[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(1)}M`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: unknown) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Omzet']} 
              />
              <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4, fill: '#D4AF37', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales by Category */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="text-lg font-bold text-brand-900 mb-6 flex items-center gap-2">
          <PieChartIcon className="text-stone-400" size={20} />
          Penjualan per Kategori
        </h2>
        {revenueByCategory && revenueByCategory.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="revenue"
                  nameKey="category"
                >
                  {revenueByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-stone-400 text-sm">
            Tidak ada data kategori
          </div>
        )}
      </div>
    </div>
  );
};
