import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { IRetailRepository } from '@domain/repositories/IRetailRepository';
import { IStockRepository } from '@domain/repositories/IStockRepository';
import { MathUtils } from '@shared/utils/decimalUtils';

export interface VoidTransactionDTO {
  transactionId: string;
  reason: string;
  authorizedBy: string;
}

export class VoidTransactionUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly retailRepo: IRetailRepository,
    private readonly stockRepo: IStockRepository
  ) {}

  async execute(dto: VoidTransactionDTO): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const transaction = await this.retailRepo.findById(dto.transactionId);
      if (!transaction) {
        throw new Error('Transaksi tidak ditemukan.');
      }

      if (transaction.status === 'VOIDED') {
        throw new Error('Transaksi sudah dalam status batal (VOIDED).');
      }

      // Mark as voided
      const voidedTransaction = transaction.voidTransaction(dto.reason, dto.authorizedBy);
      await this.retailRepo.save(voidedTransaction);

      // Restore stock quantities
      for (const item of transaction.items) {
        if (!item.isCustomItem) {
          const stockItem = await this.stockRepo.findById(item.stockId);
          // If stock item exists, restock it
          if (stockItem) {
            let retries = 0;
            const MAX_RETRIES = 3;
            let updated = false;

            while (retries < MAX_RETRIES && !updated) {
              const currentStock = await this.stockRepo.findById(item.stockId);
              if (!currentStock) break;

              const restoredQuantity = MathUtils.add(currentStock.quantity, item.quantity);
              
              updated = await this.stockRepo.updateIfVersionMatches(
                item.stockId,
                currentStock.version,
                { quantity: restoredQuantity }
              );

              if (!updated) {
                retries++;
                await new Promise(resolve => setTimeout(resolve, 100 * retries)); // Exponential backoff
              } else {
                // Register stock history
                await this.unitOfWork.registerStockHistory({
                  stockId: item.stockId,
                  action: 'ADJUST',
                  quantityChange: item.quantity,
                  oldCost: currentStock.cost,
                  newCost: currentStock.cost,
                  newQuantity: restoredQuantity,
                  user: dto.authorizedBy,
                  details: `Pengembalian stok dari Void Transaksi ${dto.transactionId}`
                });
              }
            }
            if (!updated) throw new Error(`Gagal mengembalikan stok untuk item ${item.stockId} setelah ${MAX_RETRIES} kali percobaan.`);
          }
        }
      }

      // Revert Shift Totals
      const dbModule = await import('@shared/api/db');
      const db = dbModule.db;
      if (transaction.sessionId) {
        const shiftTotal = await db.shift_totals.get(transaction.sessionId);
        if (shiftTotal) {
          const voidAmount = transaction.total;
          const removedCash = transaction.paymentMethod === 'CASH' ? voidAmount : 0;
          await db.shift_totals.put({
            ...shiftTotal,
            cashIn: Math.max(0, MathUtils.sub(shiftTotal.cashIn, removedCash)),
            salesTotal: Math.max(0, MathUtils.sub(shiftTotal.salesTotal, voidAmount)),
            lastUpdatedAt: Date.now()
          });
        }
      }

      // Explicitly register audit
      await this.unitOfWork.registerAudit(
        'VOID_RETAIL_TRANSACTION',
        dto.authorizedBy,
        `Voiding transaction ${dto.transactionId} over reason: ${dto.reason}`,
        { entityId: dto.transactionId }
      );

      return voidedTransaction;
    }, ['transactions', 'stock', 'stock_history', 'shift_totals']);
  }
}
