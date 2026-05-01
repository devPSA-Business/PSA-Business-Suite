import { Handover } from '../models/Handover';

export interface IHandoverRepository {
  save(handover: Handover): Promise<void>;
  getAll(): Promise<Handover[]>;
}
