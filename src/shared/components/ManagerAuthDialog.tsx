import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { useSecurityStore } from '../store/useSecurityStore';
import { CustomNumpad } from '../../features/pos/components/CustomNumpad';

interface ManagerAuthDialogProps {
  isOpen: boolean;
  actionName: string;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

export const ManagerAuthDialog: React.FC<ManagerAuthDialogProps> = ({ isOpen, actionName, onSuccess, onCancel }) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);
  const[isVerifying, setIsVerifying] = useState(false);
  const { verifyAdminPin } = useSecurityStore();

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (pinInput.length === 6) {
      const checkPin = async () => {
        setIsVerifying(true);
        // verifyAdminPin sudah mengecek apakah user memiliki role ADMIN/MANAGER
        const isValid = await verifyAdminPin(pinInput);
        setIsVerifying(false);
        
        if (isValid) {
          onSuccess(pinInput);
        } else {
          setError(true);
          setTimeout(() => {
            setPinInput('');
            setError(false);
          }, 500);
        }
      };
      checkPin();
    }
  }, [pinInput, verifyAdminPin, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border-2 transition-colors ${error ? 'border-red-500' : 'border-transparent'}`}>
        <div className="p-6 sm:p-8 flex flex-col items-center relative">
          <button onClick={onCancel} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-stone-400 hover:text-stone-600 p-1">
            <X size={24} className="sm:w-6 sm:h-6 w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-900 mb-2 text-center">Otorisasi Manager</h2>
          <p className="text-stone-500 text-center mb-4 sm:mb-6 text-xs sm:text-sm">
            Tindakan <strong className="text-stone-800">{actionName}</strong> memerlukan persetujuan Manager/Admin.
          </p>

          <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-200 ${i < pinInput.length ? 'bg-brand-900 scale-110' : 'bg-stone-200'} ${error ? 'bg-red-500' : ''}`}
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-xs sm:text-sm font-bold mb-4">PIN Tidak Valid / Akses Ditolak</p>}
          {isVerifying && <p className="text-brand-900 text-xs sm:text-sm font-bold mb-4 flex items-center gap-2"><Loader2 className="animate-spin sm:w-4 sm:h-4 w-3 h-3" size={16} /> Memverifikasi...</p>}

          <div className="w-full">
            <CustomNumpad 
              onPress={(val) => pinInput.length < 6 && setPinInput(p => p + val)} 
              onDelete={() => setPinInput(p => p.slice(0, -1))} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
