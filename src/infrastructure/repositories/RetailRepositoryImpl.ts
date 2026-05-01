import { IRetailRepository } from '@domain/repositories/IRetailRepository';
import { RetailTransaction } from '@domain/models/RetailTransaction';
import { db } from '../../shared/api/db';
import { cryptoDB } from '../../lib/cryptoIndexedDB';

export class RetailRepositoryImpl implements IRetailRepository {
  async save(transaction: RetailTransaction): Promise<void> {
    try {
      const sensitiveData = {
        items: transaction.items,
        manualDiscountNote: transaction.manualDiscountNote
      };
      const encrypted = await cryptoDB.encryptRecord(sensitiveData);

      await db.transactions.put({
        id: transaction.id,
        date: transaction.createdAt,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
        user: transaction.userId,
        sessionId: transaction.sessionId,
        customerId: transaction.customerId,
        pointsEarned: transaction.pointsEarned,
        pointsRedeemed: transaction.pointsRedeemed,
        loyaltyDiscountAmount: transaction.loyaltyDiscountAmount,
        manualDiscountAmount: transaction.manualDiscountAmount,
        branchId: transaction.branchId || 'HQ',
        isVoided: transaction.isVoided,
        voidReason: transaction.voidReason,
        authorizedBy: transaction.authorizedBy,
        isFlagged: transaction.isFlagged,
        flagReason: transaction.flagReason,
        secureData: JSON.stringify(encrypted),
        items: []
      });
    } catch (error) {
      throw new Error('Gagal menyimpan data ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async findById(id: string): Promise<RetailTransaction | null> {
    const record = await db.transactions.get(id);
    if (!record) return null;

    let items = record.items || [];
    let manualDiscountNote = record.manualDiscountNote;

    if (record.secureData) {
      try {
        const decrypted = await cryptoDB.decryptRecord(JSON.parse(record.secureData));
        items = decrypted.items;
        manualDiscountNote = decrypted.manualDiscountNote;
      } catch (err) {
        console.error('Failed to decrypt transaction', err);
      }
    }

    return RetailTransaction.create({
      total: record.total,
      paymentMethod: record.paymentMethod,
      items: items,
      status: record.status,
      userId: record.user,
      sessionId: record.sessionId,
      customerId: record.customerId,
      pointsEarned: record.pointsEarned,
      pointsRedeemed: record.pointsRedeemed,
      loyaltyDiscountAmount: record.loyaltyDiscountAmount,
      manualDiscountAmount: record.manualDiscountAmount,
      manualDiscountNote: manualDiscountNote,
      branchId: record.branchId || 'HQ',
      isVoided: record.isVoided,
      voidReason: record.voidReason,
      authorizedBy: record.authorizedBy,
      isFlagged: record.isFlagged,
      flagReason: record.flagReason,
    }, record.id, record.date);
  }

  async findAll(branchId?: string): Promise<RetailTransaction[]> {
    const query = db.transactions.orderBy('date').reverse();
    
    let records: import('../../shared/api/db').Transaction[];
    if (branchId && branchId !== 'HQ') {
      records = await query.filter(t => t.branchId === branchId).toArray();
    } else {
      records = await query.toArray();
    }

    const transactions = await Promise.all(records.map(async (record) => {
      let items = record.items || [];
      let manualDiscountNote = record.manualDiscountNote;

      if (record.secureData) {
        try {
          const decrypted = await cryptoDB.decryptRecord(JSON.parse(record.secureData));
          items = decrypted.items;
          manualDiscountNote = decrypted.manualDiscountNote;
        } catch (err) {
          console.error('Failed to decrypt transaction list item', err);
        }
      }

      return RetailTransaction.create({
        total: record.total,
        paymentMethod: record.paymentMethod,
        items: items,
        status: record.status,
        userId: record.user,
        sessionId: record.sessionId,
        customerId: record.customerId,
        pointsEarned: record.pointsEarned,
        pointsRedeemed: record.pointsRedeemed,
        loyaltyDiscountAmount: record.loyaltyDiscountAmount,
        manualDiscountAmount: record.manualDiscountAmount,
        manualDiscountNote: manualDiscountNote,
        branchId: record.branchId || 'HQ',
        isVoided: record.isVoided,
        voidReason: record.voidReason,
        authorizedBy: record.authorizedBy,
        isFlagged: record.isFlagged,
        flagReason: record.flagReason,
      }, record.id, record.date);
    }));

    return transactions;
  }
}
