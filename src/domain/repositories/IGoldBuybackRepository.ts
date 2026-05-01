import { GoldBuyback } from '../models/GoldBuyback';

export interface IGoldBuybackRepository {
  save(buyback: GoldBuyback): Promise<void>;
  findById(id: string): Promise<GoldBuyback | null>;
  findAll(): Promise<GoldBuyback[]>;
}
