import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Wifi, WifiOff, Loader2, AlertTriangle, RefreshCw, Database, Play, AlertCircle } from 'lucide-react';
import { db } from '../../shared/api/db';
import { DIContainer } from '../../infrastructure/di/Container';
import { useToastStore } from '../../shared/store/toastStore';
import { BackButton } from '../../shared/components/BackButton';
import { Link } from '@tanstack/react-router';

export function SyncStatusPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingEvents = useLiveQuery(() => db.sync_events.where('status').equals('PENDING').toArray());
  const failedEvents = useLiveQuery(() => db.sync_events.where('status').equals('FAILED').toArray());
  const conflictEvents = useLiveQuery(() => db.sync_events.where('status').equals('CONFLICT').toArray());
  const pendingSyncCount = useLiveQuery(() => DIContainer.liveQueries.observePendingSyncCount());
  const { addToast } = useToastStore();

  const handleManualSync = async () => {
    if (!isOnline) {
      addToast('Koneksi offline. Tidak dapat melakukan sinkronisasi.', 'error');
      return;
    }
    
    setIsSyncing(true);
    try {
      await DIContainer.syncService.processSyncQueue();
      addToast('Sinkronisasi manual selesai.', 'success');
    } catch (error) {
      console.error('Manual sync failed:', error);
      addToast('Terjadi kesalahan saat sinkronisasi manual.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetry = async (eventId: number) => {
    try {
      await db.sync_events.update(eventId, { status: 'PENDING', retry_count: 0 });
      addToast('Status antrean di-reset ke PENDING.', 'success');
      handleManualSync();
    } catch (error) {
      addToast('Gagal mereset status.', 'error');
    }
  };

  const filteredPending = useMemo(() => {
    if (!pendingEvents) return [];
    return pendingEvents.filter(e => 
      e.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.action.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pendingEvents, searchTerm]);

  const filteredFailed = useMemo(() => {
    if (!failedEvents) return [];
    return failedEvents.filter(e => 
      e.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.error_message && e.error_message.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [failedEvents, searchTerm]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 relative pb-12" data-testid="W-S-01">
      <BackButton />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-900">Status Sinkronisasi</h1>
          <p className="text-stone-500 mt-2">Pantau antrean data yang akan dikirim ke server cloud.</p>
        </div>
        <button
          onClick={handleManualSync}
          disabled={isSyncing || !isOnline || pendingSyncCount === 0}
          className="flex items-center gap-2 px-6 py-3 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
          {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Sekarang'}
        </button>
      </div>

      <input 
        type="text" 
        placeholder="Cari data sinkronisasi..." 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-3 mb-8 rounded-xl border border-stone-200 shadow-sm focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900"
      />

      {/* [UI-SYNC-01] Kartu Status Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`p-6 rounded-3xl border shadow-sm flex items-center gap-4 ${isOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className={`p-3 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {isOnline ? <Wifi size={24} /> : <WifiOff size={24} />}
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Status Koneksi</p>
            <p className={`text-xl font-bold ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>{isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex items-center gap-4">
          <div className="bg-brand-50 p-3 rounded-full text-brand-900">
            <Loader2 size={24} className={pendingSyncCount && pendingSyncCount > 0 ? 'animate-spin' : ''} />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Antrean Sinkronisasi</p>
            <p className="text-xl font-bold text-brand-900">{pendingSyncCount || 0} Item</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-full text-rose-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Sinkronisasi Gagal</p>
            <p className="text-xl font-bold text-rose-600">{failedEvents?.length || 0} Item</p>
          </div>
        </div>

        <Link to="/office/conflict-resolution" className={`bg-white p-6 rounded-3xl shadow-sm border border-red-200 flex items-center gap-4 ${conflictEvents && conflictEvents.length > 0 ? 'hover:bg-red-50 transition-colors' : 'opacity-50 cursor-not-allowed'}`}>
          <div className="bg-red-50 p-3 rounded-full text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Konflik Data</p>
            <p className="text-xl font-bold text-red-600">{conflictEvents?.length || 0} Item</p>
          </div>
        </Link>
      </div>

      {/* [UI-SYNC-02] Daftar Antrean (Pending Queue) */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-stone-800 mb-4">Antrean Sinkronisasi (PENDING)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPending && filteredPending.length > 0 ? (
            filteredPending.map((event) => (
              <div key={event.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
                <div className="bg-stone-100 p-3 rounded-xl text-stone-500"><Database size={20} /></div>
                <div className="flex-1">
                  <p className="font-bold text-stone-800 text-sm">{event.entity_type}</p>
                  <p className="text-xs text-stone-500">{event.action}</p>
                </div>
                <div className="text-xs text-stone-400 font-mono">
                  {new Date(event.timestamp).toLocaleTimeString('id-ID')}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-8 text-center text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              {searchTerm ? 'Tidak ada data sinkronisasi yang cocok.' : 'Semua data sudah tersinkronisasi.'}
            </div>
          )}
        </div>
      </div>

      {/* [UI-SYNC-03] Daftar Gagal (Failed Queue) */}
      <div>
        <h2 className="text-lg font-bold text-stone-800 mb-4">Sinkronisasi Gagal (FAILED)</h2>
        <div className="grid grid-cols-1 gap-4">
          {filteredFailed && filteredFailed.length > 0 ? (
            filteredFailed.map((event) => (
              <div key={event.id} className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="bg-rose-50 p-3 rounded-xl text-rose-600"><AlertTriangle size={20} /></div>
                <div className="flex-1">
                  <p className="font-bold text-stone-800 text-sm">{event.entity_type} - {event.action}</p>
                  <p className="text-xs text-rose-600 mt-1 font-mono">{event.error_message}</p>
                  <p className="text-[10px] text-stone-400 mt-1">{new Date(event.timestamp).toLocaleString('id-ID')}</p>
                </div>
                <button 
                  onClick={() => handleRetry(event.id!)}
                  className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  <RefreshCw size={14} />
                  Coba Lagi
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-stone-500 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              {searchTerm ? 'Tidak ada data sinkronisasi gagal yang cocok.' : 'Tidak ada data yang gagal disinkronisasi.'}
            </div>
          )}
        </div>
      </div>
      <span className="text-[9px] text-stone-300 font-mono absolute bottom-1 right-2">[W-S-01]</span>
    </div>
  );
}
