/**
 * @ai_context    : Dialog konfirmasi universal untuk aksi destruktif (Hapus, Void, Reset).
 * @security_tier : HIGH
 * @business_rule : Aksi dengan level DANGER wajib mengetik ulang kata konfirmasi (misal: "HAPUS") untuk mencegah human error.
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle, XOctagon } from 'lucide-react';

type DangerLevel = 'warn' | 'danger';

interface ConfirmActionDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmWord?: string;
  dangerLevel?: DangerLevel;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  isOpen,
  title,
  description,
  confirmWord,
  dangerLevel = 'warn',
  confirmLabel = 'Ya, Lanjutkan',
  onConfirm,
  onCancel,
}) => {
  const [typedWord, setTypedWord] = useState('');

  useEffect(() => {
    if (isOpen) setTypedWord('');
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = dangerLevel === 'danger';
  const isReady = confirmWord ? typedWord === confirmWord : true;

  const handleConfirm = () => {
    if (!isReady) return;
    setTypedWord('');
    onConfirm();
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      data-component-id="ConfirmActionDialog"
      data-error-domain="user-action"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-sm w-full mx-auto shadow-2xl animate-in zoom-in-95 duration-200 border border-stone-200 text-center">
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ${isDanger ? 'bg-red-50 text-red-600 shadow-red-100' : 'bg-amber-50 text-amber-600 shadow-amber-100'}`}>
          {isDanger ? <XOctagon size={32} /> : <AlertTriangle size={32} />}
        </div>

        <h2 id="confirm-title" className="text-xl font-serif font-bold text-stone-800 mb-2">
          {title}
        </h2>

        <p id="confirm-desc" className="text-sm text-stone-500 mb-6 leading-relaxed">
          {description}
        </p>

        {confirmWord && (
          <div className="mb-6 text-left bg-stone-50 p-4 rounded-xl border border-stone-200">
            <label className="block text-xs font-bold text-stone-500 mb-2">
              Ketik <strong className="text-red-600 select-none">{confirmWord}</strong> untuk konfirmasi:
            </label>
            <input
              type="text"
              value={typedWord}
              onChange={e => setTypedWord(e.target.value)}
              className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-center tracking-widest"
              autoComplete="off"
              spellCheck={false}
              placeholder={confirmWord}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors active:scale-95"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isReady}
            className={`flex-1 py-3.5 rounded-xl font-black shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
              isDanger
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'
                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
