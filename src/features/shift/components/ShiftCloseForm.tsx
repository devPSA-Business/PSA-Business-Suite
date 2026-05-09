import { logger } from '@lib/logger';
import { useState, useEffect, useCallback } from 'react';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';
import { Lock, AlertCircle, CheckCircle, FileText, ShieldCheck } from 'lucide-react';
import { UI_REGISTRY } from '../../../shared/constants/ui_registry';
import { useToastStore } from '../../../shared/store/toastStore';
import { TransactionHistoryModal } from '../../pos/components/TransactionHistoryModal';
import { useSecurityStore } from '../../../shared/store/useSecurityStore';
import { ConfirmActionDialog } from '../../../shared/components/ConfirmActionDialog';
import { CustomNumpad } from '../../pos/components/CustomNumpad';
import { ERROR_MESSAGES } from '../../../shared/constants/errorMessages';
import { mapErrorToUser } from '../../../shared/utils/errorMapper';

import { Decimal } from 'decimal.js';

const DISCREPANCY_THRESHOLD = 50000;

export function ShiftCloseForm({ shiftId, onShiftClosed }: { shiftId: string, onShiftClosed: () => void }) {
  const { addToast } = useToastStore();
  const [endCash, setEndCash] = useState<string>('');
  const [expectedCash, setExpectedCash] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const user = useAuthStore(state => state.user);
  const { isPinVerified, verifyAdminPin } = useSecurityStore();

  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  useEffect(() => {
    const fetchExpected = async () => {
      try {
        const expected = await DIContainer.shiftRepository.calculateExpectedCash(shiftId);
        setExpectedCash(expected);
      } catch (error) {
        logger.error(error);
      }
    };
    fetchExpected();
  }, [shiftId]);

  const actualCash = new Decimal(endCash.replace(/[^0-9]/g, '') || '0').toNumber();
  const discrepancy = expectedCash !== null ? actualCash - expectedCash : 0;
  const needsAuthorization = Math.abs(discrepancy) > DISCREPANCY_THRESHOLD;

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const executeSubmit = useCallback(async () => {
    
    if (!user) {
      addToast('Anda harus login terlebih dahulu.', 'error');
      return;
    }

    const cashAmount = new Decimal(endCash.replace(/[^0-9]/g, '') || '0').toNumber();
    if (cashAmount < 0) {
      addToast('Masukkan jumlah saldo akhir yang valid.', 'error');
      return;
    }

    // Check for authorization if discrepancy is high
    if (needsAuthorization && !isPinVerified) {
      setIsConfirmOpen(false);
      setShowPinModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      await DIContainer.closeShiftUseCase.execute({
        shiftId,
        endCash: cashAmount,
        userId: user.name
      });
      addToast('Shift berhasil ditutup.', 'success');
      onShiftClosed();
    } catch (error) {
      const mapped = mapErrorToUser(error);
      addToast(`Gagal menutup shift: ${mapped.userMessage}`, 'error');
    } finally {
      setIsProcessing(false);
      setIsConfirmOpen(false);
    }
  }, [user, endCash, needsAuthorization, isPinVerified, addToast, shiftId, onShiftClosed]);

  const handlePreSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      addToast('Anda harus login terlebih dahulu.', 'error');
      return;
    }
    const cashAmount = new Decimal(endCash.replace(/[^0-9]/g, '') || '0').toNumber();
    if (cashAmount < 0) {
      addToast('Masukkan jumlah saldo akhir yang valid.', 'error');
      return;
    }
    setIsConfirmOpen(true);
  }, [user, endCash, addToast]);

  const handlePinSubmit = useCallback(async () => {
    if (pinInput.length === 6) {
      const isValid = await verifyAdminPin(pinInput);
      if (isValid) {
        setShowPinModal(false);
        setPinInput('');
        executeSubmit(); // Retry submission
      } else {
        setPinError(true);
        setTimeout(() => {
          setPinInput('');
          setPinError(false);
        }, 500);
      }
    }
  }, [pinInput, verifyAdminPin, executeSubmit]);

  useEffect(() => {
    if (pinInput.length === 6) {
      handlePinSubmit();
    }
  }, [pinInput, handlePinSubmit]);

  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^,\d]/g, '').toString();
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    return rupiah;
  };

  return (
    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-stone-200 shadow-xl shadow-stone-200/50 max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mb-6">
        <Lock size={32} />
      </div>
      <h2 className="text-3xl font-serif font-bold text-brand-900 mb-3">Tutup Shift Kasir</h2>
      <p className="text-stone-500 text-lg mb-6 leading-relaxed">Hitung uang fisik di laci kasir dan masukkan jumlahnya untuk verifikasi.</p>

      <button 
        type="button"
        onClick={() => setIsHistoryModalOpen(true)}
        className="w-full mb-8 flex items-center justify-center gap-2 py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors border border-stone-200"
      >
        <FileText size={20} />
        {UI_REGISTRY.ACTIONS.REVIEW.label}
      </button>

      {/* HANYA TAMPIL JIKA MANAGER/ADMIN */}
      {isManagerOrAdmin && expectedCash !== null && (
        <div className="mb-8 p-6 bg-stone-50 rounded-3xl border border-stone-100 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-stone-500 font-medium">Sistem (Expected)</span>
            <span className="text-xl font-bold text-stone-800">Rp {expectedCash.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-stone-200/50">
            <span className="text-stone-500 font-medium">Selisih Kas</span>
            <span className={`text-2xl font-black ${discrepancy === 0 ? 'text-green-600' : discrepancy > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {discrepancy > 0 ? '+' : ''} Rp {discrepancy.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handlePreSubmit} className="space-y-8">
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Saldo Fisik Aktual (Cash Counted)</label>
          <div className="relative group">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 text-2xl font-bold group-focus-within:text-brand-900 transition-colors">Rp</span>
            <input
              type="text"
              required
              value={endCash}
              onChange={(e) => setEndCash(formatRupiah(e.target.value))}
              className="w-full pl-16 pr-6 py-6 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-brand-900 text-4xl font-black tracking-tight"
              placeholder="0"
            />
          </div>
        </div>

        {/* HANYA TAMPIL JIKA MANAGER/ADMIN */}
        {endCash && discrepancy !== 0 && isManagerOrAdmin && (
          <div className={`p-4 rounded-2xl text-sm flex items-start gap-3 animate-in fade-in zoom-in-95 ${discrepancy < 0 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p>Terdapat selisih kas sebesar <strong>Rp {Math.abs(discrepancy).toLocaleString('id-ID')}</strong>.</p>
              {needsAuthorization && (
                <p className="mt-1 font-bold text-red-800 flex items-center gap-1">
                  <ShieldCheck size={16} />
                  Memerlukan Otorisasi Manager (PIN)
                </p>
              )}
            </div>
          </div>
        )}

        {endCash && discrepancy === 0 && (
          <div className="p-4 rounded-2xl text-sm flex items-start gap-3 bg-green-50 text-green-700 border border-green-100 animate-in fade-in zoom-in-95">
            <CheckCircle size={20} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">Saldo fisik sesuai dengan sistem. Laporan kasir akan dicatat sebagai seimbang.</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || expectedCash === null}
          className="w-full flex items-center justify-center gap-3 min-h-[72px] bg-brand-900 hover:bg-brand-800 text-gold-500 font-black text-xl rounded-2xl shadow-lg shadow-brand-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
        >
          {isProcessing ? 'Memproses...' : UI_REGISTRY.ACTIONS.CLOSE_SHIFT.label}
        </button>
      </form>

      {/* PIN Authorization Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border-2 transition-colors ${pinError ? 'border-red-500' : 'border-transparent'}`}>
            <div className="p-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-brand-900" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-brand-900 mb-2 text-center">Otorisasi Manager</h2>
              <p className="text-stone-500 text-center mb-8">
                {isManagerOrAdmin 
                  ? `Selisih kas tinggi (Rp ${Math.abs(discrepancy).toLocaleString('id-ID')}). Masukkan Master PIN untuk menyetujui penutupan shift.`
                  : `Terdapat selisih kas. Memerlukan otorisasi Manager untuk menutup shift.`}
              </p>

              <div className="flex gap-3 mb-8">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pinInput.length ? 'bg-brand-900 scale-110' : 'bg-stone-200'} ${pinError ? 'bg-red-500' : ''}`}
                  />
                ))}
              </div>

              {pinError && <p className="text-red-500 text-sm font-medium mb-4">{ERROR_MESSAGES.PIN_INVALID}</p>}

              <div className="w-full mb-6">
                <CustomNumpad 
                  onPress={(val) => pinInput.length < 6 && setPinInput(p => p + val)} 
                  onDelete={() => setPinInput(p => p.slice(0, -1))} 
                />
              </div>

              <button
                onClick={() => setShowPinModal(false)}
                className="text-stone-500 hover:text-brand-900 transition-colors font-medium"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
      
      <ConfirmActionDialog
        isOpen={isConfirmOpen}
        title="Tutup Shift Kasir"
        description={`Apakah Anda yakin uang fisik sudah dihitung dengan benar sejumlah Rp ${actualCash.toLocaleString('id-ID')}? Operasi ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Tutup Shift"
        confirmWord="TUTUP"
        dangerLevel="warn"
        onConfirm={executeSubmit}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
