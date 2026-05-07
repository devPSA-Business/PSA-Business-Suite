/**
 * @ai_context    : Dialog penjelasan sebelum request browser permission (Kamera/Lokasi).
 * @security_tier : MEDIUM
 * @business_rule : User HARUS tahu kenapa permission diminta sebelum browser prompt muncul untuk mencegah penolakan izin secara tidak sengaja.
 */
import React, { useState, useCallback } from 'react';

interface PermissionExplainerProps {
  icon: string;
  title: string;
  reason: string;
  onAllow: () => void;
  onDeny: () => void;
}

export const PermissionExplainer: React.FC<PermissionExplainerProps> = ({
  icon, title, reason, onAllow, onDeny
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-title"
      data-component-id="PermissionExplainer"
      data-error-domain="permission"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-[2rem] p-8 max-w-sm mx-auto shadow-2xl animate-in zoom-in-95 duration-200 text-center border border-stone-200">
        <div className="text-5xl mb-4">{icon}</div>
        <h2 id="perm-title" className="text-xl font-serif font-bold text-brand-900 mb-3">
          {title}
        </h2>
        <p className="text-sm text-stone-500 mb-8 leading-relaxed">{reason}</p>
        <div className="flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors active:scale-95"
          >
            Nanti Saja
          </button>
          <button
            onClick={onAllow}
            className="flex-1 py-3 bg-brand-900 text-gold-500 rounded-xl font-bold hover:bg-brand-800 transition-colors shadow-md active:scale-95"
            autoFocus
          >
            Izinkan
          </button>
        </div>
      </div>
    </div>
  );
};

export function useCameraWithExplainer() {
  const[showExplainer, setShowExplainer] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [resolver, setResolver] = useState<((allowed: boolean) => void) | null>(null);

  const requestCamera = useCallback((): Promise<MediaStream | null> => {
    return new Promise((resolve) => {
      setShowExplainer(true);
      setResolver(() => async (allowed: boolean) => {
        setShowExplainer(false);
        if (!allowed) { 
          resolve(null); 
          return; 
        }
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
          setStream(s);
          resolve(s);
        } catch (err) {
          console.error('[Permission] Camera access denied or failed', err);
          resolve(null);
        }
      });
    });
  },[]);

  const explainerProps = {
    icon: '📷',
    title: 'Izin Kamera Dibutuhkan',
    reason: 'Untuk memindai barcode produk saat stok masuk dan checkout. Kamera hanya aktif selama scanning berlangsung.',
    onAllow: () => resolver?.(true),
    onDeny: () => resolver?.(false),
  };

  return { requestCamera, stream, showExplainer, explainerProps };
}
