import { StockItem } from '../models/StockItem';

export interface IStockRepository {
  findById(id: string): Promise<StockItem | null>;
  findByBarcode(barcode: string): Promise<StockItem | null>;
  save(stock: StockItem): Promise<void>;
  update(stock: StockItem): Promise<void>;
  updateIfVersionMatches(id: string, expectedVersion: number, changes: Partial<StockItem>): Promise<boolean>;
  delete(id: string): Promise<void>;
  list(branchId?: string): Promise<StockItem[]>;
}
