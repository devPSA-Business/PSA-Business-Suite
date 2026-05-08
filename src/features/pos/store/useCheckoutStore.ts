import { logger } from '@lib/logger';
import { VersionConflictError, InsufficientStockError } from '@domain/errors';
import { create } from 'zustand';
import { useCartStore } from './useCartStore';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { mapErrorToUser } from '../../../shared/utils/errorMapper';
import { Customer } from '../../../domain/models/Customer';

type PaymentMethod = 'CASH' | 'QRIS' | 'SPLIT';

interface CheckoutState {
  paymentMethod: PaymentMethod;
  cashReceived: number;
  customer: Customer | null;
  pointsToRedeem: number;
  authorizedBy: string | null;
  isCheckoutModalOpen: boolean;
  isLoading: boolean;
  checkoutError: InsufficientStockError | null;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashReceived: (amount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setPointsToRedeem: (points: number) => void;
  setAuthorizedBy: (name: string | null) => void;
  setCheckoutError: (error: InsufficientStockError | null) => void;
  openCheckoutModal: () => void;
  closeCheckoutModal: () => void;
  finalizeTransaction: () => Promise<void>;
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  paymentMethod: 'CASH',
  cashReceived: 0,
  customer: null,
  pointsToRedeem: 0,
  authorizedBy: null,
  isCheckoutModalOpen: false,
  isLoading: false,
  checkoutError: null,
  
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setCashReceived: (amount) => set({ cashReceived: amount }),
  setCustomer: (customer) => set({ customer, pointsToRedeem: 0 }),
  setPointsToRedeem: (points) => set({ pointsToRedeem: points }),
  setAuthorizedBy: (name) => set({ authorizedBy: name }),
  setCheckoutError: (error) => set({ checkoutError: error }),
  openCheckoutModal: () => set({ isCheckoutModalOpen: true, checkoutError: null }),
  closeCheckoutModal: () => set({ 
    isCheckoutModalOpen: false, 
    cashReceived: 0, 
    paymentMethod: 'CASH',
    customer: null,
    pointsToRedeem: 0,
    authorizedBy: null,
    isLoading: false,
    checkoutError: null
  }),

  finalizeTransaction: async () => {
    set({ isLoading: true });
    try {
      const cartState = useCartStore.getState();
      const { cartItems, totalPrice } = cartState;
      const { paymentMethod, customer, pointsToRedeem, authorizedBy } = get();
      const user = useAuthStore.getState().user;
      const openShift = await DIContainer.shiftRepository.getOpenShift();

      if (!openShift) {
        throw new Error('Tidak ada shift yang terbuka. Silakan buka shift terlebih dahulu.');
      }

      if (cartItems.length === 0) {
        throw new Error('Keranjang kosong, tidak dapat memproses transaksi.');
      }

      // Execute Clean Architecture Use Case
      const transactionId = await DIContainer.checkoutUseCase.execute({
        total: totalPrice,
        paymentMethod: paymentMethod,
        items: cartItems.map(item => ({
          stockId: item.stockId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isCustomItem: (item as any).isCustomItem
        })),
        userId: user ? user.name : 'Unknown User',
        userRole: user ? user.role : 'CASHIER',
        sessionId: openShift.id,
        customerId: customer?.id,
        pointsToRedeem: pointsToRedeem,
        manualDiscountAmount: cartState.manualDiscountAmount,
        manualDiscountNote: cartState.manualDiscountNote,
        authorizedBy: authorizedBy || undefined,
      });

      // Cetak struk
      try {
        // Fetch the saved transaction to pass to printService
        const savedTransaction = await DIContainer.retailRepository.findById(transactionId);
        if (savedTransaction) {
          // Map domain model back to legacy interface for printService
          await DIContainer.printService.print({
            id: savedTransaction.id,
            date: savedTransaction.createdAt,
            total: savedTransaction.total,
            paymentMethod: savedTransaction.paymentMethod,
            items: savedTransaction.items,
            status: savedTransaction.status,
            user: savedTransaction.userId,
            sessionId: savedTransaction.sessionId
          });
          
          if (paymentMethod === 'CASH') {
            try {
              await DIContainer.printService.triggerCashDrawer();
            } catch (drawerErr) {
              logger.error('Gagal membuka laci kasir:', drawerErr);
            }
          }
        }
      } catch (printError) {
        logger.error('Gagal mencetak struk:', printError);
        useToastStore.getState().addToast('Transaksi berhasil, namun gagal mencetak struk', 'info');
      }

      // Bersihkan keranjang dan tutup modal setelah sukses
      cartState.clearCart();
      get().closeCheckoutModal();
    } catch (error) {
      logger.error('Gagal menyelesaikan transaksi:', error);
      
      if (error instanceof InsufficientStockError) {
        get().setCheckoutError(error);
        useToastStore.getState().addToast('Stok tidak mencukupi untuk beberapa item.', 'error');
      } else {
        const mapped = mapErrorToUser(error);
        useToastStore.getState().addToast(mapped.userMessage, 'error');
        if (error instanceof VersionConflictError) {
          useCartStore.getState().clearCart();
          get().closeCheckoutModal();
        }
      }
    } finally {
      set({ isLoading: false });
    }
  }
}));
