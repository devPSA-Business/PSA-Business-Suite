import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Lock, ArrowLeft } from 'lucide-react';
import { useSecurityStore } from '../store/useSecurityStore';
import { CustomNumpad as BaseCustomNumpad } from '../../features/pos/components/CustomNumpad';

const CustomNumpad = memo(BaseCustomNumpad);

interface PinGateProps {
  children: React.ReactNode;
}

export const PinGate: React.FC<PinGateProps> = ({ children }) => {
  const { isPinVerified, verifyAdminPin, lock } = useSecurityStore();
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lock]);

  useEffect(() => {
    if (!isPinVerified && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPinVerified]);

  useEffect(() => {
    if (pinInput.length === 6) {
      verifyAdminPin(pinInput).then(isValid => {
        if (!isValid) {
          setError(true);
          setTimeout(() => {
            setPinInput('');
            setError(false);
          }, 500);
        }
      });
    }
  }, [pinInput, verifyAdminPin]);

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

  if (!isPinVerified) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md p-4">
        <input
          ref={inputRef}
          type="text"
          inputMode="none"
          className="opacity-0 absolute"
          value={pinInput}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length <= 6) setPinInput(val);
          }}
        />
        <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-2 transition-colors ${error ? 'border-red-500' : 'border-transparent'}`}>
          <div className="p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-brand-900" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-brand-900 mb-2 text-center">Akses Terbatas</h2>
            <p className="text-stone-500 text-center mb-8">Masukkan Master PIN untuk melanjutkan</p>

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

            <button
              onClick={() => navigate({ to: '/cashier', replace: true })}
              className="flex items-center gap-2 text-stone-500 hover:text-brand-900 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Kasir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
