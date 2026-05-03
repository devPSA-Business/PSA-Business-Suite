import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Lock, ArrowLeft, User as UserIcon, ChevronRight, AlertTriangle, Beaker, RotateCcw } from 'lucide-react';
import { useSecurityStore, hashPin } from '../shared/store/useSecurityStore';
import { CustomNumpad } from '../features/pos/components/CustomNumpad';
import { db, User } from '../shared/api/db';
import { useToastStore } from '../shared/store/toastStore';

export function LockedPage() {
  const { isPinVerified, verifyUserPin } = useSecurityStore();
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Force PIN Change State
  const [requirePinChange, setRequirePinChange] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');

  // Reset Confirmation State
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const navigate = useNavigate();
  const search = useSearch({ from: '/locked' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const activeUsers = await db.users.where('status').equals('ACTIVE').toArray();
        setUsers(activeUsers);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Jika sudah terverifikasi, kembalikan ke halaman sebelumnya
  useEffect(() => {
    if (isPinVerified && !requirePinChange) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: (search.redirect as any) || '/' });
    }
  }, [isPinVerified, navigate, search.redirect, requirePinChange]);

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
      if (!selectedUser || showResetConfirm) return;
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
  }, [pinInput, selectedUser, showResetConfirm, handlePress, handleDelete]);

  useEffect(() => {
    if (pinInput.length === 6 && selectedUser && !requirePinChange) {
      const checkPin = async () => {
        // CEGAT DI SINI: Jika Admin Default dan PIN Default, JANGAN login dulu.
        const needsChange = await useSecurityStore.getState().checkRequiresPinChange(selectedUser.id, pinInput);
        
        if (needsChange) {
           setRequirePinChange(true);
           return; 
        }

        // Jika bukan kondisi di atas, lakukan verifikasi normal
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
  }, [pinInput, selectedUser, verifyUserPin, requirePinChange]);

  const handleSaveNewPin = async () => {
    setPinChangeError('');
    if (newPin.length !== 6) {
      setPinChangeError('PIN baru harus 6 digit angka.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinChangeError('Konfirmasi PIN tidak cocok.');
      return;
    }
    if (!selectedUser) return;

    try {
      const hashedNewPin = await hashPin(newPin, selectedUser.id);
      await db.users.update(selectedUser.id, { pinHash: hashedNewPin });
      addToast('PIN berhasil diperbarui. Silakan masuk dengan PIN baru Anda.', 'success');
      
      // Reset state agar kembali ke layar input PIN untuk menguji PIN baru
      setRequirePinChange(false);
      setPinInput('');
      setNewPin('');
      setConfirmNewPin('');
    } catch (err) {
      console.error('Failed to update PIN:', err);
      setPinChangeError('Gagal memperbarui PIN. Silakan coba lagi.');
    }
  };

  const handleResetDatabase = async () => {
    try {
      // Tutup koneksi secara eksplist untuk menghindari error blocking di DB yang aktif
      db.close(); 
      await db.delete();
      
      // Bersihkan memori Storage murni
      window.localStorage.clear();
      window.sessionStorage.clear();
      
      // Muat ulang mesin paksa
      window.location.replace('/');
    } catch (err) {
      console.error("Gagal Reset:", err);
      addToast("Terjadi kesalahan saat mereset: " + (err instanceof Error ? err.message : String(err)), "error");
      setShowResetConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md p-4">
      {/* Container List User & Input PIN */}
      {!showResetConfirm ? (
        <div className={`bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-2 transition-all ${error ? 'border-red-500' : 'border-transparent'}`}>
          <div className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-brand-900" />
            </div>
            
            {!selectedUser ? (
              <>
                <h2 className="text-2xl font-serif font-bold text-brand-900 mb-2 text-center">Pilih Pengguna</h2>
                <p className="text-stone-500 text-center mb-8">Pilih profil Anda untuk masuk ke sistem</p>
                
                <div className="w-full space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
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
            ) : requirePinChange ? (
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
                    <input 
                      type="password" 
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center tracking-[0.5em] font-bold"
                      placeholder="••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Konfirmasi PIN Baru</label>
                    <input 
                      type="password" 
                      maxLength={6}
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center tracking-[0.5em] font-bold"
                      placeholder="••••••"
                    />
                  </div>
                </div>
                
                {pinChangeError && <p className="text-red-500 text-sm font-medium mb-4 text-center">{pinChangeError}</p>}
                
                <button 
                  onClick={handleSaveNewPin}
                  className="w-full bg-brand-900 text-gold-500 font-bold py-3 px-4 rounded-xl hover:bg-brand-800 transition-colors active:scale-95 mb-4"
                >
                  Simpan PIN Baru
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => { setSelectedUser(null); setPinInput(''); }}
                  className="mb-4 text-xs font-bold text-brand-900/50 hover:text-brand-900 uppercase tracking-widest flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft size={14} /> Ganti Pengguna
                </button>
                <h2 className="text-2xl font-serif font-bold text-brand-900 mb-1 text-center">{selectedUser.name}</h2>
                <p className="text-stone-500 text-center mb-4">Masukkan PIN Anda</p>
  
                <div className="flex gap-3 mb-8">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pinInput.length ? 'bg-brand-900 scale-110' : 'bg-stone-200'} ${error ? 'bg-red-500' : ''}`}
                    />
                  ))}
                </div>
  
                {error && <p className="text-red-500 text-sm font-medium mb-4">PIN salah</p>}
  
                <div className="w-full mb-6">
                  <CustomNumpad onPress={handlePress} onDelete={handleDelete} />
                </div>
              </>
            )}
  
            <div className="flex flex-col items-center gap-4 mt-8 w-full">
              <button
                onClick={() => navigate({ to: '/', replace: true })}
                className="flex items-center gap-2 text-stone-500 hover:text-brand-900 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Beranda
              </button>
  
              {import.meta.env.DEV === true && (
                <button
                  onClick={() => {
                    useSecurityStore.setState({ isPinVerified: true });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    navigate({ to: (search.redirect as any) || '/' });
                  }}
                  className="flex items-center gap-2 text-stone-400 hover:text-stone-700 transition-colors font-bold text-sm bg-stone-100 px-4 py-2 rounded-lg"
                >
                  <Beaker size={16} />
                  Bypass PIN (Sandbox Mode)
                </button>
              )}
  
              {/* Helper Darurat: Modal Konfirmasi Reset Database */}
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-[10px] uppercase font-bold tracking-wider text-red-500 hover:text-red-700 border border-red-300 bg-red-50 hover:bg-red-100 rounded-lg px-4 py-2 transition-colors active:scale-95 shadow-sm"
              >
                Darurat: Reset Database Lokal
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* UI Konfirmasi Reset Database Lokal */
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200 flex flex-col items-center border border-red-100">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner shadow-red-200">
              <RotateCcw className="w-8 h-8 text-red-600" />
           </div>
           <h2 className="text-xl font-bold text-stone-800 mb-2 text-center flex items-center gap-2 justify-center">PERINGATAN KRITIKAL</h2>
           <p className="text-stone-600 text-center mb-6 text-sm">
             Aksi ini akan <b className="text-red-600">MENGHAPUS SEMUA DATA</b> yang ada di perangkat ini secara permanen. Anda akan diminta melakukan setup ulang awal. Yakin ingin melanjutkan?
           </p>
           
           <div className="w-full flex flex-col gap-3">
             <button
                onClick={handleResetDatabase}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
             >
               Ya, Reset Sekarang
             </button>
             <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all active:scale-95"
             >
               Batal
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
