import { IGoldLiquidationRepository } from '@domain/repositories/IGoldLiquidationRepository';
import { GoldLiquidation } from '@domain/models/GoldLiquidation';
import { db } from '../../shared/api/db';

export class GoldLiquidationRepositoryImpl implements IGoldLiquidationRepository {
  async save(liquidation: GoldLiquidation): Promise<void> {
    await db.gold_liquidations.put({
      id: liquidation.id,
      date: liquidation.createdAt,
      grossWeight: liquidation.grossWeight,
      stoneWeight: liquidation.stoneWeight,
      netWeight: liquidation.netWeight,
      fineWeight: liquidation.fineWeight,
      cogs: liquidation.cogs,
      goldContent: liquidation.goldContent,
      laborCost: liquidation.laborCost,
      marketPrice: liquidation.marketPrice,
      totalPrice: liquidation.totalPrice,
      paymentMethod: liquidation.paymentMethod,
      status: liquidation.status,
      user: liquidation.userId,
      branchId: liquidation.branchId || 'HQ',
    });
  }

  async findById(id: string): Promise<GoldLiquidation | null> {
    const record = await db.gold_liquidations.get(id);
    if (!record) return null;

    return GoldLiquidation.create({
      grossWeight: record.grossWeight,
      stoneWeight: record.stoneWeight,
      netWeight: record.netWeight,
      fineWeight: record.fineWeight,
      cogs: record.cogs,
      goldContent: record.goldContent,
      laborCost: record.laborCost,
      marketPrice: record.marketPrice,
      totalPrice: record.totalPrice,
      paymentMethod: record.paymentMethod,
      status: record.status,
      userId: record.user,
      createdAt: record.date,
      branchId: record.branchId || 'HQ',
    }, record.id);
  }

  async findAll(): Promise<GoldLiquidation[]> {
    const records = await db.gold_liquidations.toArray();
    return records.map(record => GoldLiquidation.create({
      grossWeight: record.grossWeight,
      stoneWeight: record.stoneWeight,
      netWeight: record.netWeight,
      fineWeight: record.fineWeight,
      cogs: record.cogs,
      goldContent: record.goldContent,
      laborCost: record.laborCost,
      marketPrice: record.marketPrice,
      totalPrice: record.totalPrice,
      paymentMethod: record.paymentMethod,
      status: record.status,
      userId: record.user,
      createdAt: record.date,
      branchId: record.branchId || 'HQ',
    }, record.id));
  }
}
