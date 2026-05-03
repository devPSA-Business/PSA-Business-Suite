import { IGoldBuybackRepository } from '@domain/repositories/IGoldBuybackRepository';
import { IShiftRepository } from '@domain/repositories/IShiftRepository';
import { IInternalNoteRepository } from '@domain/repositories/IInternalNoteRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { generateId } from '../../../lib/generateId';
import { MathUtils } from '@shared/utils/decimalUtils';

export interface GoldLiquidationRequestDTO {
  buybackIds: string[];
  totalSoldPrice: number; // Total harga laku semua perhiasan ke pengepul
  paymentMethod: 'CASH' | 'TRANSFER';
  userId: string;
}

/**
 * Use Case: Gold Asset Liquidation (Treasury)
 * Mencatat penjualan aset emas terstruktur (dari buyback) ke pihak ketiga (pengepul).
 */
export class GoldLiquidationUseCase {
  constructor(
    private readonly goldBuybackRepository: IGoldBuybackRepository,
    private readonly shiftRepository: IShiftRepository,
    private readonly internalNoteRepository: IInternalNoteRepository,
    private readonly userRepository: IUserRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: GoldLiquidationRequestDTO): Promise<string> {
    return this.unitOfWork.execute(async () => {
      // 0. RBAC Validation: Only MANAGER or ADMIN can perform Asset Liquidation
      const user = await this.userRepository.findByName(request.userId);
      if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
        throw new Error('Akses Ditolak: Hanya Manager atau Admin yang dapat melakukan Likuidasi Aset (Treasury).');
      }

      // 1. Validate Shift
      const hasOpenShift = await this.shiftRepository.hasOpenShift();
      if (!hasOpenShift) {
        throw new Error('Tidak ada shift yang terbuka. Mutasi aset tidak dapat dilakukan.');
      }

      if (request.buybackIds.length === 0) {
        throw new Error('Gagal: Pilih setidaknya 1 aset emas untuk dilikuidasi.');
      }

      // 2. Fetch all requested buybacks
      let totalHPP = 0;
      let totalWeight = 0;
      
      const buybacksToSell = [];
      const timestamp = Date.now();

      for (const id of request.buybackIds) {
        const item = await this.goldBuybackRepository.findById(id);
        if (!item) throw new Error(`Barang dengan ID ${id} tidak ditemukan.`);
        if (item.status !== 'stored') throw new Error(`Barang ${item.customerName} sudah tidak di brankas.`);
        
        buybacksToSell.push(item);
        totalHPP = MathUtils.add(totalHPP, item.buybackPrice);
        totalWeight = MathUtils.add(totalWeight, item.weightGram);
      }

      // 3. Pro-rata the sold price based on weight
      let remainingSoldPrice = request.totalSoldPrice;
      const soldDate = new Date().toISOString();
      
      for (let i = 0; i < buybacksToSell.length; i++) {
        const item = buybacksToSell[i];
        let allocatedPrice = 0;
        
        if (i === buybacksToSell.length - 1) {
          allocatedPrice = remainingSoldPrice;
        } else {
          allocatedPrice = MathUtils.roundInt(
            MathUtils.mul(MathUtils.div(item.weightGram, totalWeight), request.totalSoldPrice)
          );
          remainingSoldPrice = MathUtils.sub(remainingSoldPrice, allocatedPrice);
        }

        item.markAsSoldToCollector(soldDate, allocatedPrice, request.paymentMethod, item.notes);
        await this.goldBuybackRepository.save(item);
      }

      // 4. Audit Trail & Sync
      await this.unitOfWork.registerAudit(
        'GOLD_ASSET_LIQUIDATION',
        request.userId,
        `Likuidasi ${buybacksToSell.length} aset emas ke pengepul. Berat Total: ${totalWeight.toFixed(2)}g, Total HPP: Rp ${totalHPP.toLocaleString('id-ID')}, Dijual: Rp ${request.totalSoldPrice.toLocaleString('id-ID')}`,
        {
          userId: request.userId,
          role: user.role,
          entityId: 'BATCH_' + timestamp,
          payloadDiff: JSON.stringify({
            buybackIds: request.buybackIds,
            totalSoldPrice: request.totalSoldPrice,
            paymentMethod: request.paymentMethod
          })
        }
      );

      // Register multiple sync events (one per item updated)
      for (const item of buybacksToSell) {
        await this.unitOfWork.registerSync('gold_buyback', 'UPDATE', {
          id: item.id,
          status: item.status,
          soldDate: item.soldDate,
          soldPrice: item.soldPrice,
          profitLoss: item.profitLoss
        });
      }

      // 5. Warning System if profit is negative? 
      if (request.totalSoldPrice < totalHPP) {
        await this.internalNoteRepository.save({
           id: generateId(),
           date: Date.now(),
           category: 'LAPORAN',
           message: `PERINGATAN: Likuidasi BATCH_${timestamp} mengalami kerugian. HPP: Rp ${totalHPP.toLocaleString('id-ID')}, Laku: Rp ${request.totalSoldPrice.toLocaleString('id-ID')}`,
           user: request.userId
        });
      }

      return 'SUCCESS';
    }, ['gold_buyback', 'shift_totals', 'gold_asset_history', 'internal_notes', 'audit_logs']);
  }
}


