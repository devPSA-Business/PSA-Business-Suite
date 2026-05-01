import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../shared/api/db';
import { useAuthStore } from '../../../shared/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { Calendar, MessageSquare, AlertCircle, Plus, X } from 'lucide-react';
import { DIContainer } from '../../../infrastructure/di/Container';

export function CommunicationBoard() {
  const [activeTab, setActiveTab] = useState<'JANJI' | 'HANDOVER' | 'KELUHAN'>('JANJI');
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [lastRead, setLastRead] = useState<Record<string, number>>({});

  useEffect(() => {
    db.keyval.get('comm_board_last_read').then(val => {
      if (val && typeof val === 'string') {
        try {
          setLastRead(JSON.parse(val));
        } catch (e) {
          if (e instanceof Error) {
            console.error('Failed to parse last read:', (e instanceof Error ? e.message : String(e)));
          }
        }
      }
    });

    const handleStorageChange = (e: StorageEvent) => {
      // In a real PWA with multiple tabs, we'd use BroadcastChannel instead of StorageEvent for cross-tab sync 
      // since we're dropping localStorage. We'll add a simplified BroadcastChannel here.
    };
  }, []);
  
  const { user } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);

  const startOfDay = new Date().setHours(0, 0, 0, 0);

  const appointments = useLiveQuery(() => db.appointments.where('date').aboveOrEqual(startOfDay).toArray(), []);
  const handovers = useLiveQuery(() => db.handovers.orderBy('timestamp').reverse().limit(10).toArray(), []);
  const internalNotes = useLiveQuery(() => db.internal_notes.where('date').aboveOrEqual(startOfDay).toArray(), []);

  // Update last read when tab changes
  const handleTabChange = (tab: 'JANJI' | 'HANDOVER' | 'KELUHAN') => {
    setActiveTab(tab);
    const updatedLastRead = { ...lastRead, [tab]: Date.now() };
    setLastRead(updatedLastRead);
    db.keyval.put({ key: 'comm_board_last_read', value: JSON.stringify(updatedLastRead) }).catch(console.error);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasNewItems = (tab: 'JANJI' | 'HANDOVER' | 'KELUHAN', items: any[] | undefined, dateField: string) => {
    if (!items || items.length === 0) return false;
    const tabLastRead = lastRead[tab] || 0;
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    
    // An item is new if it's newer than the last read time, AND it's within the last 5 minutes.
    return items.some(item => {
      const itemTime = item[dateField];
      return itemTime > tabLastRead && itemTime > fiveMinsAgo;
    });
  };

  const hasNewAppointments = hasNewItems('JANJI', appointments, 'date');
  const hasNewHandovers = hasNewItems('HANDOVER', handovers, 'timestamp');
  const hasNewNotes = hasNewItems('KELUHAN', internalNotes, 'date');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (activeTab === 'JANJI') {
        await DIContainer.manageCommunicationUseCase.createAppointment({
          id: crypto.randomUUID(),
          date: Date.now(),
          customerName,
          description: message,
          status: 'PENDING',
          user: user.name
        });
      } else if (activeTab === 'HANDOVER') {
        await DIContainer.createHandoverUseCase.execute({
          category: 'GENERAL',
          message,
          user: user.name
        });
      } else if (activeTab === 'KELUHAN') {
        await DIContainer.manageCommunicationUseCase.createInternalNote({
          id: crypto.randomUUID(),
          date: Date.now(),
          category: 'KELUHAN',
          message,
          user: user.name
        });
      }
      
      addToast('Catatan berhasil disimpan', 'success');
      setIsAdding(false);
      setMessage('');
      setCustomerName('');
    } catch (error) {
      addToast(error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Gagal menyimpan catatan', 'error');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full">
      <div className="flex border-b border-stone-100">
        <button 
          onClick={() => handleTabChange('JANJI')}
          className={`relative flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'JANJI' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          <Calendar size={18} />
          <span className="hidden sm:inline">Janji Temu</span>
          {activeTab !== 'JANJI' && hasNewAppointments && (
            <span className="absolute top-3 right-3 sm:right-auto sm:-translate-x-full sm:ml-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse blur-[1px]"></span>
          )}
          {activeTab !== 'JANJI' && hasNewAppointments && (
            <span className="absolute top-3 right-3 sm:right-auto sm:-translate-x-full sm:ml-2 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          )}
        </button>
        <button 
          onClick={() => handleTabChange('HANDOVER')}
          className={`relative flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'HANDOVER' ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          <MessageSquare size={18} />
          <span className="hidden sm:inline">Serah Terima</span>
          {activeTab !== 'HANDOVER' && hasNewHandovers && (
            <span className="absolute top-3 right-3 sm:right-auto sm:-translate-x-full sm:ml-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse blur-[1px]"></span>
          )}
          {activeTab !== 'HANDOVER' && hasNewHandovers && (
            <span className="absolute top-3 right-3 sm:right-auto sm:-translate-x-full sm:ml-2 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          )}
        </button>
        <button 
          onClick={() => handleTabChange('KELUHAN')}
          className={`relative flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'KELUHAN' ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-500' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          <AlertCircle size={18} />
          <span className="hidden sm:inline">Keluhan</span>
          {activeTab !== 'KELUHAN' && hasNewNotes && (
            <span className="absolute top-3 right-3 sm:right-auto sm:-translate-x-full sm:ml-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse blur-[1px]"></span>
          )}
          {activeTab !== 'KELUHAN' && hasNewNotes && (
            <span className="absolute top-3 right-3 sm:right-auto sm:-translate-x-full sm:ml-2 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto bg-stone-50/30 min-h-[250px] relative">
        {activeTab === 'JANJI' && (
          <div className="space-y-3">
            {appointments === undefined ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-blue-50 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="h-4 bg-stone-200 rounded w-1/3"></div>
                      <div className="h-3 bg-stone-200 rounded w-12"></div>
                    </div>
                    <div className="h-3 bg-stone-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 text-sm space-y-2">
                <Calendar size={32} className="opacity-50" />
                <p>Tidak ada janji temu hari ini.</p>
              </div>
            ) : (
              appointments.map(app => (
                <div key={app.id} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-blue-900 text-sm">{app.customerName}</span>
                    <span className="text-xs text-stone-400">{new Date(app.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-sm text-stone-600">{app.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'HANDOVER' && (
          <div className="space-y-3">
            {handovers === undefined ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-amber-50 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="h-4 bg-stone-200 rounded w-1/3"></div>
                      <div className="h-3 bg-stone-200 rounded w-12"></div>
                    </div>
                    <div className="h-3 bg-stone-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : handovers.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 text-sm space-y-2">
                <MessageSquare size={32} className="opacity-50" />
                <p>Belum ada pesan serah terima.</p>
              </div>
            ) : (
              handovers.map(h => (
                <div key={h.id} className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-amber-900 text-sm">{h.user}</span>
                    <span className="text-xs text-stone-400">{new Date(h.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-sm text-stone-600">{h.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'KELUHAN' && (
          <div className="space-y-3">
            {internalNotes === undefined ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-rose-50 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="h-4 bg-stone-200 rounded w-1/3"></div>
                      <div className="h-3 bg-stone-200 rounded w-12"></div>
                    </div>
                    <div className="h-3 bg-stone-200 rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            ) : internalNotes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 text-sm space-y-2">
                <AlertCircle size={32} className="opacity-50" />
                <p>Tidak ada keluhan/laporan hari ini.</p>
              </div>
            ) : (
              internalNotes.map(note => (
                <div key={note.id} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-rose-900 text-sm">{note.user}</span>
                    <span className="text-xs text-stone-400">{new Date(note.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-sm text-stone-600">{note.message}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-stone-100 bg-white">
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <Plus size={16} />
          Tambah {activeTab === 'JANJI' ? 'Janji' : activeTab === 'HANDOVER' ? 'Pesan' : 'Keluhan'}
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-brand-900">
                Tambah {activeTab === 'JANJI' ? 'Janji Temu' : activeTab === 'HANDOVER' ? 'Pesan Serah Terima' : 'Keluhan/Laporan'}
              </h2>
              <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'JANJI' && (
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Nama Pelanggan/Mitra</label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Pesan / Keterangan</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none h-32"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3.5 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-colors active:scale-95"
              >
                Simpan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
