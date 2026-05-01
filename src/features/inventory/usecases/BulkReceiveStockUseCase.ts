import { IStockRepository } from '@domain/repositories/IStockRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { StockItem } from '@domain/models/StockItem';
import { StockCategory } from '@domain/models/StockCategory';
import { UserRole } from '@domain/models/User';
import { DbService } from '@shared/api/dbService';
import { MathUtils } from '@shared/utils/decimalUtils';

export interface BulkReceiveStockItemDTO {
  barcode: string;
  name: string;
  category: StockCategory;
  price: number;
  cost: number;
  quantity: number;
  weight?: number;
  karat?: number;
}

export interface BulkReceiveStockRequestDTO {
  items: BulkReceiveStockItemDTO[];
  userId: string;
  userRole: UserRole;
}

export class BulkReceiveStockUseCase {
  constructor(
    private readonly stockRepository: IStockRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: BulkReceiveStockRequestDTO): Promise<void> {
    // RBAC: Only MANAGER and ADMIN can receive stock
    if (request.userRole === 'CASHIER') {
      throw new Error('Akses ditolak: Kasir tidak memiliki izin untuk menambah stok massal.');
    }

    return this.unitOfWork.execute(async () => {
      for (const item of request.items) {
        const existingItem = await this.stockRepository.findByBarcode(item.barcode);
        const isSpecificId = DbService.isSpecificIdentification(item.category);

        if (existingItem) {
          const newQuantity = MathUtils.add(existingItem.quantity, item.quantity);
          let newCost = existingItem.cost;
          const newSpecificCost = existingItem.specificCost;
          let isStale = false;
          let isShadowHPP = false;

          if (isSpecificId && existingItem.cost !== item.cost) {
            throw new Error(`Barcode ${item.barcode} menabrak harga modal emas yang berbeda.`);
          }

          if (!isSpecificId) {
            // Phase 1.1: Kalkulasi Shadow HPP (Moving Average Lokal) saat offline
            const totalValueOld = MathUtils.mul(existingItem.quantity, existingItem.cost);
            const totalValueNew = MathUtils.mul(item.quantity, item.cost);
            const totalCombinedValue = MathUtils.add(totalValueOld, totalValueNew);
            
            if (newQuantity > 0) {
              newCost = MathUtils.roundInt(MathUtils.div(totalCombinedValue, newQuantity));
            } else {
              newCost = item.cost;
            }

            isStale = true; // Stay stale until cloud function verifies/overrides it
            isShadowHPP = true; // Injeksi tanda Shadow HPP
          }

          const updatedStock = existingItem.update({
            quantity: newQuantity,
            cost: newCost,
            specificCost: newSpecificCost,
            price: item.price,
            isStale,
            is_shadow_hpp: isShadowHPP
          });

          await this.stockRepository.update(updatedStock);
          
          await this.unitOfWork.registerAudit(
            'UPDATE_STOCK_BULK',
            request.userId,
            `Bulk update stok ${item.barcode}. Delta: +${item.quantity}, HPP Baru: ${newCost}`
          );

          // Delta Sync
          await this.unitOfWork.registerSync('stock', 'UPDATE', {
            id: existingItem.id,
            barcode: item.barcode,
            quantityChange: item.quantity,
            cost: newCost,
            price: item.price,
            specificCost: newSpecificCost,
            version: updatedStock.version,
            isStale: isStale ? true : undefined,
            is_shadow_hpp: isShadowHPP ? true : undefined
          });
        } else {
          const newStock = StockItem.create({
            name: item.name,
            category: item.category,
            price: item.price,
            cost: item.cost,
            quantity: item.quantity,
            barcode: item.barcode,
            specificCost: isSpecificId ? item.cost : undefined,
            weight: item.weight ?? 0,
            karat: item.karat ?? 0,
          });

          await this.stockRepository.save(newStock);
          
          await this.unitOfWork.registerAudit(
            'CREATE_STOCK_BULK',
            request.userId,
            `Bulk create produk ${item.name} (${item.barcode}). Qty: ${item.quantity}, HPP: ${item.cost}`
          );

          // Sync
          await this.unitOfWork.registerSync('stock', 'INSERT', {
            id: newStock.id,
            name: newStock.name,
            category: newStock.category,
            price: newStock.price,
            cost: newStock.cost,
            quantity: newStock.quantity,
            barcode: newStock.barcode,
            specificCost: newStock.specificCost,
            version: newStock.version
          });
        }
      }
    }, ['stock', 'stock_history']);
  }
}
