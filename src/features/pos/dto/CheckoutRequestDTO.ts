/**
 * DTO untuk Checkout Request ke CheckoutUseCase
 * @see src/features/pos/usecases/CheckoutUseCase.ts
 */

import { RetailTransactionItem } from '@domain/models/RetailTransaction';

export interface CheckoutRequestDTO {
  /**
   * Subtotal SEBELUM diskon (harga × qty untuk semua items)
   * Digunakan untuk validasi anti-tampering harga.
   * @precision Harus dihitung via MathUtils.add + MathUtils.mul
   */
  subtotal: number;

  /**
   * Total SETELAH diskon (subtotal - loyaltyDiscount - manualDiscount)
   * Ini final amount yang akan dibayar pelanggan.
   * @precision MathUtils.roundInt() wajib
   */
  total: number;

  /**
   * Metode pembayaran: CASH | QRIS | TRANSFER | SPLIT
   */
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' | 'SPLIT';

  /**
   * Daftar item yang dipilih customer
   */
  items: RetailTransactionItem[];

  /**
   * User ID yang melakukan checkout
   */
  userId: string;

  /**
   * Role user (opsional, untuk bypass check tertentu)
   */
  userRole?: string;

  /**
   * Session ID untuk tracking
   */
  sessionId?: string;

  /**
   * Customer ID untuk loyalty tracking
   */
  customerId?: string;

  /**
   * Jumlah poin loyalty yang di-redeem customer
   */
  pointsToRedeem?: number;

  /**
   * Diskon manual yang diberikan oleh kasir (Rp)
   * Setiap diskon > 30% wajib diotorisasi Manager/Admin
   * @precision MathUtils.roundInt()
   */
  manualDiscountAmount?: number;

  /**
   * Alasan pemberian diskon manual (untuk audit trail)
   */
  manualDiscountNote?: string;

  /**
   * Diskon loyalty yang dihitung otomatis dari poin redeem
   * @precision MathUtils.roundInt()
   */
  loyaltyDiscountAmount?: number;

  /**
   * User ID / nama yang mengotorisasi diskon besar (>30%)
   * Hanya isi jika diskon > 30% atau total = 0
   */
  authorizedBy?: string;

  /**
   * @resolved BUG-02: Porsi tunai untuk metode SPLIT payment (cashPortion field — fully persisted di db.ts, RetailTransaction, RetailRepositoryImpl, CheckoutUseCase)
   * Contoh: total 100k, SPLIT → 60k CASH + 40k QRIS
   * cashPortion = 60000
   * Opsional, default = 0 jika bukan SPLIT
   * @precision MathUtils.roundInt()
   */
  cashPortion?: number;
}
