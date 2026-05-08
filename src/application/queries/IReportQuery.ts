import { Transaction, AuditLog } from '../../shared/api/db';
import { StockItem } from '../../domain/models/StockItem';

export interface DailyStats {
  totalTransactions: number;
  totalRevenue: number;
  completedRepairs: number;
}

export interface TopSellingItem {
  name: string;
  quantity: number;
}

export interface SectorFinancials {
  revenue: number;
  cogs: number;
  grossProfit: number;
}

export interface FinancialReport {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  transactionCount: number;
  breakdown: {
    retail: SectorFinancials;
    gold: SectorFinancials;
    services: SectorFinancials;
  };
  cashFlow: {
    cashIn: number;
    cashOut: number;
    netCash: number;
  };
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
}

export interface DailyRevenueTrend {
  date: string;
  revenue: number;
}

export interface PaymentMethodRevenue {
  method: string;
  revenue: number;
}

export interface CustomerRevenue {
  id: string;
  name: string;
  phoneNumber: string;
  totalRevenue: number;
  totalTransactions: number;
  loyaltyPoints: number;
}

export interface ReportFilters {
  startDate: number;
  endDate: number;
  cashier?: string;
  paymentMethod?: string;
}

export interface IReportQuery {
  getDailyStats(): Promise<DailyStats>;
  getTopSellingItems(): Promise<TopSellingItem[]>;
  getFinancialReport(startDate: number, endDate: number): Promise<FinancialReport>;
  getTransactions(page: number, pageSize: number): Promise<Transaction[]>;
  getTransactionsByDateRange(startDate: number, endDate: number): Promise<Transaction[]>;
  getTransactionsByFilters(filters: ReportFilters): Promise<Transaction[]>;
  getRevenueByCategory(startDate: number, endDate: number): Promise<CategoryRevenue[]>;
  getSalesTrends(startDate: number, endDate: number): Promise<DailyRevenueTrend[]>;
  getRevenueByPaymentMethod(startDate: number, endDate: number): Promise<PaymentMethodRevenue[]>;
  getLowStockItems(): Promise<StockItem[]>;
  getTopCustomers(startDate: number, endDate: number, limit: number): Promise<CustomerRevenue[]>;
  getAuditLogs(page: number, pageSize: number): Promise<AuditLog[]>;
  getCustomerSegmentation(): Promise<{ segment: string; count: number; revenue: number }[]>;
}
