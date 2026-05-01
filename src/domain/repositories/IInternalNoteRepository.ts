import { InternalNote } from '../../shared/api/db';

export interface IInternalNoteRepository {
  save(note: InternalNote): Promise<void>;
}
