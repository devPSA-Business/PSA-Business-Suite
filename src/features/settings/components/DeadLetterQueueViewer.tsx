import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SyncEvent } from '../../../shared/api/db';
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

export function DeadLetterQueueViewer() {
  const dlqEvents = useLiveQuery(() => db.sync_dlq.orderBy('timestamp').reverse().toArray());

  const handleRetry = async (event: SyncEvent) => {
    if (!event.id) return;
    try {
      await db.transaction('rw', [db.sync_dlq, db.sync_events], async () => {
        // Hapus dari DLQ
        await db.sync_dlq.delete(event.id!);
        
        // Pindahkan kembali ke antrean utama dengan reset retry
        const { id, ...rest } = event; // Buang ID lama agar auto-increment di sync_events
        await db.sync_events.add({
          ...rest,
          status: 'PENDING',
          retry_count: 0,
          next_retry_time: 0
        });
      });
    } catch (e) {
      console.error("Gagal mencoba ulang sinkronisasi:", e);
    }
  };

  const handleDiscard = async (id: number) => {
    try {
      if (confirm('Apakah Anda yakin ingin membuang event sinkronisasi ini secara permanen? Data ini tidak akan disinkronisasi ke server.')) {
        await db.sync_dlq.delete(id);
      }
    } catch (e) {
      console.error("Gagal menghapus event DLQ:", e);
    }
  };

  if (!dlqEvents) {
    return <div className="text-stone-500 animate-pulse">Memuat data...</div>;
  }

  if (dlqEvents.length === 0) {
    return (
      <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200">
        <p className="font-medium text-sm">Tidak ada antrean sinkronisasi yang macet. Semua sistem sinkron berjalan normal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-3">
        <AlertTriangle className="text-red-500 shrink-0 w-5 h-5 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-800 text-sm">Peringatan: Ada {dlqEvents.length} entri gagal disinkronkan.</h4>
          <p className="text-red-600 text-xs mt-1">Data berikut diblokir dari sinkronisasi ke server setelah 5 kali percobaan gagal berturut-turut. Ini mungkin terjadi karena perizinan Firestore ditolak atau payload tidak valid.</p>
        </div>
      </div>

      <div className="space-y-3">
        {dlqEvents.map(event => (
          <div key={event.id} className="bg-white border text-sm border-stone-200 p-3 rounded-lg flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  {event.action}
                </span>
                <span className="font-mono text-xs text-stone-500">{event.entity_type}</span>
              </div>
              <p className="text-red-600 text-xs font-mono break-words line-clamp-2" title={event.error_message}>
                {event.error_message || 'Unknown error'}
              </p>
              <p className="text-[10px] text-stone-400 mt-1">
                {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => handleRetry(event)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-900 text-gold-500 hover:bg-brand-800 rounded-lg transition-colors text-xs font-medium"
              >
                <RefreshCw size={14} />
                Coba Lagi
              </button>
              <button 
                onClick={() => handleDiscard(event.id!)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors text-xs font-medium"
              >
                <Trash2 size={14} />
                Buang
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
