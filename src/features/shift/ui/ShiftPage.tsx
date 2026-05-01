import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '@infrastructure/di/Container';
import { ShiftOpenForm } from '../components/ShiftOpenForm';
import { ShiftCloseForm } from '../components/ShiftCloseForm';
import { Clock, CheckCircle2 } from 'lucide-react';
import { BackButton } from '../../../shared/components/BackButton';

export function ShiftPage() {
  const openShift = useLiveQuery(() => DIContainer.liveQueries.observeOpenShift());
  const [refreshKey, setRefreshKey] = useState(0);

  const handleShiftChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <BackButton />
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-serif font-bold text-brand-900 tracking-tight">Manajemen Shift</h1>
        <p className="text-stone-500 mt-2 text-lg">Kelola pembukaan dan penutupan kasir untuk akurasi transaksi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Status Panel */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Status Kasir Saat Ini</h2>
          
          {openShift ? (
            <div className="bg-green-50 border-2 border-green-100 p-8 rounded-3xl shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle2 size={120} className="text-green-600" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                    <CheckCircle2 size={24} />
                  </div>
                  <span className="text-2xl font-bold text-green-700">Shift Terbuka</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-green-600/60 uppercase tracking-wider">Petugas Kasir</span>
                    <span className="text-xl font-bold text-green-800">{openShift.user}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-green-600/60 uppercase tracking-wider">Waktu Mulai</span>
                    <span className="text-lg font-medium text-green-700">{new Date(openShift.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="pt-4 border-t border-green-200/50">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-green-600/60 uppercase tracking-wider">Modal Awal</span>
                      <span className="text-3xl font-black text-green-800 tracking-tight">Rp {openShift.startCash.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-stone-100 border-2 border-stone-200 p-8 rounded-3xl shadow-sm relative overflow-hidden group transition-all hover:bg-stone-200/50">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock size={120} className="text-stone-900" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-stone-400 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-stone-200">
                    <Clock size={24} />
                  </div>
                  <span className="text-2xl font-bold text-stone-600">Shift Tertutup</span>
                </div>
                <p className="text-stone-500 text-lg leading-relaxed">
                  Belum ada shift yang aktif. Silakan buka shift baru untuk mulai melayani pelanggan dan mencatat transaksi.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-7" key={refreshKey}>
          {openShift ? (
            <ShiftCloseForm shiftId={openShift.id} onShiftClosed={handleShiftChange} />
          ) : (
            <ShiftOpenForm onShiftOpened={handleShiftChange} />
          )}
        </div>
      </div>
    </div>
  );
}
