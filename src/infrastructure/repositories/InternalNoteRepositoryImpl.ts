import { IInternalNoteRepository } from '../../domain/repositories/IInternalNoteRepository';
import { InternalNote, db } from '../../shared/api/db';

export class InternalNoteRepositoryImpl implements IInternalNoteRepository {
  async save(note: InternalNote): Promise<void> {
    try {
      await db.internal_notes.add(note);
    } catch (error) {
      throw new Error('Gagal menyimpan data catatan internal ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}
