import React, { useState } from 'react';
import { BackButton } from '../../shared/components/BackButton';
import { DashboardPage } from './DashboardPage';
import { FinanceReportPage } from './FinanceReportPage';
import { OwnerDashboardPage } from '../../features/admin/ui/OwnerDashboardPage';
import { LayoutDashboard, FileText, Target } from 'lucide-react';

export const ExecutivePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'owner'>('dashboard');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <h1 className="text-2xl font-serif font-bold text-brand-900 hidden md:block">Executive Insight</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="flex border-b border-stone-200 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors min-w-max whitespace-nowrap ${
              activeTab === 'dashboard' ? 'text-brand-900 border-b-2 border-brand-900 bg-brand-50/50' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
            }`}
          >
            <LayoutDashboard size={18} />
            Overview Dashboard
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors min-w-max whitespace-nowrap ${
              activeTab === 'finance' ? 'text-brand-900 border-b-2 border-brand-900 bg-brand-50/50' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
            }`}
          >
            <FileText size={18} />
            Laporan Keuangan
          </button>
          <button
            onClick={() => setActiveTab('owner')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors min-w-max whitespace-nowrap ${
              activeTab === 'owner' ? 'text-brand-900 border-b-2 border-brand-900 bg-brand-50/50' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
            }`}
          >
            <Target size={18} />
            Owner Analytics
          </button>
        </div>

        <div className="p-4 md:p-6 bg-stone-50/30">
          {activeTab === 'dashboard' && <DashboardPage embedded={true} />}
          {activeTab === 'finance' && <FinanceReportPage embedded={true} />}
          {activeTab === 'owner' && <OwnerDashboardPage embedded={true} />}
        </div>
      </div>
    </div>
  );
};
