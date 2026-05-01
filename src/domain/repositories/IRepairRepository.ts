import { RepairService } from '../models/RepairService';

export interface IRepairRepository {
  save(repair: RepairService): Promise<void>;
  findById(id: string): Promise<RepairService | null>;
  findAll(): Promise<RepairService[]>;
}
