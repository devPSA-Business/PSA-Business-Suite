import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SyncEvent } from '../../shared/api/db';
import { AlertCircle, Check, X, RefreshCw } from 'lucide-react';
import { useToastStore } from '../../shared/store/toastStore';
import { DIContainer } from '../../infrastructure/di/Container';

export function ConflictResolutionPage() {
  const addToast = useToastStore(state => state.addToast);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const conflicts = useLiveQuery(
    () => db.sync_events.where('status').equals('CONFLICT').toArray(),
    []
  );

  const handleResolve = async (event: SyncEvent, resolution: 'LOCAL' | 'SERVER') => {
    if (!event.id) return;
    setResolvingId(event.id);

    try {
      await DIContainer.syncService.resolveConflict(event.id, resolution, DIContainer.unitOfWork);
      
      if (resolution === 'LOCAL') {
        addToast('Konflik diselesaikan dengan menggunakan data lokal.', 'success');
      } else {
        addToast('Konflik diselesaikan dengan menggunakan data server.', 'success');
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      addToast('Gagal menyelesaikan konflik.', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  if (!conflicts) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-brand-900 mb-2">Resolusi Konflik Data</h1>
        <p className="text-stone-500">Tinjau dan selesaikan konflik sinkronisasi data antara perangkat lokal dan server.</p>
      </div>

      {conflicts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <Check className="mx-auto text-green-500 mb-4" size={48} />
          <h3 className="text-xl font-bold text-green-800 mb-2">Semua Data Sinkron</h3>
          <p className="text-green-600">Tidak ada konflik data yang perlu diselesaikan saat ini.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {conflicts.map(conflict => (
            <div key={conflict.id} className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
                <AlertCircle className="text-red-500" size={24} />
                <div>
                  <h3 className="font-bold text-red-900">Konflik pada {conflict.entity_type.toUpperCase()}</h3>
                  <p className="text-sm text-red-700">Tindakan: {conflict.action} | Waktu: {new Date(conflict.timestamp).toLocaleString('id-ID')}</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Local Data */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Versi Tablet Ini (Lokal)
                    </h4>
                    <details className="text-xs group mb-4">
                      <summary className="cursor-pointer text-blue-600 font-medium hover:underline outline-none">Lihat Perubahan Lokal</summary>
                      <div className="mt-2 text-sm text-stone-700 bg-white p-3 rounded-lg border border-stone-100">
                        {conflict.payload && Object.entries(conflict.payload).map(([key, value]) => {
                          if (key === 'id' || key === 'updatedAt' || key === 'createdAt') return null;
                          return (
                            <div key={key} className="flex justify-between border-b border-stone-50 last:border-0 py-1">
                              <span className="font-medium text-stone-500 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-stone-900 font-medium">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                  <button 
                    onClick={() => handleResolve(conflict, 'LOCAL')}
                    disabled={resolvingId === conflict.id}
                    className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {resolvingId === conflict.id ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                    Paksa Pakai Versi Tablet Ini
                  </button>
                </div>

                {/* Server Data */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Versi Pusat (Cloud)
                    </h4>
                    <details className="text-xs group mb-4">
                      <summary className="cursor-pointer text-green-600 font-medium hover:underline outline-none">Lihat Perubahan Pusat</summary>
                      <div className="mt-2 text-sm text-stone-700 bg-white p-3 rounded-lg border border-stone-100">
                        {conflict.server_payload && Object.keys(conflict.server_payload).length > 0 ? Object.entries(conflict.server_payload).map(([key, value]) => {
                          if (key === 'id' || key === 'updatedAt' || key === 'createdAt') return null;
                          return (
                            <div key={key} className="flex justify-between border-b border-stone-50 last:border-0 py-1">
                              <span className="font-medium text-stone-500 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-stone-900 font-medium">{String(value)}</span>
                            </div>
                          );
                        }) : (
                          <div className="text-stone-400 italic">Data cloud tidak ditarik atau dihapus pusat</div>
                        )}
                      </div>
                    </details>
                  </div>
                  <button 
                    onClick={() => handleResolve(conflict, 'SERVER')}
                    disabled={resolvingId === conflict.id}
                    className="mt-4 w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {resolvingId === conflict.id ? <RefreshCw className="animate-spin" size={18} /> : <X size={18} />}
                    Mengalah, Pakai Versi Pusat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
