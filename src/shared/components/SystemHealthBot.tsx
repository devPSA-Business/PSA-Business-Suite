import React, { useState } from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { AlertTriangle, ShieldAlert, Cpu, RefreshCw, Archive, Trash2, X, AlertOctagon } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export const SystemHealthBot: React.FC = () => {
  const { currentReport, botVisible, hideBot } = useHealthStore();
  const { addToast } = useToastStore();
  
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');

  if (!botVisible) return null;
  
  if (!currentReport) {
    return (
      <div className="fixed inset-0 z-[9999] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all opacity-100">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
           <RefreshCw className="animate-spin text-brand-900 h-10 w-10 mx-auto mb-5" />
           <p className="font-serif font-bold text-lg text-stone-800">Menjalankan Diagnostik...</p>
           <p className="text-sm text-stone-500 mt-2">Memeriksa performa antrian perangkat dan memori.</p>
           <button onClick={hideBot} className="mt-8 px-6 py-2 bg-stone-100 text-sm font-medium text-stone-600 rounded-xl hover:bg-stone-200 transition-colors">Batalkan</button>
        </div>
      </div>
    );
  }

  const isCritical = currentReport.status === 'CRITICAL';
  
  const handleForceSync = async () => {
    try {
      const { DIContainer } = await import('../../infrastructure/di/Container');
      await DIContainer.syncService.processSyncQueue();
      addToast("Proses Paksa Sinkronisasi (Sync) sedang dijalankan di latar belakang.", "info");
    } catch (e) {
      addToast("Gagal menjalankan paksa sinkronisasi: " + String(e), "error");
    }
    hideBot();
  };

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { backupManager } = await import('../utils/backupManager');
      const pin = pinInput || '000000';
      addToast("Mempersiapkan file backup, mohon tunggu...", "info");
      const fileBlob = await backupManager.exportTerenkripsi(pin);
      backupManager.downloadBlob(fileBlob, `PSA_Darurat_${new Date().toISOString().slice(0,10)}.psa`);
      addToast("File backup berhasil diunduh.", "success");
    } catch (e) {
      addToast("Terjadi kesalahan saat backup: " + String(e), "error");
    }
    setIsPromptOpen(false);
    setPinInput('');
    hideBot();
  };

  const handleClearCache = async () => {
    try {
      const { archiveOldLogsAndEvents } = await import('../utils/dataArchiver');
      const { count } = await archiveOldLogsAndEvents();
      addToast(`Membersihkan cache berhasil. ${count} data lama dihapus.`, "success");
    } catch (e) {
      addToast("Gagal membersihkan cache: " + String(e), "error");
    }
    hideBot();
  };

  if (isPromptOpen) {
    return (
      <div className="fixed inset-0 z-[10000] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-brand-50 text-brand-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive size={32} />
          </div>
          <h3 className="font-serif font-bold text-xl text-stone-800 mb-2">PIN Enkripsi Backup</h3>
          <p className="text-sm text-stone-500 mb-6">Masukkan PIN Master untuk mengunci file backup Anda.</p>
          <form onSubmit={handleBackupSubmit} className="space-y-4">
            <input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              className="w-full text-center text-2xl tracking-[0.5em] font-mono border-2 border-stone-200 rounded-xl p-4 focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 outline-none"
              placeholder="••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsPromptOpen(false)} className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors">Batal</button>
              <button type="submit" className="flex-1 px-4 py-3 bg-brand-900 text-gold-500 rounded-xl font-bold hover:bg-brand-800 transition-colors shadow-md">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-stone-200 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-6 sm:p-8 shrink-0 border-b ${isCritical ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="flex justify-between items-start">
            <div className="flex gap-4 sm:gap-5">
              <div className={`p-3 sm:p-4 rounded-2xl ${isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} shadow-sm`}>
                {isCritical ? <AlertOctagon size={32} /> : <Cpu size={32} />}
              </div>
              <div>
                <h2 className={`font-serif font-bold text-xl sm:text-2xl ${isCritical ? 'text-red-900' : 'text-amber-900'}`}>
                  Asisten Diagnostik PSA
                </h2>
                <p className={`text-sm sm:text-base font-medium mt-1 inline-flex items-center gap-1.5 ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                  {isCritical && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  Memerlukan Perhatian {isCritical && 'Segera'}
                </p>
              </div>
            </div>
            {!isCritical && (
              <button onClick={hideBot} className="text-stone-400 hover:text-stone-600 hover:bg-white/50 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Issues List */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          <p className="text-stone-600 mb-6 text-sm sm:text-base leading-relaxed">
            Sistem mendeteksi beberapa anomali yang dapat mengganggu dan menghambat kinerja aplikasi. Kami telah menyiapkan solusi mitigasi otomatis yang aman di bawah ini:
          </p>

          <div className="space-y-3 mb-8">
            {currentReport.issues.map((issue, idx) => (
              <div key={idx} className="flex gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 shadow-sm">
                <div className="mt-0.5 shrink-0">
                  {issue.severity === 'CRITICAL' ? (
                    <ShieldAlert size={20} className="text-red-500" />
                  ) : (
                    <AlertTriangle size={20} className="text-amber-500" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-stone-800 text-sm sm:text-base">{issue.code}</p>
                  <p className="text-sm text-stone-500 mt-1 leading-relaxed">{issue.message}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-400 mb-4 px-1">Tindakan Cepat</h3>
            
            {currentReport.issues.some(i => i.code === 'SYNC_STUCK' || i.code === 'DLQ_OVERFLOW') && (
              <button 
                onClick={handleForceSync}
                className="w-full flex items-center gap-4 p-4 border-2 border-stone-100 rounded-[1.5rem] hover:bg-stone-50 hover:border-blue-200 transition-all text-left shadow-sm active:scale-[0.98] group"
              >
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:scale-110 group-hover:bg-blue-100 transition-all shrink-0">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <p className="font-bold text-stone-800">Paksa Sinkronisasi (Force Sync)</p>
                  <p className="text-sm text-stone-500 mt-0.5">Kirim ulang data secara agresif ke server.</p>
                </div>
              </button>
            )}

            {currentReport.issues.some(i => i.code === 'STORAGE_CRITICAL') && (
              <>
                <button 
                  onClick={() => setIsPromptOpen(true)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-stone-100 rounded-[1.5rem] hover:bg-stone-50 hover:border-emerald-200 transition-all text-left shadow-sm active:scale-[0.98] group"
                >
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:scale-110 group-hover:bg-emerald-100 transition-all shrink-0">
                    <Archive size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800">Amankan Data (Backup Lokal)</p>
                    <p className="text-sm text-stone-500 mt-0.5">Unduh data offline terlebih dahulu demi keamanan.</p>
                  </div>
                </button>

                <button 
                  onClick={handleClearCache}
                  className="w-full flex items-center gap-4 p-4 border-2 border-stone-100 rounded-[1.5rem] hover:bg-red-50 hover:border-red-200 transition-all text-left shadow-sm active:scale-[0.98] group"
                >
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl group-hover:scale-110 group-hover:bg-red-100 transition-all shrink-0">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-red-700">Bersihkan Memori Caches</p>
                    <p className="text-sm text-red-500 mt-0.5">Hanya membersihkan riwayat aman di cloud.</p>
                  </div>
                </button>
              </>
            )}

            {/* Hubungi IT jika tidak diketahui */}
            {currentReport.issues.some(i => i.code === 'HASH_CHAIN_BREACH') && (
              <div className="p-4 sm:p-5 bg-red-50 text-red-900 rounded-[1.5rem] text-sm font-medium border-2 border-red-200 shadow-sm flex items-start gap-3">
                <ShieldAlert className="shrink-0 text-red-600 mt-0.5" size={20} />
                <p className="leading-relaxed">
                  <strong>Peringatan Keamanan Kritis:</strong> Terjadi insiden Integritas Data. Hubungi Tim Dukungan TI dan siapkan PIN Master Anda.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 sm:py-5 bg-stone-50 border-t border-stone-100 flex justify-between items-center shrink-0">
           <span className="text-[10px] sm:text-xs font-mono font-bold text-stone-400">PSA Heuristics Core v1.4</span>
           <button onClick={hideBot} className="text-sm font-bold text-stone-500 hover:text-stone-800 px-4 py-2 hover:bg-stone-200 rounded-xl transition-colors">Abaikan</button>
        </div>
      </div>
    </div>
  );
};

