import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: {
    totalSales: number;
    totalPettyCash: number;
    expectedCash: number;
  };
  onConfirm: (notes: string) => void;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({ isOpen, onClose, summary, onConfirm }) => {
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <h2 className="text-xl font-bold text-brand-900">Tutup Toko & Review</h2>
          <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-200 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Penjualan</p>
              <p className="text-xl font-black text-emerald-900">Rp {summary.totalSales.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Kas Keluar</p>
              <p className="text-xl font-black text-rose-900">Rp {summary.totalPettyCash.toLocaleString('id-ID')}</p>
            </div>
          </div>
          
          <div className="p-4 bg-stone-100 rounded-xl">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Estimasi Kas di Laci</p>
            <p className="text-2xl font-black text-brand-900">Rp {summary.expectedCash.toLocaleString('id-ID')}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Catatan Penutup Shift</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none h-24"
              placeholder="Tambahkan catatan jika ada selisih atau hal penting lainnya..."
            />
          </div>

          <button 
            onClick={() => onConfirm(notes)}
            className="w-full py-3.5 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            Konfirmasi Tutup Shift
          </button>
        </div>
      </div>
    </div>
  );
};
