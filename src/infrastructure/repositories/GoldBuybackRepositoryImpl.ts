import { IGoldBuybackRepository } from '@domain/repositories/IGoldBuybackRepository';
import { GoldBuyback } from '@domain/models/GoldBuyback';
import { db } from '../../shared/api/db';

export class GoldBuybackRepositoryImpl implements IGoldBuybackRepository {
  async save(buyback: GoldBuyback): Promise<void> {
    await db.gold_buyback.put({
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
      soldDate: buyback.soldDate,
      soldPrice: buyback.soldPrice,
      soldPaymentMethod: buyback.soldPaymentMethod,
      profitLoss: buyback.profitLoss,
      notes: buyback.notes,
      user: buyback.userId,
      branchId: buyback.branchId || 'HQ',
    });
  }

  async findById(id: string): Promise<GoldBuyback | null> {
    const record = await db.gold_buyback.get(id);
    if (!record) return null;

    return GoldBuyback.create({
      customerName: record.customerName,
      customerId: record.customerId,
      weightGram: record.weightGram,
      kadar: record.kadar,
      pricePerGram: record.pricePerGram,
      margin: record.margin,
      buybackPrice: record.buybackPrice,
      paymentMethod: record.paymentMethod,
      cashSource: record.cashSource,
      status: record.status,
      soldDate: record.soldDate,
      soldPrice: record.soldPrice,
      soldPaymentMethod: record.soldPaymentMethod,
      profitLoss: record.profitLoss,
      notes: record.notes,
      userId: record.user,
      branchId: record.branchId || 'HQ',
    }, record.id, record.date);
  }

  async findAll(): Promise<GoldBuyback[]> {
    const records = await db.gold_buyback.toArray();
    return records.map(record => GoldBuyback.create({
      customerName: record.customerName,
      customerId: record.customerId,
      weightGram: record.weightGram,
      kadar: record.kadar,
      pricePerGram: record.pricePerGram,
      margin: record.margin,
      buybackPrice: record.buybackPrice,
      paymentMethod: record.paymentMethod,
      cashSource: record.cashSource,
      status: record.status,
      soldDate: record.soldDate,
      soldPrice: record.soldPrice,
      soldPaymentMethod: record.soldPaymentMethod,
      profitLoss: record.profitLoss,
      notes: record.notes,
      userId: record.user,
      branchId: record.branchId || 'HQ',
    }, record.id, record.date));
  }
}
