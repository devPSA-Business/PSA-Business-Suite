import { IGoldBuybackRepository } from '@domain/repositories/IGoldBuybackRepository';
import { IGoldLiquidationRepository } from '@domain/repositories/IGoldLiquidationRepository';
import { IStockRepository } from '@domain/repositories/IStockRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { GoldBuyback } from '@domain/models/GoldBuyback';
import { GoldCalculator } from '@shared/utils/goldCalculator';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { StockCategory } from '@domain/models/StockCategory';
import { StockItem } from '@domain/models/StockItem';
import { MathUtils } from '@shared/utils/decimalUtils';

export interface BuybackRequestDTO {
  customerName: string;
  customerId?: string; // foto KTP if > 1M
  weightGram: number;
  kadar: number;
  pricePerGram: number;
  margin: number;
  buyPrice: number;
  paymentMethod: 'CASH' | 'TRANSFER';
  userId: string;
}

export class BuybackUseCase {
  constructor(
    private readonly buybackRepository: IGoldBuybackRepository,
    private readonly stockRepository: IStockRepository,
    private readonly userRepository: IUserRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: BuybackRequestDTO): Promise<string> {
    return this.unitOfWork.execute(async () => {
      // 0. RBAC Validation: Only MANAGER or ADMIN can perform Buyback
      const user = await this.userRepository.findByName(request.userId);
      if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
        throw new Error('Akses Ditolak: Hanya Manager atau Admin yang dapat melakukan transaksi Buyback (Treasury).');
      }

      // 1. Calculate Current Gold Asset for History
      const buybacks = await this.buybackRepository.findAll();
      
      const totalStoredWeight = buybacks
        .filter(b => b.status === 'stored')
        .reduce((sum, b) => MathUtils.add(sum, b.weightGram), 0);

      // 2. Create Domain Entity
      const buyback = GoldBuyback.create({
        customerName: request.customerName,
        customerId: request.customerId,
        weightGram: request.weightGram,
        kadar: request.kadar,
        pricePerGram: request.pricePerGram,
        margin: request.margin,
        buybackPrice: request.buyPrice,
        paymentMethod: request.paymentMethod,
        cashSource: 'gold_cash',
        status: 'stored',
        userId: request.userId,
      });

      // 3. Persist Entity
      await this.buybackRepository.save(buyback);

      // 4. Register Gold Asset History DIBATALKAN KARENA MENYESUAIKAN ALUR BARU
      // Tidak lagi butuh hitung PGE manual karena ada tabel tersimpan.
      await this.unitOfWork.registerGoldAssetHistory({
        action: 'BUYBACK',
        weightChange: request.weightGram,
        newTotalWeight: MathUtils.add(totalStoredWeight, request.weightGram),
        user: request.userId,
        details: `Buyback emas dari ${request.customerName}. Berat: ${request.weightGram}g, Kadar: ${request.kadar}`
      });

      // 5. Add to Stock as BUYBACK_GOLD
      const buybackStock = StockItem.create({
        name: `Emas Buyback - ${request.customerName}`,
        category: StockCategory.BUYBACK_GOLD,
        price: MathUtils.roundInt(MathUtils.mul(request.buyPrice, 1.1)), // Markup default preview, walau tidak dipajang.
        cost: request.buyPrice,
        quantity: 1,
        barcode: `BB-${buyback.id.slice(0, 8)}`,
        weight: request.weightGram,
        karat: request.kadar,
      });

      await this.stockRepository.save(buybackStock);

      // 6. Register Audit Log
      await this.unitOfWork.registerAudit(
        'GOLD_BUYBACK',
        request.userId,
        `Buyback emas dari ${request.customerName}. Berat: ${request.weightGram}g. Harga: Rp ${request.buyPrice.toLocaleString('id-ID')}`,
        {
          userId: request.userId,
          role: user.role,
          entityId: buyback.id,
          payloadDiff: JSON.stringify({
            weightGram: request.weightGram,
            kadar: request.kadar,
            pricePerGram: request.pricePerGram,
            margin: request.margin,
            buybackPrice: request.buyPrice,
            paymentMethod: request.paymentMethod,
            cashSource: 'gold_cash'
          })
        }
      );

      // Update shift_totals - DIBATALKAN: SOP Mutlak "Pisahkan Kas Toko vs Kas Emas"
      // Uang beli emas tidak boleh memotong saldo shift kasir.
      /* 
      const openShift = await db.shifts.where('status').equals('OPEN').first();
      if (openShift) {
        ...
      }
      */

      // 7. Register Sync Event
      await this.unitOfWork.registerSync('gold_buyback', 'INSERT', {
        id: buyback.id,
        date: buyback.createdAt,
        customerName: buyback.customerName,
        customerId: buyback.customerId,
        weightGram: buyback.weightGram,
        kadar: buyback.kadar,
        pricePerGram: buyback.pricePerGram,
        margin: buyback.margin,
        buybackPrice: buyback.buybackPrice,
        paymentMethod: buyback.paymentMethod,
        cashSource: buyback.cashSource,
        status: buyback.status,
        user: buyback.userId,
      });

      return buyback.id;
    }, ['gold_buyback', 'shift_totals', 'gold_asset_history']);
  }
}
