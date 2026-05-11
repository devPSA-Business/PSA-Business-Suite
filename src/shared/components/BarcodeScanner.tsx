import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    scannerRef.current = new Html5QrcodeScanner(
      'barcode-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        // We don't automatically stop here to allow multiple scans if needed, 
        // but the parent usually closes it.
      },
      (_error) => {
        // Suppress errors during scanning to avoid console noise
        // console.warn('QR Code scan error:', error);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          console.error('Failed to clear scanner:', err);
        });
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative border-4 border-white">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-stone-100 text-stone-600 rounded-full hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 shadow-md"
        >
          <X size={20} />
        </button>
        
        <div className="p-8 pb-4">
          <h2 className="text-xl font-serif font-bold text-brand-900 text-center">Scan Barcode / QR</h2>
          <p className="text-stone-500 text-center text-sm mt-1">Posisikan kode di dalam kotak</p>
        </div>

        <div id="barcode-reader" className="w-full aspect-square bg-stone-100 overflow-hidden" />
        
        <div className="p-6 bg-stone-50 text-center">
          <p className="text-xs text-stone-400 font-medium tracking-wider uppercase">Html5-QRCode Scanner Utility</p>
        </div>
      </div>
    </div>
  );
};
