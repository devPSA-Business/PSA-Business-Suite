import { IRetailRepository } from '@domain/repositories/IRetailRepository';
import { IStockRepository } from '@domain/repositories/IStockRepository';
import { IShiftRepository } from '@domain/repositories/IShiftRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { LoyaltyUseCase } from './LoyaltyUseCase';
import { RetailTransaction, RetailTransactionItem } from '@domain/models/RetailTransaction';
import { StockItem } from '@domain/models/StockItem';
import { VersionConflictError, InsufficientStockError } from '@domain/errors';
import { metrics } from '../../../lib/metrics';
import { logger } from '../../../lib/logger';
import { MathUtils } from '@shared/utils/decimalUtils';
import { withLock } from '../../../shared/utils/transactionMutex';

/**
 * ============================================================================
 * 🛑 AI EMERGENCY STOP & AUDIT PROTOCOL
 * ============================================================================
 * @security_tier HIGH (CRITICAL BUSINESS LOGIC)
 * STOP! JIKA ANDA (AI MODEL) MENGAKSES FILE INI UNTUK DIEDIT, ANDA WAJIB MEMBACA 
 * `/AI_TRACK_RECORD.md` TERLEBIH DAHULU. 
 * Aturan Mutlak:
 * 1. Jangan sebar data Harga Modal (HPP/Cost/specificCost) ke Frontend Kasir.
 * 2. Selalu bungkus kalkulasi laba/rugi dengan Math.round().
 * 3. HPP dihitung via Moving Average atau Specific Identification.
 * ============================================================================
 */

export interface CheckoutRequestDTO {
  total: number;
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' | 'SPLIT';
  items: RetailTransactionItem[];
  userId: string;
  userRole?: string; 
  sessionId?: string;
  customerId?: string;
  pointsToRedeem?: number;
  manualDiscountAmount?: number;
  loyaltyDiscountAmount?: number;
  manualDiscountNote?: string;
  authorizedBy?: string; // Phase 1.6: Added for accountability
}

/**
 * @ai_context Sistem orkestrasi utama untuk memproses pembayaran kasir.
 * @security_tier HIGH
 * @business_rule LOGIKA KEUANGAN:
 * 1. Setiap hitungan final total, grossProfit, diskon harus di wrap Math.round()
 * 2. Stok tidak boleh menjadi negatif (InsufficientStockError).
 * 3. HPP yang menjadi modal kalkulasi laba-rugi wajib diamankan sebelum record ke db/audit_log.
 * 4. ANTI-ZERO: Transaksi Rp 0 atau diskon > 30% wajib diotorisasi ADMIN.
 */
export class CheckoutUseCase {
  constructor(
    private readonly retailRepository: IRetailRepository,
    private readonly stockRepository: IStockRepository,
    private readonly shiftRepository: IShiftRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly loyaltyUseCase: LoyaltyUseCase
  ) {}

