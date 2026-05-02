import { useState } from 'react';
import { useCheckoutStore } from '../store/useCheckoutStore';
import { useCartStore } from '../store/useCartStore';
import { X, Loader2, AlertTriangle, Tag } from 'lucide-react';
import { CustomerSelector } from '../../../shared/components/CustomerSelector';
import { ManagerAuthDialog } from '../../../shared/components/ManagerAuthDialog';
import { Decimal } from 'decimal.js';
import { MathUtils } from '../../../shared/utils/decimalUtils';

export function CheckoutModal() {
  const {
    isCheckoutModalOpen,
    paymentMethod,
    cashReceived,
    customer,
    pointsToRedeem,
    isLoading,
    checkoutError,
    setPaymentMethod,
    setCashReceived,
    setCustomer,
    setPointsToRedeem,
    setCheckoutError,
    closeCheckoutModal,
    finalizeTransaction,
    setAuthorizedBy,
    authorizedBy
  } = useCheckoutStore();

  const { totalPrice, updateQuantity, cartItems, manualDiscountAmount, manualDiscountNote, setManualDiscount } = useCartStore();

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authAction, setAuthAction] = useState<'DISCOUNT' | 'ZERO_CHECKOUT'>('DISCOUNT');

  if (!isCheckoutModalOpen) return null;

  const loyaltyDiscountAmount = MathUtils.mul((pointsToRedeem || 0), 100); // Rp 100 per point
  const finalTotal = MathUtils.roundInt(
    Math.max(0, MathUtils.sub(MathUtils.sub(totalPrice, loyaltyDiscountAmount), manualDiscountAmount))
  );
  const change = MathUtils.sub(cashReceived, finalTotal);

  const handleAdjustQuantity = () => {
    if (checkoutError?.stockId && checkoutError.availableQuantity !== undefined) {
      updateQuantity(checkoutError.stockId, checkoutError.availableQuantity);
      setCheckoutError(null);
    }
  };

  const handleApplyDiscount = () => {
    const amount = new Decimal(discountInput.replace(/\D/g, '') || '0').toNumber();
    if (amount <= 0) return;

    // Phase 1.6: Financial Guard - Check if discount > 30% or > 50k
    const subTotal = cartItems.reduce((sum, item) => MathUtils.add(sum, MathUtils.mul(item.price, item.quantity)), 0);
    const thresholdAmount = 50000;
    const thresholdPercentage = 0.3;
    
    if (amount > thresholdAmount || (amount / subTotal) > thresholdPercentage) {
      setAuthAction('DISCOUNT');
      setIsAuthDialogOpen(true);
    } else {
      applyDiscount(amount, discountNote);
    }
  };

  const applyDiscount = (amount: number, note: string) => {
    setManualDiscount(amount, note);
    setIsDiscountModalOpen(false);
    setDiscountInput('');
    setDiscountNote('');
  };

  const handleAuthSuccess = (authorizerId: string) => {
    if (authAction === 'DISCOUNT') {
      const amount = new Decimal(discountInput.replace(/\D/g, '') || '0').toNumber();
      applyDiscount(amount, discountNote);
      setAuthorizedBy(authorizerId);
    } else if (authAction === 'ZERO_CHECKOUT') {
      setAuthorizedBy(authorizerId);
      // We don't call finalizeTransaction here immediately to let user confirm with visible authorizer info
    }
    setIsAuthDialogOpen(false);
  };

  const handleRemoveDiscount = () => {
    setManualDiscount(0, '');
    setAuthorizedBy(null);
  };

  const onConfirmCheckout = () => {
    // Check for Rp 0 physical item giveaway
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasPhysicalItem = cartItems.some(item => !(item as any).isCustomItem);
    if (finalTotal <= 0 && hasPhysicalItem && !authorizedBy) {
      setAuthAction('ZERO_CHECKOUT');
      setIsAuthDialogOpen(true);
      return;
    }
    
    finalizeTransaction();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center sm:items-center bg-stone-900/40 backdrop-blur-sm sm:p-4 transition-opacity" onClick={(e) => {
      // Prevent closing when clicking outside if loading
      if (e.target === e.currentTarget && !isLoading) {
        closeCheckoutModal();
      }
    }}>
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl flex flex-col animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
        <div className="p-4 sm:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50 sm:rounded-t-3xl shrink-0 pt-safe">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-900">Pembayaran</h2>
          <button 
            onClick={closeCheckoutModal} 
            disabled={isLoading}
            className={`p-2 sm:p-3 text-stone-400 hover:text-stone-600 rounded-full transition-colors ${isLoading ? 'pointer-events-none opacity-50' : 'hover:bg-stone-200 active:scale-95'}`}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 sm:p-8 flex-1 space-y-6 sm:space-y-8 overflow-y-auto">
          {checkoutError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-top-2">
              <div className="flex gap-3">
                <div className="text-red-500 mt-0.5">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-red-800 text-sm">Stok Tidak Mencukupi</h3>
                  <p className="text-red-600 text-xs mt-1 leading-relaxed">
                    {checkoutError.message}
                  </p>
                </div>
              </div>
              {checkoutError.stockId && checkoutError.availableQuantity !== undefined && (
                <button
                  onClick={handleAdjustQuantity}
                  className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Sesuaikan Kuantitas menjadi {checkoutError.availableQuantity}
                </button>
              )}
            </div>
          )}

          <div className="text-center">
            <div className="text-stone-500 mb-1 text-sm sm:text-base">Total Tagihan</div>
            <div className="text-4xl sm:text-5xl font-bold text-brand-900 tracking-tight font-mono">
              Rp {totalPrice.toLocaleString('id-ID')}
            </div>
            {manualDiscountAmount > 0 && (
              <div className="mt-2 text-emerald-600 font-bold flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm uppercase tracking-wider">Diskon Manual:</span>
                  <span className="text-base sm:text-lg font-mono">- Rp {manualDiscountAmount.toLocaleString('id-ID')}</span>
                </div>
                {authorizedBy && (
                  <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full text-emerald-700">
                    Otorisasi: {authorizedBy}
                  </span>
                )}
              </div>
            )}
            {loyaltyDiscountAmount > 0 && (
              <div className="mt-2 text-emerald-600 font-bold flex items-center justify-center gap-2">
                <span className="text-xs sm:text-sm uppercase tracking-wider">Diskon Loyalitas:</span>
                <span className="text-base sm:text-lg font-mono">- Rp {loyaltyDiscountAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            {(loyaltyDiscountAmount > 0 || manualDiscountAmount > 0) && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <div className="text-stone-500 text-xs sm:text-sm uppercase tracking-widest font-bold">Total Akhir</div>
                <div className="text-3xl sm:text-4xl font-black text-brand-900 font-mono flex items-center justify-center gap-2">
                  Rp {finalTotal.toLocaleString('id-ID')}
                  {finalTotal === 0 && authorizedBy && (
                    <Tag size={20} className="text-emerald-500" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Manual Discount Section */}
          <div className="space-y-3">
            {manualDiscountAmount > 0 ? (
              <div className="flex justify-between items-start bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <div>
                  <span className="text-emerald-700 text-sm font-bold flex items-center gap-1">
                    <Tag size={14} /> Diskon Manual
                  </span>
                  {manualDiscountNote && <span className="text-xs text-emerald-600 block mt-0.5">{manualDiscountNote}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700 font-mono">- Rp {manualDiscountAmount.toLocaleString('id-ID')}</span>
                  <button onClick={handleRemoveDiscount} className="text-emerald-400 hover:text-emerald-600 p-2 active:scale-95">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsDiscountModalOpen(true)}
                className="w-full py-3 sm:py-4 border border-dashed border-stone-300 rounded-2xl text-stone-500 text-sm font-bold hover:bg-stone-50 hover:text-stone-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95"
              >
                <Tag size={16} /> Tambah Diskon Manual
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-3 uppercase tracking-wider">Pelanggan (Opsional)</label>
            <CustomerSelector onSelect={setCustomer} selectedCustomer={customer} />
          </div>

          {customer && (
            <div className="bg-emerald-50 p-4 sm:p-6 rounded-2xl border border-emerald-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-widest">Poin Tersedia</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-900">{customer.loyaltyPoints} Poin</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-widest">Nilai Tukar</div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-800">1 Poin = Rp 100</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-widest">Tukarkan Poin</label>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="number"
                    min="0"
                    max={customer.loyaltyPoints}
                    value={pointsToRedeem || ''}
                    onChange={(e) => setPointsToRedeem(Math.min(Number(e.target.value), customer.loyaltyPoints))}
                    onKeyDown={handleNumberInputKeyDown}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-900 font-bold"
                    placeholder="0"
                  />
                  <button 
                    onClick={() => setPointsToRedeem(customer.loyaltyPoints)}
                    className="px-3 sm:px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors active:scale-95"
                  >
                    Semua
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-3 uppercase tracking-wider">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {(['CASH', 'QRIS', 'SPLIT'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  disabled={isLoading}
                  className={`py-4 sm:py-6 px-2 sm:px-4 rounded-xl sm:rounded-2xl text-sm sm:text-lg font-bold transition-all active:scale-95 ${
                    paymentMethod === method
                      ? 'bg-brand-900 text-gold-500 shadow-lg'
                      : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'CASH' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2 sm:mb-3 uppercase tracking-wider">Uang Diterima</label>
                <input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  onKeyDown={handleNumberInputKeyDown}
                  disabled={isLoading}
                  className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-stone-50 border-2 border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-stone-800 text-3xl sm:text-4xl font-bold font-mono"
                  placeholder="Rp 0"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => setCashReceived(finalTotal)} className="flex-1 px-3 py-3 sm:py-2 bg-stone-100 hover:bg-stone-200 rounded-xl sm:rounded-lg text-xs sm:text-sm font-bold transition-colors active:scale-95">Uang Pas</button>
                  <button type="button" onClick={() => setCashReceived(50000)} className="flex-1 px-3 py-3 sm:py-2 bg-stone-100 hover:bg-stone-200 rounded-xl sm:rounded-lg text-xs sm:text-sm font-bold transition-colors active:scale-95 font-mono">50.000</button>
                  <button type="button" onClick={() => setCashReceived(100000)} className="flex-1 px-3 py-3 sm:py-2 bg-stone-100 hover:bg-stone-200 rounded-xl sm:rounded-lg text-xs sm:text-sm font-bold transition-colors active:scale-95 font-mono">100.000</button>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 sm:p-6 rounded-2xl bg-stone-50 border border-stone-100">
                <span className="text-stone-600 font-bold text-base sm:text-lg">Kembalian</span>
                <span className={`text-2xl sm:text-4xl font-bold font-mono ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  Rp {change >= 0 ? change.toLocaleString('id-ID') : '0'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-stone-100 bg-white sm:bg-stone-50 shrink-0 pb-safe">
          <button
            onClick={onConfirmCheckout}
            disabled={isLoading || (paymentMethod === 'CASH' && cashReceived < finalTotal)}
            className="w-full flex items-center justify-center gap-3 bg-brand-900 hover:bg-brand-800 disabled:bg-stone-300 text-gold-500 font-bold text-xl sm:text-2xl py-5 sm:py-6 rounded-2xl shadow-xl transition-all active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span className="text-lg sm:text-xl">Memproses...</span>
              </>
            ) : (
              'Konfirmasi Pembayaran'
            )}
          </button>
        </div>
      </div>

      {/* Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 sm:p-4 border-b border-stone-100 flex justify-between items-center">
              <h3 className="font-bold text-base sm:text-lg text-stone-800">Tambah Diskon Manual</h3>
              <button onClick={() => setIsDiscountModalOpen(false)} className="text-stone-400 hover:text-stone-600 p-1.5 sm:p-2 active:scale-95">
                <X size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">Nominal Diskon (Rp)</label>
                <input
                  type="text"
                  value={discountInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setDiscountInput(val ? new Decimal(val).toNumber().toLocaleString('id-ID') : '');
                  }}
                  className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none font-mono text-lg sm:text-xl"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1">Alasan Diskon</label>
                <input
                  type="text"
                  value={discountNote}
                  onChange={(e) => setDiscountNote(e.target.value)}
                  className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none text-sm sm:text-base"
                  placeholder="Contoh: Diskon Karyawan"
                />
              </div>
              <div className="bg-amber-50 p-2.5 sm:p-3 rounded-xl border border-amber-100 text-amber-800 text-[10px] sm:text-xs">
                Diskon di atas Rp 50.000 atau 10% dari total memerlukan otorisasi Manajer.
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-100 flex gap-2 sm:gap-3">
              <button 
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 py-2.5 sm:py-3 bg-white border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 transition-colors active:scale-95 text-sm sm:text-base"
              >
                Batal
              </button>
              <button 
                onClick={handleApplyDiscount}
                disabled={!discountInput}
                className="flex-1 py-2.5 sm:py-3 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-colors disabled:opacity-50 active:scale-95 text-sm sm:text-base"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Auth Dialog */}
      <ManagerAuthDialog
        isOpen={isAuthDialogOpen}
        onCancel={() => setIsAuthDialogOpen(false)}
        onSuccess={handleAuthSuccess}
        actionName="Diskon Manual"
      />
    </div>
  );
}
