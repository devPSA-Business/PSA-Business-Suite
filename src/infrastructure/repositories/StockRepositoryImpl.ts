import { IStockRepository } from '@domain/repositories/IStockRepository';
import { StockItem } from '@domain/models/StockItem';
import { db } from '../../shared/api/db';
import { metrics } from '../../lib/metrics';
import { logger } from '../../lib/logger';

export class StockRepositoryImpl implements IStockRepository {
  async findById(id: string): Promise<StockItem | null> {
    const record = await db.stock.get(id);
    if (!record) return null;

    return StockItem.create({
      name: record.name,
      category: record.category,
      price: record.price,
      cost: record.cost,
      quantity: record.quantity,
      barcode: record.barcode,
      specificCost: record.specificCost,
      version: record.version,
      isDeleted: record.isDeleted,
      branchId: record.branchId || 'HQ',
      weight: record.weight,
      karat: record.karat,
    }, record.id);
  }

  async findByBarcode(barcode: string): Promise<StockItem | null> {
    const record = await db.stock.where('barcode').equals(barcode).first();
    if (!record) return null;

    return StockItem.create({
      name: record.name,
      category: record.category,
      price: record.price,
      cost: record.cost,
      quantity: record.quantity,
      barcode: record.barcode,
      specificCost: record.specificCost,
      version: record.version,
      isDeleted: record.isDeleted,
      branchId: record.branchId || 'HQ',
      weight: record.weight,
      karat: record.karat,
    }, record.id);
  }

  async save(stock: StockItem): Promise<void> {
    try {
      await db.stock.add({
        id: stock.id,
        name: stock.name,
        category: stock.category,
        price: stock.price,
        cost: stock.cost,
        quantity: stock.quantity,
        barcode: stock.barcode,
        specificCost: stock.specificCost,
        version: stock.version,
        isDeleted: stock.isDeleted,
        branchId: stock.branchId || 'HQ',
        weight: stock.weight,
        karat: stock.karat,
      });
    } catch (error) {
      throw new Error('Gagal menyimpan data ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async update(stock: StockItem): Promise<void> {
    try {
      await db.stock.update(stock.id, {
        name: stock.name,
        category: stock.category,
        price: stock.price,
        cost: stock.cost,
        quantity: stock.quantity,
        barcode: stock.barcode,
        specificCost: stock.specificCost,
        version: stock.version,
        isDeleted: stock.isDeleted,
        branchId: stock.branchId || 'HQ',
        weight: stock.weight,
        karat: stock.karat,
      });
    } catch (error) {
      throw new Error('Gagal menyimpan data ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async updateIfVersionMatches(id: string, expectedVersion: number, changes: Partial<StockItem>): Promise<boolean> {
    let updated = false;
    logger.debug('Attempting updateIfVersionMatches', { id, expectedVersion, changes });
    try {
      await db.transaction('rw', db.stock, async () => {
        const existing = await db.stock.get(id);
        if (!existing) {
          logger.warn('Item not found during updateIfVersionMatches', { id });
          return;
        }
        if ((existing.version ?? 1) !== expectedVersion) {
          logger.warn('Version mismatch during updateIfVersionMatches', { id, expectedVersion, actualVersion: existing.version ?? 1 });
          metrics.increment('psa_version_conflicts_total', { entity: 'stock', id });
          return;
        }
        
        const newVersion = expectedVersion + 1;
        await db.stock.update(id, {
          ...changes,
          version: newVersion
        });
        updated = true;
      });
    } catch (error) {
      throw new Error('Gagal menyimpan data ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
    logger.debug('Finished updateIfVersionMatches', { id, updated });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.stock.delete(id);
  }

  async list(branchId?: string): Promise<StockItem[]> {
    let query = db.stock.filter(r => !r.isDeleted);
    
    if (branchId && branchId !== 'HQ') {
      query = query.and(r => r.branchId === branchId);
    }

    const records = await query.toArray();
    return records.map(record => StockItem.create({
      name: record.name,
      category: record.category,
      price: record.price,
      cost: record.cost,
      quantity: record.quantity,
      barcode: record.barcode,
      specificCost: record.specificCost,
      version: record.version,
      isDeleted: record.isDeleted,
      branchId: record.branchId || 'HQ',
      weight: record.weight,
      karat: record.karat,
    }, record.id));
  }
}