  async execute(request: CheckoutRequestDTO): Promise<string> {
    const lockKey = `checkout:${request.userId}`;
    return withLock(lockKey, async () => {
      return metrics.measure('psa_checkout_operation', async () => {
      // Rule 0: Empty cart validation
      if (!request.items || request.items.length === 0) {
        throw new Error('Tidak dapat memproses transaksi: Keranjang belanja kosong.');
      }

      // Phase 1.6: Financial Guard (Anti-Zero & High Discount Check)
      const subTotal = request.items.reduce((sum, item) => MathUtils.add(sum, MathUtils.mul(item.price, item.quantity)), 0);
      const totalDiscount = MathUtils.add((request.manualDiscountAmount || 0), (request.loyaltyDiscountAmount || 0));
      const discountPercentage = subTotal > 0 ? MathUtils.div(totalDiscount, subTotal) : 0;

      // Rule 1: High Discount (> 30%) requires authorization
      if (discountPercentage > 0.3 && !request.authorizedBy && request.userRole !== 'ADMIN') {
        throw new Error(`Diskon terlalu besar (${Math.round(discountPercentage * 100)}%). Otorisasi Manager diperlukan.`);
      }

      // Rule 2: Negative total guard
      if (request.total < 0) {
        throw new Error('Total transaksi tidak boleh bernilai negatif.');
      }

      // Rule 3: Zero transaction guarded for ALL items (physical & service)
      if (request.total === 0 && !request.authorizedBy && request.userRole !== 'ADMIN') {
        throw new Error('Transaksi Rp 0 diblokir. Otorisasi Manager atau Admin diperlukan.');
      }

      const maxRetries = 3;
      let attempt = 0;

      while (true) {
        attempt++;
        try {
          return await this.unitOfWork.execute(async () => {
            // 1. Validate Shift
          const hasOpenShift = await this.shiftRepository.hasOpenShift();
          if (!hasOpenShift) {
            throw new Error('Tidak ada shift yang terbuka. Transaksi tidak dapat dilakukan.');
          }

          let totalCost = 0;
          const processedItems: RetailTransactionItem[] = [];
          const auditLogsToRegister: string[] = [];

          // 2. Read Stock and Validate
          const stockItems: (StockItem | null)[] = [];
          for (const i of request.items) {
            if (i.isCustomItem) {
              stockItems.push(null);
            } else {
              const item = await this.stockRepository.findById(i.stockId);
              stockItems.push(item);
            }
          }
          
          let calculatedTotal = 0;
          
          for (const [idx, stockItem] of stockItems.entries()) {
            const item = request.items[idx];
            if (item.isCustomItem) {
                calculatedTotal = MathUtils.add(calculatedTotal, MathUtils.mul(item.price, item.quantity));
                continue;
            }

            if (!stockItem) {
              throw new Error(`Produk dengan ID ${item.stockId} tidak ditemukan di database.`);
            }

            // F-13: Validate price against DB
            if (MathUtils.roundInt(item.price) !== MathUtils.roundInt(stockItem.price)) {
              throw new Error(`Manipulasi Harga Terdeteksi: Produk ${stockItem.name}. Harga Database: ${stockItem.price}, Harga Klien: ${item.price}`);
            }

            calculatedTotal = MathUtils.add(calculatedTotal, MathUtils.mul(stockItem.price, item.quantity));

            if (stockItem.quantity < item.quantity) {
              metrics.increment('psa_checkout_errors_total', { type: 'insufficient_stock', stockId: stockItem.id });
              throw new InsufficientStockError(
                `Stok tidak mencukupi untuk produk: ${stockItem.name}. Sisa stok: ${stockItem.quantity}, diminta: ${item.quantity}`,
                stockItem.id,
                stockItem.quantity,
                item.quantity
              );
            }
          }

          // Validate total against calculated total
          calculatedTotal = MathUtils.roundInt(calculatedTotal);
          if (MathUtils.roundInt(request.total) !== calculatedTotal) {
              throw new Error(`Manipulasi Total Terdeteksi: Total Klien: ${request.total}, Total DB: ${calculatedTotal}`);
          }

          // 3. Attempt Conditional Updates
          for (const [idx, stockItem] of stockItems.entries()) {
            const item = request.items[idx];
            
            if (item.isCustomItem) {
              processedItems.push({
                ...item,
                unitCost: 0 // Service/Custom items usually have 0 cost for retail COGS calculation
              });
              continue;
            }

            if (!stockItem) continue; // Should not happen due to previous validation
            
            const newQuantity = stockItem.quantity - item.quantity;
            const newVersion = stockItem.version + 1;
            
            const success = await this.stockRepository.updateIfVersionMatches(stockItem.id, stockItem.version, { quantity: newQuantity });
            if (!success) {
              metrics.increment('psa_checkout_errors_total', { type: 'version_conflict', stockId: stockItem.id });
              throw new VersionConflictError('Version conflict');
            }

            // Verifikasi HPP: Prioritaskan specificCost (Emas) jika ada, jika tidak gunakan cost (Moving Average)
            const unitCost = stockItem.specificCost ?? stockItem.cost;
            const itemCost = MathUtils.mul(unitCost, item.quantity);
            totalCost = MathUtils.add(totalCost, itemCost);

            processedItems.push({
              ...item,
              unitCost
            });

            // Register sync for stock update with delta and new version
            try {
              await this.unitOfWork.registerStockHistory({
                stockId: stockItem.id,
                action: 'REMOVE',
                quantityChange: -item.quantity,
                oldCost: stockItem.cost,
                newCost: stockItem.cost,
                newQuantity: newQuantity,
                user: request.userId,
                details: `Checkout transaksi ritel.`
              });

              await this.unitOfWork.registerSync('stock', 'UPDATE_DELTA', { 
                id: stockItem.id, 
                barcode: stockItem.barcode,
                delta_field: 'quantity',
                delta_value: -item.quantity,
                version: newVersion
              });
            } catch (syncErr) {
              metrics.increment('psa_sync_failures_total', { entity: 'stock', action: 'UPDATE' });
              throw syncErr;
            }

            auditLogsToRegister.push(`Stok ${stockItem.barcode} berkurang -${item.quantity}. Sisa: ${newQuantity}.`);
          }

          // 4. Loyalty & Manual Discount Integration
          let pointsEarned = 0;
          let pointsRedeemed = 0;
          let loyaltyDiscountAmount = 0;
          let finalTotal = request.total;

          if (request.customerId) {
            const loyaltyResult = await this.loyaltyUseCase.calculateAndApplyLoyalty({
              customerId: request.customerId,
              transactionAmount: request.total,
              pointsToRedeem: request.pointsToRedeem || 0,
              userId: request.userId
            });
            pointsEarned = loyaltyResult.pointsEarned;
            pointsRedeemed = loyaltyResult.pointsRedeemed;
            loyaltyDiscountAmount = loyaltyResult.loyaltyDiscountAmount;
            finalTotal = loyaltyResult.netTotal;
          }

          // Apply manual discount
          const manualDiscountAmount = request.manualDiscountAmount || 0;
          const manualDiscountNote = request.manualDiscountNote;
          if (manualDiscountAmount > 0) {
            finalTotal = Math.max(0, MathUtils.roundInt(MathUtils.sub(finalTotal, manualDiscountAmount)));
          }

          // ANOMALY DETECTION: Flagging transaksi Rp 0 akibat diskon
          let isFlagged = false;
          let flagReason = undefined;
          if (finalTotal === 0 && !request.authorizedBy && request.userRole !== 'ADMIN') {
            throw new Error('Transaksi final Rp 0 diblokir. Otorisasi Manager diperlukan.');
          }
          if (finalTotal < 0) {
            throw new Error('Transaksi final tidak boleh bernilai negatif.');
          }
          if (finalTotal === 0 && request.total > 0) {
            isFlagged = true;
            flagReason = 'ANOMALI: Transaksi Rp 0 akibat diskon manual 100%';
          }

          // 5. Create Domain Entity
          const transaction = RetailTransaction.create({
            total: finalTotal,
            paymentMethod: request.paymentMethod,
            items: processedItems,
            status: 'SUCCESS',
            userId: request.userId,
            sessionId: request.sessionId,
            customerId: request.customerId,
            pointsEarned,
            pointsRedeemed,
            loyaltyDiscountAmount,
            manualDiscountAmount,
            manualDiscountNote,
            authorizedBy: request.authorizedBy, // Record authorizer
            isFlagged, // Injeksi flag
            flagReason // Injeksi alasan
          });

          // 6. Persist Entity
          await this.retailRepository.save(transaction);

          const grossProfit = MathUtils.roundInt(MathUtils.sub(transaction.total, totalCost));

          // Update shift_totals
          const openShift = await this.shiftRepository.getOpenShift();
          if (openShift) {
            const paymentMethod = request.paymentMethod;
            const addedCash = paymentMethod === 'CASH' ? finalTotal : 0;
            await this.shiftRepository.incrementShiftSales(openShift.id, addedCash, finalTotal);
          }

          // 7. Register Audit Log
          await this.unitOfWork.registerAudit(
            'CREATE_TRANSACTION',
            request.userId,
            `Menyelesaikan transaksi ID: ${transaction.id}. Total: Rp ${transaction.total}, Modal: Rp ${totalCost}, Profit: Rp ${grossProfit}${request.authorizedBy ? ` (Diotorisasi oleh: ${request.authorizedBy})` : ''}`,
            {
              userId: request.userId,
              entityId: transaction.id,
              payloadDiff: JSON.stringify({
                total: transaction.total,
                paymentMethod: request.paymentMethod,
                manualDiscountAmount,
                manualDiscountNote,
                authorizedBy: request.authorizedBy,
                items: processedItems.map(i => ({ id: i.stockId, qty: i.quantity }))
              })
            }
          );

          if (manualDiscountAmount > 0) {
            await this.unitOfWork.registerAudit(
              'MANUAL_DISCOUNT',
              request.userId,
              `Diskon manual Rp ${manualDiscountAmount.toLocaleString('id-ID')} diberikan untuk TX-${transaction.id.substring(0, 8)}. Alasan: ${manualDiscountNote || '-'}`,
              {
                userId: request.userId,
                entityId: transaction.id,
                payloadDiff: JSON.stringify({ manualDiscountAmount, manualDiscountNote })
              }
            );
          }

          // Log pengurangan stok per item
          for (const logMsg of auditLogsToRegister) {
            await this.unitOfWork.registerAudit(
              'UPDATE_STOCK_CHECKOUT',
              request.userId,
              `Checkout TX-${transaction.id.substring(0, 8)}: ${logMsg}`
            );
          }

          // 8. Register Sync Event
          try {
            await this.unitOfWork.registerSync('transactions', 'INSERT', {
              id: transaction.id,
              date: transaction.createdAt,
              total: transaction.total,
              paymentMethod: transaction.paymentMethod,
              items: transaction.items,
              status: transaction.status,
              user: transaction.userId,
              sessionId: transaction.sessionId,
              pointsEarned: transaction.pointsEarned,
              pointsRedeemed: transaction.pointsRedeemed,
              loyaltyDiscountAmount: transaction.loyaltyDiscountAmount,
              manualDiscountAmount: transaction.manualDiscountAmount,
              manualDiscountNote: transaction.manualDiscountNote,
            });
          } catch (syncErr) {
            metrics.increment('psa_sync_failures_total', { entity: 'transactions', action: 'INSERT' });
            throw syncErr;
          }

          return transaction.id;
        }, ['shifts', 'stock', 'transactions', 'shift_totals', 'customers', 'stock_history']);
      } catch (err) {
        if (err instanceof VersionConflictError && attempt < maxRetries) {
          logger.warn('Retrying checkout due to version conflict', { attempt, maxRetries });
          // small backoff
          await new Promise(r => setTimeout(r, 50 * attempt));
          continue;
        }
        throw err;
      }
    }
      });
    });
  }
}
