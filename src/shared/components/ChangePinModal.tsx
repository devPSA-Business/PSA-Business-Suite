import React, { useState } from 'react';
import { X, Key, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSecurityStore, hashPin } from '../store/useSecurityStore';
import { db } from '../api/db';
import { useToastStore } from '../store/toastStore';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const user = useAuthStore(state => state.user);
  const { addToast } = useToastStore();
  
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setError('PIN baru harus 6 digit angka.');
      return;
    }

    if (newPin !== confirmNewPin) {
      setError('Konfirmasi PIN baru tidak cocok.');
      return;
    }

    setIsProcessing(true);
    try {
      const userInDb = await db.users.get(user.id);
      if (!userInDb) {
        setError('Pengguna tidak ditemukan.');
        setIsProcessing(false);
        return;
      }

      const hashedCurrentPin = await hashPin(currentPin, user.id);
      
      // The previous code checked: if (userInDb.pinHash !== hashedCurrentPin)
      // We should check both PBKDF2 hash and the old SHA-256 for backward compatibility.
      let isPinValid = false;
      if (userInDb.pinHash === hashedCurrentPin) {
        isPinValid = true;
      } else {
         const msgBuffer = new TextEncoder().encode(currentPin);
         const oldHashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
         const oldHashArray = Array.from(new Uint8Array(oldHashBuffer));
         const oldHash = oldHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
         if (userInDb.pinHash === oldHash) isPinValid = true;
      }

      if (!isPinValid) {
        setError('PIN saat ini salah.');
        setIsProcessing(false);
        return;
      }

      const hashedNewPin = await hashPin(newPin, user.id);
      await db.users.update(user.id, { pinHash: hashedNewPin });
      
      addToast('PIN berhasil diperbarui.', 'success');
      
      // Reset form
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      onClose();
    } catch (err) {
      console.error('Failed to change PIN:', err);
      setError('Gagal memperbarui PIN. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-2 border-transparent">
        <div className="p-6 sm:p-8 flex flex-col items-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-stone-400 hover:text-stone-600 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors">
            <X size={24} className="sm:w-6 sm:h-6 w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-brand-900" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-900 mb-2 text-center">Ganti PIN Saya</h2>
          <p className="text-stone-500 text-center mb-6 sm:mb-8 text-xs sm:text-sm">
            Perbarui PIN keamanan Anda secara berkala untuk menjaga keamanan akun.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">PIN Saat Ini</label>
              <input 
                type="password" 
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full p-2.5 sm:p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center tracking-[0.3em] sm:tracking-[0.5em] font-bold text-sm sm:text-base"
                placeholder="••••••"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">PIN Baru (6 Digit)</label>
              <input 
                type="password" 
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full p-2.5 sm:p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center tracking-[0.3em] sm:tracking-[0.5em] font-bold text-sm sm:text-base"
                placeholder="••••••"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Konfirmasi PIN Baru</label>
              <input 
                type="password" 
                maxLength={6}
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full p-2.5 sm:p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center tracking-[0.3em] sm:tracking-[0.5em] font-bold text-sm sm:text-base"
                placeholder="••••••"
                required
              />
            </div>

            {error && <p className="text-red-500 text-xs sm:text-sm font-medium text-center mt-2">{error}</p>}

            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full bg-brand-900 text-gold-500 font-bold py-3 px-4 rounded-xl hover:bg-brand-800 transition-colors active:scale-95 mt-4 disabled:opacity-50 text-sm sm:text-base"
            >
              {isProcessing ? 'Menyimpan...' : 'Simpan PIN Baru'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
