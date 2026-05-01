import { Transaction, RepairService } from '../../shared/api/db';

export interface IPrintService {
  print(data: Transaction | RepairService): Promise<void>;
  formatReceipt(data: Transaction | RepairService, shopName: string, shopAddress: string, shopFooter: string): string;
  triggerCashDrawer(): Promise<void>;
  testConnection(): Promise<boolean>;
}
