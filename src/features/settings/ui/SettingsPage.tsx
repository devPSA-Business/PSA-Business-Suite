import { logger } from '@lib/logger';
import { useState, useRef, useEffect } from 'react';
import { Download, Upload, Trash2, AlertTriangle, Archive, Users, ShieldAlert, Target, Activity, Lock, Database } from 'lucide-react';
import { DIContainer } from '@infrastructure/di/Container';
import { useToastStore } from '../../../shared/store/toastStore';
import { BackButton } from '../../../shared/components/BackButton';
import { archiveOldLogsAndEvents } from '../../../shared/utils/dataArchiver';
import { TileManager } from './TileManager';
import { useGestureStore } from '../../gestures/store/useGestureStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { Link } from '@tanstack/react-router';
import { ManagerAuthDialog } from '../../../shared/components/ManagerAuthDialog';
import { backupManager } from '../../../shared/utils/backupManager';
import { seedDatabase } from '../../../lib/seeder';
import { isAuthorizedDev } from '../../../shared/utils/devUtils';

export function SettingsPage() {
  const { addToast } = useToastStore();
  const { user: currentUser, firebaseUser } = useAuthStore();
  const { segmentationThresholds, setSegmentationThresholds } = useSettingsStore();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [modalState, setModalState] = useState<'NONE' | 'IMPORT' | 'CLEAR' | 'RECOVER' | 'EXPORT_PIN' | 'IMPORT_PIN'>('NONE');
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const encryptedFileRef = useRef<HTMLInputElement>(null);
  const [passphrase, setPassphrase] = useState('');

  // Local state for thresholds
  const [vipThreshold, setVipThreshold] = useState(segmentationThresholds.vip.toString());
  const [loyalThreshold, setLoyalThreshold] = useState(segmentationThresholds.loyal.toString());

  useEffect(() => {
    setVipThreshold(segmentationThresholds.vip.toString());
    setLoyalThreshold(segmentationThresholds.loyal.toString());
  }, [segmentationThresholds]);

  const handleSaveThresholds = () => {
    const vip = parseInt(vipThreshold.replace(/\D/g, ''), 10) || 0;
    const loyal = parseInt(loyalThreshold.replace(/\D/g, ''), 10) || 0;

    if (loyal >= vip) {
      addToast('Batas Loyal harus lebih kecil dari batas VIP', 'error');
      return;
    }

    setSegmentationThresholds(vip, loyal);
    addToast('Konfigurasi segmentasi berhasil disimpan', 'success');
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <BackButton />
        <div className="bg-white p-12 rounded-3xl border border-stone-200 shadow-sm">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-brand-900 mb-2">Akses Terbatas</h1>
          <p className="text-stone-500">Hanya Administrator yang dapat mengakses pengaturan sistem.</p>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    setModalState('EXPORT_PIN');
  };

  const handleExportEncrypted = async (pin: string) => {
    setModalState('NONE');
    setIsExporting(true);
    try {
      const blob = await backupManager.exportTerenkripsi(pin);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupManager.downloadBlob(blob, `psa_secure_backup_${timestamp}.psa`);
      addToast('Backup terenkripsi berhasil diunduh.', 'success');
    } catch (error) {
      addToast('Gagal melakukan backup terenkripsi.', 'error');
      logger.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportEncryptedClick = () => {
    encryptedFileRef.current?.click();
  };

  const onEncryptedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setModalState('IMPORT_PIN');
    }
  };

  const handleImportEncrypted = async (pin: string) => {
    if (!importFile) return;
    setModalState('NONE');
    setIsImporting(true);
    try {
      await backupManager.importTerenkripsi(importFile, pin);
      addToast('Data berhasil dipulihkan dari backup terenkripsi.', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      addToast('Gagal memulihkan: PIN salah atau file korup.', 'error');
      logger.error(error);
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setModalState('IMPORT');
    }
  };

  const confirmImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          await DIContainer.databaseAdminService.importDatabase(data);
          addToast('Data berhasil dipulihkan. Aplikasi akan dimuat ulang.', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
          addToast('Format file tidak valid.', 'error');
          logger.error(err);
        }
      };
      reader.readAsText(importFile);
    } catch (error) {
      addToast('Gagal memulihkan data.', 'error');
      logger.error(error);
    } finally {
      setIsImporting(false);
      setModalState('NONE');
    }
  };

  const confirmClear = async () => {
    const pendingSyncCount = await DIContainer.liveQueries.observePendingSyncCount();
    if (pendingSyncCount > 0) {
      addToast(`Ada ${pendingSyncCount} transaksi yang belum tersinkronisasi. Menghapus data sekarang akan menyebabkan data ini hilang permanen.`, 'error');
      setModalState('NONE');
      return;
    }
    setIsClearing(true);
    try {
      await DIContainer.databaseAdminService.clearDatabase();
      addToast('Semua data berhasil dihapus.', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      addToast('Gagal menghapus data.', 'error');
      logger.error(error);
    } finally {
      setIsClearing(false);
      setModalState('NONE');
    }
  };

  const confirmRecover = async () => {
    setIsRecovering(true);
    try {
      await DIContainer.databaseAdminService.recoverFromCloud();
      addToast('Data berhasil dipulihkan dari Cloud.', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      addToast('Gagal memulihkan data dari Cloud.', 'error');
      logger.error(error);
    } finally {
      setIsRecovering(false);
      setModalState('NONE');
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await archiveOldLogsAndEvents();
      if (result.count > 0) {
        addToast(`Berhasil membersihkan ${result.count} data lawas dari tablet.`, 'success');
      } else {
        addToast('Tidak ada logs/events lama yang aman (> 30 hari & Synced) untuk dibersihkan.', 'info');
      }
    } catch (error) {
      addToast('Gagal melakukan pembersihan data.', 'error');
      logger.error(error);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
      <div className="max-w-4xl mx-auto p-6">
        <BackButton />
        {isAuthorizedDev(firebaseUser?.email) && (
          <section className="bg-white rounded-2xl shadow-sm border-2 border-amber-500 overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-bold text-amber-600 flex items-center gap-2 mb-4">
                <Database size={20} />
                Dev Tools (Akses Khusus Pengembang)
              </h2>
              <button
                onClick={async () => {
                  await seedDatabase();
                  addToast('Data simulasi berhasil dimuat!', 'success');
                }}
                className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
              >
                Muat Data Simulasi
              </button>
            </div>
          </section>
        )}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900">Pengaturan Sistem</h1>
          <p className="text-stone-500">Kelola database, backup, dan pemeliharaan sistem.</p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h2 className="text-xl font-bold text-stone-800">Manajemen Data</h2>
            <p className="text-sm text-stone-500">Ekspor, impor, dan bersihkan data aplikasi Anda.</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Encrypted Backup */}
              <div className="p-5 border-2 border-brand-900/10 bg-brand-900/5 rounded-2xl ring-1 ring-brand-900/5">
                <div className="w-10 h-10 bg-brand-900 text-gold-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-brand-900/20">
                  <Lock size={20} />
                </div>
                <h3 className="font-bold text-brand-900 mb-2">Backup Lokal (Terenkripsi)</h3>
                <p className="text-sm text-stone-500 mb-6 font-medium">
                  Rekomendasi Utama: Cadangkan database offline dengan enkripsi AES-GCM 256-bit menggunakan PIN Master Anda.
                </p>
                <button
                  onClick={() => setModalState('EXPORT_PIN')}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-900 text-gold-500 font-black rounded-xl hover:bg-brand-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isExporting ? 'Mengekspor...' : 'Buat Backup Aman'}
                </button>
              </div>

              {/* Encrypted Restore */}
              <div className="p-5 border border-stone-100 bg-stone-50 rounded-2xl">
                <div className="w-10 h-10 bg-stone-100 text-stone-600 rounded-full flex items-center justify-center mb-4">
                  <Upload size={20} />
                </div>
                <h3 className="font-bold text-stone-800 mb-2">Pulihkan dari Backup Aman</h3>
                <p className="text-sm text-stone-500 mb-6">
                  Pulihkan database dari file .psa terenkripsi. Anda akan diminta memasukkan PIN yang digunakan saat backup.
                </p>
                <input
                  type="file"
                  ref={encryptedFileRef}
                  onChange={onEncryptedFileChange}
                  accept=".psa"
                  className="hidden"
                />
                <button
                  onClick={handleImportEncryptedClick}
                  disabled={isImporting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-stone-100 hover:border-brand-900/20 hover:bg-stone-100 text-stone-700 font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {isImporting ? 'Memproses...' : 'Pilih File .psa'}
                </button>
              </div>

              {/* Sync Manually (Previous content continues below) */}
              <div className="p-5 border border-stone-100 bg-stone-50 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <Activity size={20} />
                </div>
                <h3 className="font-bold text-stone-800 mb-2">Sync Sekarang</h3>
                <p className="text-sm text-stone-500 mb-6">
                  Paksa sinkronisasi data ke Cloud secara manual sekarang.
                </p>
                <button
                  onClick={async () => {
                    try {
                      await DIContainer.syncService.processSyncQueue();
                      addToast('Sinkronisasi berhasil dilakukan.', 'success');
                    } catch (error) {
                      addToast('Gagal sinkronisasi data.', 'error');
                      logger.error(error);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium rounded-lg transition-colors"
                >
                  Sync Sekarang
                </button>
              </div>

              {/* Backup */}
              <div className="p-5 border border-stone-100 bg-stone-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Download size={20} />
                </div>
                <h3 className="font-bold text-stone-800 mb-2">Backup Data</h3>
                <p className="text-sm text-stone-500 mb-6">
                  Unduh semua data saat ini ke dalam file JSON untuk disimpan sebagai cadangan.
                </p>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isExporting ? 'Mengekspor...' : 'Unduh Backup'}
                </button>
              </div>

              {/* Restore */}
              <div className="p-5 border border-stone-100 bg-stone-50 rounded-xl">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                  <Upload size={20} />
                </div>
                <h3 className="font-bold text-stone-800 mb-2">Pulihkan Data</h3>
                <p className="text-sm text-stone-500 mb-6">
                  Unggah file backup JSON untuk memulihkan data. <span className="text-red-500 font-medium">Data saat ini akan ditimpa.</span>
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={handleImportClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium rounded-lg transition-colors"
                >
                  Pilih File Backup
                </button>
              </div>

              {/* Employee Management */}
              <div className="p-5 border border-stone-100 bg-stone-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Users size={20} />
                </div>
                <h3 className="font-bold text-stone-800 mb-2">Manajemen Pegawai</h3>
                <p className="text-sm text-stone-500 mb-6">
                  Kelola akun pegawai, peran, dan PIN akses untuk seluruh tim Anda.
                </p>
                <Link
                  to="/employees"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium rounded-lg transition-colors"
                >
                  Buka Manajemen Pegawai
                </Link>
              </div>

              {/* Archive Data */}
              <div className="p-5 border border-stone-100 bg-stone-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Archive size={20} />
                </div>
                <h3 className="font-bold text-stone-800 mb-2">Bersihkan Sampah Data (Auto-Prune)</h3>
                <p className="text-sm text-stone-500 mb-6">
                  Kosongkan memori tablet dengan menghapus transaksi lama ({'>'} 30 hari) yang *sudah* aman tersimpan di Cloud.
                </p>
                <button
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isArchiving ? 'Membersihkan...' : 'Bersihkan Data Lokal'}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-8 border-t border-stone-100">
              <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
              <p className="text-sm text-stone-500 mb-4">
                Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan. Pastikan Anda telah melakukan backup.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setModalState('CLEAR')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                  Hapus Semua Data
                </button>
                <button
                  onClick={() => setModalState('RECOVER')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl transition-colors"
                >
                  <Upload size={18} />
                  Pemulihan Darurat (Cloud)
                </button>
              </div>
            </div>
          </div>
        </section>

        <TileManager />

        <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden mt-8">
          <div className="p-6 border-b border-stone-100">
            <h2 className="text-xl font-bold text-stone-800">Konfigurasi Segmentasi Pelanggan</h2>
            <p className="text-sm text-stone-500">Atur batas minimum omzet untuk menentukan kategori pelanggan.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 border border-stone-100 bg-stone-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={18} className="text-brand-900" />
                  <label className="font-bold text-stone-800">Batas Minimum VIP (Rp)</label>
                </div>
                <input
                  type="text"
                  value={parseInt(vipThreshold.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID')}
                  onChange={(e) => setVipThreshold(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-3 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-900/20 font-mono text-lg"
                />
                <p className="text-xs text-stone-500 mt-2">Pelanggan dengan total belanja di atas nilai ini akan masuk kategori VIP.</p>
              </div>
              <div className="p-4 border border-stone-100 bg-stone-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={18} className="text-brand-900" />
                  <label className="font-bold text-stone-800">Batas Minimum Loyal (Rp)</label>
                </div>
                <input
                  type="text"
                  value={parseInt(loyalThreshold.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID')}
                  onChange={(e) => setLoyalThreshold(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-3 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-900/20 font-mono text-lg"
                />
                <p className="text-xs text-stone-500 mt-2">Pelanggan dengan total belanja di atas nilai ini (tapi di bawah VIP) akan masuk kategori Loyal.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveThresholds}
                className="px-6 py-2.5 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-colors shadow-sm"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden mt-8">
          <div className="p-6 border-b border-stone-100">
            <h2 className="text-xl font-bold text-stone-800">Konfigurasi Gestur</h2>
            <p className="text-sm text-stone-500">Atur aksi cepat untuk setiap arah seretan pada Gesture Orb.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['swipeUp', 'swipeLeft', 'swipeRight'] as const).map((direction) => (
              <div key={direction} className="p-4 border border-stone-100 bg-stone-50 rounded-xl">
                <label className="block text-sm font-bold text-stone-700 mb-2 capitalize">
                  {direction.replace('swipe', 'Swipe ')}
                </label>
                <select
                  value={useGestureStore.getState()[direction]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e) => useGestureStore.getState().setSwipeAction(direction, e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="SYNC_NOW">Sync Sekarang</option>
                  <option value="OPEN_CASH_DRAWER">Buka Laci Kasir</option>
                  <option value="NEW_REPAIR">Buat Reparasi Baru</option>
                  <option value="NONE">Tidak Ada</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* Modals */}
        {modalState !== 'NONE' && modalState !== 'EXPORT_PIN' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              
              {modalState === 'IMPORT' ? (
                <>
                  <h3 className="text-xl font-bold text-stone-800 mb-2">Peringatan Pemulihan Data!</h3>
                  <p className="text-stone-500 mb-6">
                    Anda akan memulihkan data dari file <strong className="text-stone-700">{importFile?.name}</strong>. 
                    <br/><br/>
                    <span className="text-red-600 font-medium">Data saat ini akan terhapus secara permanen dan ditimpa dengan data dari file ini.</span> Apakah Anda yakin?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setModalState('NONE');
                        setImportFile(null);
                      }}
                      className="flex-1 px-4 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={confirmImport}
                      disabled={isImporting}
                      className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-xl font-bold shadow-sm transition-all"
                    >
                      {isImporting ? 'Memulihkan...' : 'Ya, Timpa Data'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-stone-800 mb-2">
                    {modalState === 'CLEAR' ? 'Hapus Semua Data?' : 'Pemulihan Darurat?'}
                  </h3>
                  <p className="text-stone-500 mb-6">
                    {modalState === 'CLEAR' ? (
                      <>
                        Tindakan ini akan menghapus <strong>seluruh stok, transaksi, reparasi, dan log audit</strong> dari database. 
                        <br/><br/>
                        <span className="text-red-600 font-medium">Tindakan ini tidak dapat dibatalkan!</span>
                      </>
                    ) : (
                      <>
                        Tindakan ini akan <strong>menimpa data lokal</strong> dengan data terbaru dari Cloud.
                        <br/><br/>
                        <span className="text-blue-600 font-medium">Pastikan Anda benar-benar perlu melakukan ini.</span>
                      </>
                    )}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalState('NONE')}
                      className="flex-1 px-4 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={modalState === 'CLEAR' ? confirmClear : confirmRecover}
                      disabled={isClearing || isRecovering}
                      className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold shadow-sm transition-all ${
                        modalState === 'CLEAR' ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
                      }`}
                    >
                      {isClearing || isRecovering ? 'Memproses...' : modalState === 'CLEAR' ? 'Ya, Hapus Semua' : 'Ya, Pulihkan'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <ManagerAuthDialog
          isOpen={modalState === 'EXPORT_PIN'}
          actionName="Export Data Backup"
          onSuccess={handleExportEncrypted}
          onCancel={() => setModalState('NONE')}
        />

        <ManagerAuthDialog
          isOpen={modalState === 'IMPORT_PIN'}
          actionName="Otorisasi Pemulihan Database"
          onSuccess={handleImportEncrypted}
          onCancel={() => {
            setModalState('NONE');
            setImportFile(null);
          }}
        />
      </div>
  );
}
