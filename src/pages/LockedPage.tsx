/**
 * @ai_context: Halaman kunci layar dengan autentikasi PIN dan pemulihan via Recovery Key.
 * @security_tier: HIGH
 * @business_rule: Recovery Key flow memungkinkan owner mereset PIN tanpa kehilangan data.
 *                 Recovery Key TIDAK disimpan di server — hanya disimpan fisik oleh owner.
 * @data-component-id: locked-page
 * @data-error-domain: auth
 * @changelog:
 *   2026-05-20 — Tambah "Lupa PIN? Gunakan Recovery Key" flow (P1 Remediation)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Lock, ArrowLeft, User as UserIcon, ChevronRight, AlertTriangle, Beaker, RotateCcw, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useSecurityStore, hashPin } from '../shared/store/useSecurityStore';
import { CustomNumpad } from '../features/pos/components/CustomNumpad';
import { db, User } from '../shared/api/db';
import { useToastStore } from '../shared/store/toastStore';
import { cryptoDB } from '../lib/cryptoIndexedDB';

/** Sub-view yang sedang aktif di LockedPage */
type ActiveView = 'select_user' | 'enter_pin' | 'force_pin_change' | 'recovery_key' | 'reset_confirm';

export function LockedPage() {
  const { isPinVerified, verifyUserPin } = useSecurityStore();
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('select_user');

  // Force PIN Change State
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');

  // Recovery Key State
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'enter_key' | 'set_new_pin'>('enter_key');
  const [isRecovering, setIsRecovering] = useState(false);

  const navigate = useNavigate();
  const search = useSearch({ from: '/locked' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const activeUsers = await db.users.where('status').equals('ACTIVE').toArray();
        setUsers(activeUsers);
      } catch (err) {
        logger.error('[LockedPage] Failed to fetch users', { error: err });
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isPinVerified && activeView === 'enter_pin') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: (search.redirect as any) || '/' });
    }
  }, [isPinVerified, navigate, search.redirect, activeView]);

  const handlePress = useCallback((value: string) => {
    if (pinInput.length < 6 && value !== '.') {
      setPinInput((prev) => prev + value);
      setError(false);
    }
  }, [pinInput.length]);

  const handleDelete = useCallback(() => {
    setPinInput((prev) => prev.slice(0, -1));
    setError(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeView !== 'enter_pin') return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, handlePress, handleDelete]);

  useEffect(() => {
    if (pinInput.length === 6 && selectedUser && activeView === 'enter_pin') {
      const checkPin = async () => {
        const needsChange = await useSecurityStore.getState().checkRequiresPinChange(selectedUser.id, pinInput);
        if (needsChange) {
          setActiveView('force_pin_change');
          return;
        }
        const isValid = await verifyUserPin(selectedUser.id, pinInput);
        if (!isValid) {
          setError(true);
          setTimeout(() => {
            setPinInput('');
            setError(false);
          }, 500);
        }
      };
      checkPin();
    }
  }, [pinInput, selectedUser, verifyUserPin, activeView]);

  const handleSaveNewPin = async () => {
    setPinChangeError('');
    if (newPin.length !== 6) { setPinChangeError('PIN baru harus 6 digit angka.'); return; }
    if (newPin !== confirmNewPin) { setPinChangeError('Konfirmasi PIN tidak cocok.'); return; }
    if (!selectedUser) return;
    try {
      const hashedNewPin = await hashPin(newPin, selectedUser.id);
      await db.users.update(selectedUser.id, { pinHash: hashedNewPin });
      addToast('PIN berhasil diperbarui. Silakan masuk dengan PIN baru Anda.', 'success');
      setActiveView('enter_pin');
      setPinInput('');
      setNewPin('');
      setConfirmNewPin('');
    } catch (err) {
      logger.error('[LockedPage] Failed to update PIN', { error: err });
      setPinChangeError('Gagal memperbarui PIN. Silakan coba lagi.');
    }
  };

  /**
   * Alur Recovery Key — Step 1: Verifikasi recovery key dan buka database.
   * Menggunakan cryptoDB.unwrapKeyWithRecoveryKey yang baru diimplementasikan.
   */
  const handleVerifyRecoveryKey = async () => {
    if (!selectedUser) return;
    if (!recoveryKeyInput.trim()) {
      setRecoveryError('Recovery Key tidak boleh kosong.');
      return;
    }
    setIsRecovering(true);
    setRecoveryError('');
    try {
      // Ambil wrapped device key dan salt dari db.keyval
      const wrappedByRK = await db.keyval.get('rk_wrapped_device_key');
      const saltBase64 = await db.keyval.get('device_key_salt');

      if (!wrappedByRK?.value || !saltBase64?.value) {
        setRecoveryError(
          'Recovery Key tidak terdaftar di perangkat ini. ' +
          'Pastikan Recovery Key sudah di-generate dari menu Pengaturan → Keamanan sebelumnya.'
        );
        return;
      }

      const saltBuffer = Uint8Array.from(atob(saltBase64.value), c => c.charCodeAt(0));
      await cryptoDB.unwrapKeyWithRecoveryKey(
        wrappedByRK.value,
        recoveryKeyInput.trim(),
        saltBuffer
      );

      // Recovery berhasil — minta PIN baru
      setRecoveryStep('set_new_pin');
      addToast('Recovery Key valid. Silakan set PIN baru Anda.', 'success');
    } catch (err) {
      setRecoveryError(
        err instanceof Error
          ? err.message
          : 'Recovery Key tidak valid. Periksa kembali setiap kata dengan teliti.'
      );
    } finally {
      setIsRecovering(false);
    }
  };

  /**
   * Alur Recovery Key — Step 2: Set PIN baru setelah recovery berhasil.
   * Re-wrap device key dengan PIN baru dan simpan kembali ke db.keyval.
   */
  const handleSetPinAfterRecovery = async () => {
    if (!selectedUser) return;
    setRecoveryError('');
    if (recoveryNewPin.length !== 6) { setRecoveryError('PIN baru harus 6 digit angka.'); return; }
    if (recoveryNewPin !== recoveryConfirmPin) { setRecoveryError('Konfirmasi PIN tidak cocok.'); return; }

    setIsRecovering(true);
    try {
      const saltBase64Entry = await db.keyval.get('device_key_salt');
      if (!saltBase64Entry?.value) throw new Error('Salt perangkat tidak ditemukan.');
      const saltBuffer = Uint8Array.from(atob(saltBase64Entry.value), c => c.charCodeAt(0));

      const rawKey = cryptoDB.getRawDeviceKey();
      if (!rawKey) throw new Error('Device key tidak tersedia di memori. Ulangi proses recovery.');

      // Wrap ulang dengan PIN baru
      const newWrappedByPin = await cryptoDB.wrapRawKeyWithPin(rawKey, recoveryNewPin, saltBuffer);
      await db.keyval.put({ key: 'wrapped_device_key', value: newWrappedByPin });

      // FIX KRITIS-2: Gunakan random salt untuk PIN baru (bukan userId deterministik).
      // Ini konsisten dengan BATCH F fix di EmployeesPage untuk keamanan yang lebih kuat.
      const newPinSalt = crypto.getRandomValues(new Uint8Array(32));
      const hashedNewPin = await hashPin(recoveryNewPin, newPinSalt);
      await db.users.update(selectedUser.id, {
        pinHash: hashedNewPin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        salt: newPinSalt as any,  // Uint8Array — Dexie menerima, type cast diperlukan karena Dexie Table<User> mendeklarasikan salt: string|Uint8Array
      });

      addToast('PIN berhasil direset! Silakan login dengan PIN baru.', 'success');

      // Reset semua state recovery dan kembali ke login
      setActiveView('enter_pin');
      setRecoveryKeyInput('');
      setRecoveryNewPin('');
      setRecoveryConfirmPin('');
      setRecoveryStep('enter_key');
      setPinInput('');
    } catch (err) {
      setRecoveryError(
        err instanceof Error ? err.message : 'Gagal mereset PIN. Coba ulangi dari awal.'
      );
    } finally {
      setIsRecovering(false);
    }
  };

  /**
   * @ai_context: Nuclear reset — menghapus IndexedDB PSA dan semua kunci localStorage/sessionStorage
   *              milik aplikasi PSA saja. Tidak menyentuh kunci browser lain (ekstensi, PWA lain, dsb).
   * @business_rule: Panggil ini HANYA saat owner mengonfirmasi reset dari UI reset_confirm.
   *                 FIX C-02: Mengganti window.localStorage.clear() yang berbahaya (menghapus semua kunci
   *                 browser, termasuk milik ekstensi/tool lain) dengan penghapusan selektif kunci PSA.
   * @security_tier: HIGH
   * @changelog: 2026-05-21 — FIX C-02: Selective localStorage removal. Eliminasi "The Shortcut" pattern.
   */
  const handleResetDatabase = async () => {
    try {
      db.close();
      await db.delete();

      // Hapus hanya kunci localStorage yang dimiliki PSA Business Suite.
      // Pola: 'psa_*', 'vite-*', dan kunci spesifik yang diketahui dipakai aplikasi.
      // DILARANG menggunakan localStorage.clear() — bisa menghapus data ekstensi/tab browser lain.
      const PSA_LOCALSTORAGE_KEYS = [
        'psa_store_setup_complete',
        'psa_last_sync',
        'psa_shift_active',
        'psa_theme',
        'psa_language',
        'psa_dev_bypass',
      ];
      PSA_LOCALSTORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));

      // Hapus semua kunci yang diawali prefix PSA (dinamis, jika ada).
      const PSA_PREFIXES = ['psa_', 'PSA_'];
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (key && PSA_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          window.localStorage.removeItem(key);
        }
      }

      // sessionStorage: selektif untuk prefix PSA juga.
      for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
        const key = window.sessionStorage.key(i);
        if (key && PSA_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          window.sessionStorage.removeItem(key);
        }
      }

      window.location.replace('/');
    } catch (err) {
      logger.error('[LockedPage] Gagal Reset Database', { error: err });
      addToast('Terjadi kesalahan saat mereset: ' + (err instanceof Error ? err.message : String(err)), 'error');
      setActiveView('enter_pin');
    }
  };

  const resetToUserSelect = () => {
    setSelectedUser(null);
    setPinInput('');
    setActiveView('select_user');
    setRecoveryKeyInput('');
    setRecoveryNewPin('');
    setRecoveryConfirmPin('');
    setRecoveryError('');
    setRecoveryStep('enter_key');
    setNewPin('');
    setConfirmNewPin('');
    setPinChangeError('');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md p-4"
      data-component-id="locked-page"
      data-error-domain="auth"
    >
      {/* === KONFIRMASI RESET DATABASE === */}
      {activeView === 'reset_confirm' ? (
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200 flex flex-col items-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner shadow-red-200">
            <RotateCcw className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-2 text-center">PERINGATAN KRITIKAL</h2>
          <p className="text-stone-600 text-center mb-6 text-sm">
            Aksi ini akan <b className="text-red-600">MENGHAPUS SEMUA DATA</b> yang ada di perangkat ini secara permanen.
            Yakin ingin melanjutkan?
          </p>
          <div className="w-full flex flex-col gap-3">
            <button onClick={handleResetDatabase} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95">
              Ya, Reset Sekarang
            </button>
            <button onClick={() => setActiveView('enter_pin')} className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all active:scale-95">
              Batal
            </button>
          </div>
        </div>

      /* === RECOVERY KEY FLOW === */
      ) : activeView === 'recovery_key' ? (
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-serif font-bold text-brand-900 mb-1 text-center">Pulihkan dengan Recovery Key</h2>
            <p className="text-stone-500 text-center text-sm mb-6">
              {recoveryStep === 'enter_key'
                ? 'Masukkan Recovery Key (24 kata) yang Anda catat saat pertama kali setup perangkat.'
                : 'Recovery Key valid. Sekarang buat PIN baru untuk akun Anda.'
              }
            </p>

            {recoveryStep === 'enter_key' ? (
              <>
                <div className="w-full mb-4 relative">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Recovery Key</label>
                  <textarea
                    rows={4}
                    value={recoveryKeyInput}
                    onChange={(e) => { setRecoveryKeyInput(e.target.value); setRecoveryError(''); }}
                    placeholder="Ketik atau tempel 24 kata Recovery Key Anda di sini..."
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm font-mono resize-none"
                    style={{ WebkitTextSecurity: showRecoveryKey ? 'none' : 'disc' } as React.CSSProperties}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryKey(v => !v)}
                    className="absolute right-3 top-8 text-stone-400 hover:text-stone-600 transition-colors"
                    aria-label={showRecoveryKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showRecoveryKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {recoveryError && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                    <p className="text-red-600 text-sm font-medium">{recoveryError}</p>
                  </div>
                )}

                <button
                  onClick={handleVerifyRecoveryKey}
                  disabled={isRecovering || !recoveryKeyInput.trim()}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-colors active:scale-95 mb-3"
                >
                  {isRecovering ? 'Memverifikasi...' : 'Verifikasi Recovery Key'}
                </button>
              </>
            ) : (
              <>
                <div className="w-full space-y-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">PIN Baru (6 Digit)</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={recoveryNewPin}
                      onChange={(e) => setRecoveryNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center tracking-[0.5em] font-bold"
                      placeholder="••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Konfirmasi PIN Baru</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={recoveryConfirmPin}
                      onChange={(e) => setRecoveryConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center tracking-[0.5em] font-bold"
                      placeholder="••••••"
                    />
                  </div>
                </div>

                {recoveryError && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                    <p className="text-red-600 text-sm font-medium">{recoveryError}</p>
                  </div>
                )}

                <button
                  onClick={handleSetPinAfterRecovery}
                  disabled={isRecovering || recoveryNewPin.length !== 6}
                  className="w-full bg-brand-900 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-colors active:scale-95 mb-3"
                >
                  {isRecovering ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
              </>
            )}

            <button
              onClick={resetToUserSelect}
              className="flex items-center gap-2 text-stone-500 hover:text-brand-900 transition-colors font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Pilih Pengguna
            </button>
          </div>
        </div>

      /* === MAIN LOGIN CARD === */
      ) : (
        <div className={`bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-2 transition-all ${error ? 'border-red-500' : 'border-transparent'}`}>
          <div className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-brand-900" />
            </div>

            {/* === PILIH USER === */}
            {activeView === 'select_user' && (
              <>
                <h2 className="text-2xl font-serif font-bold text-brand-900 mb-2 text-center">Pilih Pengguna</h2>
                <p className="text-stone-500 text-center mb-8">Pilih profil Anda untuk masuk ke sistem</p>
                <div className="w-full space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => { setSelectedUser(user); setActiveView('enter_pin'); }}
                      className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-stone-400 group-hover:text-brand-900 transition-colors">
                          <UserIcon size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-stone-800">{user.name}</p>
                          <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">{user.role}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-stone-300 group-hover:text-brand-900 transition-colors" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* === FORCE PIN CHANGE === */}
            {activeView === 'force_pin_change' && (
              <div className="w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-serif font-bold text-brand-900 mb-2 text-center">Pembaruan Keamanan Wajib</h2>
                <p className="text-stone-500 text-center text-sm mb-6">
                  Anda menggunakan PIN default. Demi keamanan, Anda wajib membuat PIN baru (6 digit angka) sebelum melanjutkan.
                </p>
                <div className="w-full space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">PIN Baru (6 Digit)</label>
                    <input type="password" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-center tracking-[0.5em] font-bold" placeholder="••••••" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Konfirmasi PIN Baru</label>
                    <input type="password" maxLength={6} value={confirmNewPin} onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-center tracking-[0.5em] font-bold" placeholder="••••••" />
                  </div>
                </div>
                {pinChangeError && <p className="text-red-500 text-sm font-medium mb-4 text-center">{pinChangeError}</p>}
                <button onClick={handleSaveNewPin} className="w-full bg-brand-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-brand-800 transition-colors active:scale-95 mb-4">
                  Simpan PIN Baru
                </button>
              </div>
            )}

            {/* === INPUT PIN === */}
            {activeView === 'enter_pin' && selectedUser && (
              <>
                <button onClick={resetToUserSelect} className="mb-4 text-xs font-bold text-brand-900/50 hover:text-brand-900 uppercase tracking-widest flex items-center gap-1 transition-colors">
                  <ArrowLeft size={14} /> Ganti Pengguna
                </button>
                <h2 className="text-2xl font-serif font-bold text-brand-900 mb-1 text-center">{selectedUser.name}</h2>
                <p className="text-stone-500 text-center mb-4">Masukkan PIN Anda</p>
                <div className="flex gap-3 mb-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pinInput.length ? 'bg-brand-900 scale-110' : 'bg-stone-200'} ${error ? 'bg-red-500' : ''}`} />
                  ))}
                </div>
                {error && <p className="text-red-500 text-sm font-medium mb-4">PIN salah</p>}
                <div className="w-full mb-6">
                  <CustomNumpad onPress={handlePress} onDelete={handleDelete} />
                </div>

                {/* Tombol Lupa PIN */}
                <button
                  onClick={() => { setActiveView('recovery_key'); setRecoveryStep('enter_key'); setRecoveryError(''); }}
                  className="text-xs text-amber-600 hover:text-amber-800 font-semibold underline underline-offset-2 transition-colors mb-2"
                >
                  Lupa PIN? Gunakan Recovery Key
                </button>
              </>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-col items-center gap-4 mt-6 w-full">
              <button onClick={() => navigate({ to: '/', replace: true })} className="flex items-center gap-2 text-stone-500 hover:text-brand-900 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Beranda
              </button>

              {import.meta.env.DEV === true && (
                <button
                  onClick={() => { useSecurityStore.setState({ isPinVerified: true }); navigate({ to: (search.redirect as unknown as string) || '/' }); }}
                  className="flex items-center gap-2 text-stone-400 hover:text-stone-700 transition-colors font-bold text-sm bg-stone-100 px-4 py-2 rounded-lg"
                >
                  <Beaker size={16} />
                  Bypass PIN (Sandbox Mode)
                </button>
              )}

              <button
                onClick={() => setActiveView('reset_confirm')}
                className="text-[10px] uppercase font-bold tracking-wider text-red-500 hover:text-red-700 border border-red-300 bg-red-50 hover:bg-red-100 rounded-lg px-4 py-2 transition-colors active:scale-95 shadow-sm"
              >
                Darurat: Reset Database Lokal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
