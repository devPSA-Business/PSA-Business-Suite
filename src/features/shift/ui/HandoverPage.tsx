import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';
import { BookOpen, Send } from 'lucide-react';
import { useToastStore } from '../../../shared/store/toastStore';
import { BackButton } from '../../../shared/components/BackButton';

const CATEGORIES = ['TITIPAN', 'KELUHAN', 'OTOMATIS SISTEM', 'LAINNYA'];

/**
 * @ai_context Halaman pencatatan operasional/serah-terima antar shift.
 */
export function HandoverPage() {
  const { addToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handovers = useLiveQuery(
    () => DIContainer.liveQueries.observeHandovers(),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await DIContainer.createHandoverUseCase.execute({
        category,
        message: message.trim(),
        user: user.name,
      });
      setMessage('');
      setCategory(CATEGORIES[0]);
      addToast('Catatan berhasil disimpan.', 'success');
    } catch (error) {
      console.error('Failed to save handover note:', error);
      addToast('Gagal menyimpan catatan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'TITIPAN':
        return 'bg-blue-100 text-blue-800';
      case 'KELUHAN':
        return 'bg-amber-100 text-amber-800';
      case 'OTOMATIS SISTEM':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-stone-200 text-stone-800';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(timestamp));
  };

  return (
    <div 
      data-component-id="HandoverPage" 
      data-error-domain="shift"
      className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6"
    >
      <BackButton />
      <div>
        <h1 className="text-3xl font-serif font-bold text-brand-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-gold-500" />
          Buku Serah Terima
        </h1>
        <p className="text-stone-500 mt-1">
          Catatan komunikasi antar shift dan laporan operasional harian.
        </p>
      </div>

      {/* Form Catatan Baru */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="text-lg font-bold text-brand-900 mb-4">Tulis Catatan Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Pesan / Catatan
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis pesan untuk shift berikutnya..."
              rows={3}
              required
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="min-h-[44px] px-6 flex items-center gap-2 bg-brand-900 text-gold-500 font-bold rounded-xl active:scale-95 transition-all shadow-md hover:bg-brand-800 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              {isSubmitting ? 'Menyimpan...' : 'Kirim Catatan'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed Catatan */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-brand-900">Timeline Catatan</h2>
        
        {!handovers ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-stone-200"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-stone-200 rounded w-24"></div>
                    <div className="h-3 bg-stone-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-4 bg-stone-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-stone-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : handovers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 border-dashed">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">Belum ada catatan serah terima.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {handovers.map((note) => (
              <div
                key={note.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 hover:border-brand-900/30 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-brand-900 font-bold border border-stone-200">
                      {note.user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-stone-800">{note.user}</p>
                      <p className="text-xs text-stone-500">{formatTime(note.timestamp)}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${getCategoryColor(
                      note.category
                    )}`}
                  >
                    {note.category}
                  </span>
                </div>
                <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">
                  {note.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
