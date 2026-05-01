import { IStockRepository } from '@domain/repositories/IStockRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { StockItem } from '@domain/models/StockItem';
import { StockCategory } from '@domain/models/StockCategory';
import { UserRole } from '@domain/models/User';
import { DbService } from '@shared/api/dbService';
import { MathUtils } from '@shared/utils/decimalUtils';

export interface ReceiveStockRequestDTO {
  barcode: string;
  name: string;
  category: StockCategory;
  price: number;
  cost: number;
  quantity: number;
  weight?: number;
  karat?: number;
  userId: string;
  userRole: UserRole;
}

/**
 * @ai_context Orkestrasi penambahan stok barang ke gudang/toko.
 * @business_rule HPP dihitung ulang (Moving Average) eksklusif di sisi server.
 * @security_tier MED
 */
export class ReceiveStockUseCase {
  constructor(
    private readonly stockRepository: IStockRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: ReceiveStockRequestDTO): Promise<void> {
    // RBAC: Only MANAGER and ADMIN can receive stock
    if (request.userRole === 'CASHIER') {
      throw new Error('Akses ditolak: Kasir tidak memiliki izin untuk menambah stok.');
    }

    return this.unitOfWork.execute(async () => {
      const existingItem = await this.stockRepository.findByBarcode(request.barcode);
      const isSpecificId = DbService.isSpecificIdentification(request.category);

      if (existingItem) {
        // Logic: For Specific Identification (Gold), if cost is different, we CANNOT use the same barcode.
        if (isSpecificId && existingItem.cost !== request.cost) {
          throw new Error(`Barcode ${request.barcode} sudah digunakan untuk batch emas dengan harga modal berbeda (${existingItem.cost}). Gunakan barcode baru untuk batch ini.`);
        }

        // UPDATE EXISTING
        const newQuantity = MathUtils.add(existingItem.quantity, request.quantity);
        const newSpecificCost = existingItem.specificCost;
        let isStale = false;
        let isShadowHPP = false;
        let newCost = existingItem.cost;

        if (!isSpecificId) {
          // Phase 1.1: Kalkulasi Shadow HPP (Moving Average Lokal) saat offline
          const totalValueOld = MathUtils.mul(existingItem.quantity, existingItem.cost);
          const totalValueNew = MathUtils.mul(request.quantity, request.cost);
          const totalCombinedValue = MathUtils.add(totalValueOld, totalValueNew);
          
          if (newQuantity > 0) {
            newCost = MathUtils.roundInt(MathUtils.div(totalCombinedValue, newQuantity));
          } else {
            newCost = request.cost;
          }

          isStale = true; // Stay stale until cloud function verifies/overrides it
          isShadowHPP = true; // Injeksi tanda Shadow HPP
        }

        const updatedStock = existingItem.update({
          quantity: newQuantity,
          specificCost: newSpecificCost,
          cost: newCost, // Assign shadow HPP cost
          price: request.price,
          isStale,
          is_shadow_hpp: isShadowHPP
        });

        await this.stockRepository.update(updatedStock);
        
        // Stock History
        await this.unitOfWork.registerStockHistory({
          stockId: existingItem.id,
          action: 'ADD',
          quantityChange: request.quantity,
          oldCost: existingItem.cost,
          newCost: newCost, 
          newQuantity: newQuantity,
          user: request.userId,
          details: `Update stok ${request.barcode} (${request.name}). HPP (Shadow: Rp${newCost}) akan disinkronisasi dari server.`
        });

        // Audit Trail
        await this.unitOfWork.registerAudit(
          'UPDATE_STOCK',
          request.userId,
          `Update stok ${request.barcode}. Delta: +${request.quantity}, Shadow HPP: ${newCost}`,
          {
            userId: request.userId,
            entityId: existingItem.id,
            payloadDiff: JSON.stringify({
              barcode: request.barcode,
              quantity: request.quantity,
              cost: request.cost,
              price: request.price,
              isStale: true,
              is_shadow_hpp: true
            }),
            correlationId: `STOCK_UPDATE_${request.barcode}_${Date.now()}`
          }
        );

        // Delta Sync: Publish intent instead of mutating cost directly
        await this.unitOfWork.registerSync('stock_inbound_intents', 'INSERT', {
          id: crypto.randomUUID(),
          stockId: existingItem.id,
          inboundQuantity: request.quantity,
          inboundCost: request.cost,
          timestamp: Date.now()
        });

        // Still update delta for quantity & price immediately
        await this.unitOfWork.registerSync('stock', 'UPDATE_DELTA', {
          id: existingItem.id,
          barcode: request.barcode,
          delta_field: 'quantity',
          delta_value: request.quantity,
          price: request.price,
          cost: newCost, // Sync the shadow HPP anyway so it reflects on other devices
          isStale: true,
          is_shadow_hpp: true, // Flag for server
          version: updatedStock.version
        });
      } else {
        // CREATE NEW (New product)
        const newStock = StockItem.create({
          name: request.name,
          category: request.category,
          price: request.price,
          cost: request.cost,
          quantity: request.quantity,
          barcode: request.barcode,
          specificCost: isSpecificId ? request.cost : undefined,
          isStale: false,
          weight: request.weight ?? 0,
          karat: request.karat ?? 0
        });

        await this.stockRepository.save(newStock);
        
        // Stock History
        await this.unitOfWork.registerStockHistory({
          stockId: newStock.id,
          action: 'ADD',
          quantityChange: request.quantity,
          oldCost: 0,
          newCost: request.cost,
          newQuantity: request.quantity,
          user: request.userId,
          details: `Produk baru: ${request.name} (${request.barcode}).`
        });

        // Audit Trail
        // Using barcode + timestamp as correlationId for traceability
        await this.unitOfWork.registerAudit(
          'CREATE_STOCK',
          request.userId,
          `Produk baru: ${request.name} (${request.barcode}). Qty: ${request.quantity}, HPP: ${request.cost}`,
          {
            userId: request.userId,
            correlationId: `STOCK_CREATE_${request.barcode}_${Date.now()}`
          }
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
    }, ['stock', 'stock_history']);
  }
}
