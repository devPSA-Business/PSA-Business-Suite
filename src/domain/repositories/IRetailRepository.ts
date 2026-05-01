import { RetailTransaction } from '../models/RetailTransaction';

export interface IRetailRepository {
  save(transaction: RetailTransaction): Promise<void>;
  findById(id: string): Promise<RetailTransaction | null>;
  findAll(branchId?: string): Promise<RetailTransaction[]>;
}
