/**
 * @ai_context: UseCase buyback emas dari pelanggan pasar — emas yang dibeli disimpan sebagai aset treasury
 * @business_rule: Hanya Manager/Admin. Emas dibeli dari pelanggan TIDAK dijual ke konsumen — hanya ke pengepul.
 * @security_tier: HIGH
 */
import { IGoldBuybackRepository } from '@domain/repositories/IGoldBuybackRepository';
import { IStockRepository } from '@domain/repositories/IStockRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { GoldBuyback } from '@domain/models/GoldBuyback';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { StockCategory } from '@domain/models/StockCategory';
import { StockItem } from '@domain/models/StockItem';
import { MathUtils } from '@shared/utils/decimalUtils';
import { mapErrorToUser } from '@shared/utils/errorMapper';

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
    try {
      return await this.unitOfWork.execute(async () => {
        // 0. RBAC Validation: Only MANAGER or ADMIN can perform Buyback
        const user = await this.userRepository.findById(request.userId);
        if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
          throw new Error('Akses Ditolak: Hanya Manager atau Admin yang dapat melakukan transaksi Buyback (Treasury).');
        }

        if (request.buyPrice <= 0) {
          throw new Error('Harga buyback tidak boleh Rp 0 atau negatif.');
        }

        if (request.weightGram <= 0) {
          throw new Error('Berat emas tidak boleh 0 atau negatif.');
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

        // 4. Register Gold Asset History
        // Menyesuaikan alur baru: Tidak lagi butuh hitung PGE manual karena ada tabel tersimpan.
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
      }, ['gold_buyback', 'shift_totals', 'gold_asset_history', 'stock', 'stock_history', 'users']);
    } catch (error) {
      throw mapErrorToUser(error);
    }
  }
}
