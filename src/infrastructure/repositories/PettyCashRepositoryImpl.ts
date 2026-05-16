import { IPettyCashRepository } from '../../domain/repositories/IPettyCashRepository';
import { PettyCash, db } from '../../shared/api/db';

export class PettyCashRepositoryImpl implements IPettyCashRepository {
  async save(pettyCash: PettyCash): Promise<void> {
    try {
      await db.petty_cash.add(pettyCash);
    } catch (error) {
      throw new Error('Gagal menyimpan data petty cash ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  getTodayQuery(): Promise<PettyCash[]> {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    return db.petty_cash.where('date').aboveOrEqual(startOfDay).toArray();
  }
}
