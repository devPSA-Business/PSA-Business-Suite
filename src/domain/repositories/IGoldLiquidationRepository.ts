import { GoldLiquidation } from '../models/GoldLiquidation';

export interface IGoldLiquidationRepository {
  save(liquidation: GoldLiquidation): Promise<void>;
  findById(id: string): Promise<GoldLiquidation | null>;
  findAll(): Promise<GoldLiquidation[]>;
}
