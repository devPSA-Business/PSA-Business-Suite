import { logger } from '@lib/logger';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, AlertTriangle, CheckCircle, Clock, Printer } from 'lucide-react';
import { DIContainer } from '../../../infrastructure/di/Container';
import { useToastStore } from '../../../shared/store/toastStore';
import { ManagerAuthDialog } from '../../../shared/components/ManagerAuthDialog';
import { RetailTransaction, RetailTransactionItem } from '../../../domain/models/RetailTransaction';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { useAuthStore } from '../../../shared/store/authStore';
import { useLiveQuery } from 'dexie-react-hooks';

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrx, setSelectedTrx] = useState<RetailTransaction | null>(null);
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const user = useAuthStore(state => state.user);

  const transactions = useLiveQuery(
    () => DIContainer.retailRepository.findAll(user?.branchId),
    [user?.branchId]
  );

  const filteredTransactions = (transactions || []).filter(trx => 
    trx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trx.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 10); // Show last 10

  const handleFlagSubmit = async () => {
    if (!selectedTrx) return;
    try {
      await DIContainer.flagTransactionUseCase.execute({
        transactionId: selectedTrx.id,
        reason: flagReason,
        userId: user?.name || 'System'
      });
      setIsFlagging(false);
      setFlagReason('');
      useToastStore.getState().addToast('Transaksi berhasil ditandai bermasalah', 'success');
    } catch (e) {
      useToastStore.getState().addToast(e instanceof Error ? (e instanceof Error ? e.message : String(e)) : 'Gagal menandai transaksi', 'error');
    }
  };

  const handleReprint = async () => {
    if (!selectedTrx) return;
    try {
      // Mock converting selectedTrx to Transaction format expected by PrintService
      const mockTxData = {
        id: selectedTrx.id,
        date: selectedTrx.createdAt,
        user: selectedTrx.userId || 'Kasir',
        status: selectedTrx.status || 'COMPLETED',
        items: selectedTrx.items.map((item: RetailTransactionItem) => ({ 
          stockId: item.stockId,
          name: item.name, 
          quantity: item.quantity, 
          price: item.price, 
          subtotal: item.subtotal 
        })),
        total: selectedTrx.total,
        paymentMethod: selectedTrx.paymentMethod || 'CASH'
      };
      await DIContainer.printService.print(mockTxData);
      useToastStore.getState().addToast('Mencetak ulang struk...', 'info');
    } catch (error) {
      logger.error('Reprint failed', error);
      useToastStore.getState().addToast('Gagal mencetak ulang struk', 'error');
    }
  };

  const handleRequestVoid = () => {
    setIsFlagging(false);
    setIsVoiding(true);
  };

  const executeVoid = async () => {
    setIsAuthOpen(false);
    if (!selectedTrx) return;
    try {
      await DIContainer.voidTransactionUseCase.execute({
        transactionId: selectedTrx.id,
        reason: voidReason,
        authorizedBy: user?.name || 'System'
      });
      useToastStore.getState().addToast('Transaksi dibatalkan (VOID) dan stok dikembalikan', 'success');
      setIsVoiding(false);
      setVoidReason('');
    } catch (e) {
      logger.error(e);
      useToastStore.getState().addToast(e instanceof Error ? (e instanceof Error ? e.message : String(e)) : 'Gagal membatalkan transaksi', 'error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col mt-auto sm:mt-0"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-brand-900">Riwayat Transaksi</h2>
              <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors">
                <X size={24} className="sm:w-6 sm:h-6 w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 pb-safe">
              {/* Search */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 sm:w-5 sm:h-5 w-4 h-4" size={20} />
                <input
                  type="text"
                  placeholder="Cari ID transaksi atau nama item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-brand-500 text-stone-900 text-sm sm:text-base"
                />
              </div>

              {/* Transaction List */}
              <div className="flex flex-col gap-2 sm:gap-3">
                {filteredTransactions.map((trx) => (
                  <div 
                    key={trx.id} 
                    className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedTrx?.id === trx.id ? 'border-brand-500 bg-brand-50' : 'border-stone-200 hover:border-brand-300'}`}
                    onClick={() => {
                      setSelectedTrx(trx);
                      setIsFlagging(false);
                      setIsVoiding(false);
                    }}
                  >
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <div>
                        <span className="font-bold text-stone-900 text-sm sm:text-base">{trx.id}</span>
                        <div className="text-[10px] sm:text-xs text-stone-500 flex items-center gap-1 mt-0.5 sm:mt-1">
                          <Clock size={12} className="sm:w-3 sm:h-3 w-2.5 h-2.5" /> {new Date(trx.createdAt).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-brand-900 text-sm sm:text-base">Rp {trx.total.toLocaleString('id-ID')}</div>
                        {trx.status === 'VOIDED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-red-600 bg-red-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md mt-1">
                            <AlertTriangle size={12} className="sm:w-3 sm:h-3 w-2.5 h-2.5" /> Dibatalkan
                          </span>
                        ) : trx.isFlagged ? (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 bg-amber-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md mt-1">
                            <AlertTriangle size={12} className="sm:w-3 sm:h-3 w-2.5 h-2.5" /> Bermasalah
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-green-600 bg-green-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md mt-1">
                            <CheckCircle size={12} className="sm:w-3 sm:h-3 w-2.5 h-2.5" /> Selesai
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-stone-600 truncate">
                      {trx.items.map((i: RetailTransactionItem) => i.name).join(', ')}
                    </div>
                    {trx.isFlagged && (
                      <div className="mt-2 text-[10px] sm:text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>Catatan:</strong> {trx.flagReason}
                      </div>
                    )}
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-6 sm:py-8 text-stone-500 text-sm sm:text-base">
                    Tidak ada transaksi ditemukan.
                  </div>
                )}
              </div>

              {/* Action Area for Selected Transaction */}
              <AnimatePresence>
                {selectedTrx && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-stone-200 pt-3 sm:pt-4 mt-1 sm:mt-2 shrink-0"
                  >
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button 
                        onClick={handleReprint}
                        className="flex-1 py-2.5 sm:py-3 bg-blue-100 text-blue-700 font-bold rounded-xl hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Printer size={18} className="sm:w-[18px] sm:h-[18px] w-4 h-4" /> Cetak Ulang
                      </button>
                      <button 
                        onClick={() => { setIsFlagging(true); setIsVoiding(false); }}
                        className="flex-1 py-2.5 sm:py-3 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <AlertTriangle size={18} className="sm:w-[18px] sm:h-[18px] w-4 h-4" /> Tandai Masalah
                      </button>
                      <button 
                        onClick={handleRequestVoid}
                        className="flex-1 py-2.5 sm:py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <AlertTriangle size={18} className="sm:w-[18px] sm:h-[18px] w-4 h-4" /> Batalkan (Void)
                      </button>
                    </div>

                    {/* Flagging Form */}
                    {isFlagging && (
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <label className="block text-xs sm:text-sm font-bold text-amber-900 mb-1 sm:mb-2">Deskripsi Masalah</label>
                        <textarea 
                          value={flagReason}
                          onChange={(e) => setFlagReason(e.target.value)}
                          placeholder="Jelaskan masalah pada transaksi ini..."
                          className="w-full p-2.5 sm:p-3 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white text-stone-900 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                        />
                        <div className="flex justify-end gap-2 mt-2 sm:mt-3">
                          <button onClick={() => setIsFlagging(false)} className="px-3 sm:px-4 py-1.5 sm:py-2 text-stone-600 font-bold text-sm sm:text-base">Batal</button>
                          <button 
                            onClick={handleFlagSubmit}
                            disabled={!flagReason.trim()}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-600 text-white font-bold rounded-lg disabled:opacity-50 text-sm sm:text-base"
                          >
                            Simpan Penanda
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Voiding Form */}
                    {isVoiding && (
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 rounded-xl border border-red-200">
                        <label className="block text-xs sm:text-sm font-bold text-red-900 mb-1 sm:mb-2">Alasan Pembatalan (VOID)</label>
                        <textarea 
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          placeholder="Wajib mengisi alasan pembatalan..."
                          className="w-full p-2.5 sm:p-3 rounded-lg border border-red-300 focus:ring-2 focus:ring-red-500 bg-white text-stone-900 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                        />
                        <div className="flex justify-end gap-2 mt-2 sm:mt-3">
                          <button onClick={() => setIsVoiding(false)} className="px-3 sm:px-4 py-1.5 sm:py-2 text-stone-600 font-bold text-sm sm:text-base">Batal</button>
                          <button 
                            onClick={() => {
                              setIsAuthOpen(true);
                            }}
                            disabled={!voidReason.trim()}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white font-bold rounded-lg disabled:opacity-50 text-sm sm:text-base"
                          >
                            Otorisasi Void
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
          {/* Manager Auth Gate */}
          <ManagerAuthDialog 
            isOpen={isAuthOpen}
            actionName="Pembatalan Transaksi (Void)"
            onSuccess={executeVoid}
            onCancel={() => setIsAuthOpen(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
};
