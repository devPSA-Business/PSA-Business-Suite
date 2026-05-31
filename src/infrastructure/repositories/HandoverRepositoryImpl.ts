import { IHandoverRepository } from '@domain/repositories/IHandoverRepository';
import { Handover } from '@domain/models/Handover';
import { db, Handover as HandoverRecord } from '../../shared/api/db';

export class HandoverRepositoryImpl implements IHandoverRepository {
  async save(handover: Handover): Promise<void> {
    await db.handovers.add({
      id: handover.id,
      timestamp: handover.timestamp,
      category: handover.category,
      message: handover.message,
      user: handover.user,
    });
  }

  async getAll(): Promise<Handover[]> {
    const records = await db.handovers.toArray();
    return records.map((record: HandoverRecord) => Handover.create({
      timestamp: record.timestamp,
      category: record.category,
      message: record.message,
      user: record.user,
    }, record.id));
  }
}
