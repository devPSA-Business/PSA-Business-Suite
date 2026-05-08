import { 
  IReportQuery, 
  DailyStats, 
  TopSellingItem, 
  FinancialReport, 
  CategoryRevenue, 
  DailyRevenueTrend, 
  PaymentMethodRevenue, 
  ReportFilters,
  CustomerRevenue
} from '@application/queries/IReportQuery';
import { db, Transaction, AuditLog } from '../../shared/api/db';
import { StockItem } from '../../domain/models/StockItem';
import { cryptoDB } from '../../lib/cryptoIndexedDB';

import { MathUtils } from '../../shared/utils/decimalUtils';

export class ReportQueryImpl implements IReportQuery {
  private async decryptTransaction(tx: Transaction): Promise<Transaction> {
    if (tx.secureData) {
      try {
        const decrypted = await cryptoDB.decryptRecord(JSON.parse(tx.secureData));
        return { ...tx, items: decrypted.items || [], manualDiscountNote: String(decrypted.manualDiscountNote) };
      } catch (err) {
        console.error('Failed to decrypt transaction in report', err);
        return { ...tx, items: [] };
      }
    }
    return tx;
  }

  async getTopCustomers(startDate: number, endDate: number, limit: number): Promise<CustomerRevenue[]> {
    const records = await db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .filter(tx => tx.status === 'SUCCESS' && !!tx.customerId)
      .toArray();

    // No need to decrypt items here since we only need customerId and total

    const customerRevenueMap = new Map<string, { totalRevenue: number; totalTransactions: number }>();

    records.forEach(tx => {
      const customerId = tx.customerId!;
      const existing = customerRevenueMap.get(customerId) || { totalRevenue: 0, totalTransactions: 0 };
      customerRevenueMap.set(customerId, {
        totalRevenue: MathUtils.add(existing.totalRevenue, tx.total),
        totalTransactions: existing.totalTransactions + 1
      });
    });

    const topCustomerIds = Array.from(customerRevenueMap.entries())
      .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
      .slice(0, limit);

    const results: CustomerRevenue[] = [];

    for (const [customerId, stats] of topCustomerIds) {
      const customer = await db.customers.get(customerId);
      if (customer) {
        results.push({
          id: customer.id,
          name: customer.name,
          phoneNumber: customer.phoneNumber,
          totalRevenue: stats.totalRevenue,
          totalTransactions: stats.totalTransactions,
          loyaltyPoints: customer.loyaltyPoints
        });
      }
    }

    return results;
  }

  async getDailyStats(): Promise<DailyStats> {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const endOfDay = new Date().setHours(23, 59, 59, 999);

    let totalRevenue = 0;
    let totalTransactions = 0;

    // No need to decrypt items for basically counting revenue and transactions
    await db.transactions
      .where('date')
      .between(startOfDay, endOfDay)
      .filter(t => t.status === 'SUCCESS')
      .each(tx => {
        totalTransactions++;
        totalRevenue = MathUtils.add(totalRevenue, tx.total);
      });

    // include sales to collectors
    await db.gold_buyback
      .filter(gb => gb.status === 'sold_to_collector' && gb.soldDate !== undefined && new Date(gb.soldDate).getTime() >= startOfDay && new Date(gb.soldDate).getTime() <= endOfDay)
      .each(tx => {
        totalTransactions++;
        totalRevenue = MathUtils.add(totalRevenue, (tx.soldPrice || 0));
      });

    const completedRepairs = await db.repair_services
      .where('date')
      .between(startOfDay, endOfDay)
      .filter(r => r.status === 'COMPLETED' || r.status === 'DELIVERED')
      .count();

    return { totalTransactions, totalRevenue, completedRepairs };
  }

  async getTopSellingItems(): Promise<TopSellingItem[]> {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const itemMap = new Map<string, TopSellingItem>();

    const records = await db.transactions
      .where('date')
      .above(thirtyDaysAgo)
      .filter(t => t.status === 'SUCCESS')
      .toArray();

    const transactions = await Promise.all(records.map(r => this.decryptTransaction(r)));

    transactions.forEach(tx => {
        tx.items.forEach(item => {
          const existing = itemMap.get(item.stockId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            itemMap.set(item.stockId, { name: item.name, quantity: item.quantity });
          }
        });
      });

    return Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  async getFinancialReport(startDate: number, endDate: number): Promise<FinancialReport> {
    let totalRevenue = 0;
    let totalCost = 0;
    let transactionCount = 0;

    const breakdown = {
      retail: { revenue: 0, cogs: 0, grossProfit: 0 },
      gold: { revenue: 0, cogs: 0, grossProfit: 0 },
      services: { revenue: 0, cogs: 0, grossProfit: 0 }
    };

    const cashFlow = { cashIn: 0, cashOut: 0, netCash: 0 };

    // 2. Hitung Cash Out (Buyback & Petty Cash)
    await db.gold_buyback
      .where('date').between(startDate, endDate, true, true)
      .each(b => { if (b.paymentMethod === 'CASH') cashFlow.cashOut = MathUtils.add(cashFlow.cashOut, b.buybackPrice); });

    await db.petty_cash
      .where('date').between(startDate, endDate, true, true)
      .each(pc => { cashFlow.cashOut = MathUtils.add(cashFlow.cashOut, pc.amount); });

    // 3. Hitung Transaksi Ritel
    const retailRecords = await db.transactions
      .where('date').between(startDate, endDate, true, true)
      .filter(tx => tx.status === 'SUCCESS')
      .toArray();
      
    const retailTransactions = await Promise.all(retailRecords.map(r => this.decryptTransaction(r)));

    retailTransactions.forEach(tx => {
        transactionCount++;
        const txRevenue = tx.total;
        let txCogs = 0;
        tx.items.forEach(item => { txCogs = MathUtils.add(txCogs, MathUtils.mul((item.unitCost || 0), item.quantity)); });
        
        breakdown.retail.revenue = MathUtils.add(breakdown.retail.revenue, txRevenue);
        breakdown.retail.cogs = MathUtils.add(breakdown.retail.cogs, txCogs);
        breakdown.retail.grossProfit = MathUtils.add(breakdown.retail.grossProfit, MathUtils.sub(txRevenue, txCogs));
        
        totalRevenue = MathUtils.add(totalRevenue, txRevenue);
        totalCost = MathUtils.add(totalCost, txCogs);
        if (tx.paymentMethod === 'CASH') cashFlow.cashIn = MathUtils.add(cashFlow.cashIn, txRevenue);
      });

    // 4. Hitung Likuidasi Emas (Fase 2 Update: Gunakan gold_buyback dengan status sold_to_collector)
    await db.gold_buyback
      .where('date').between(startDate, endDate, true, true)
      .filter(b => b.status === 'sold_to_collector')
      .each(b => {
        transactionCount++;
        const txRevenue = b.soldPrice || 0;
        const goldCogs = b.buybackPrice; // modal adalah buyPrice
        
        breakdown.gold.revenue = MathUtils.add(breakdown.gold.revenue, txRevenue);
        breakdown.gold.cogs = MathUtils.add(breakdown.gold.cogs, goldCogs);
        breakdown.gold.grossProfit = MathUtils.add(breakdown.gold.grossProfit, MathUtils.sub(txRevenue, goldCogs));

        totalRevenue = MathUtils.add(totalRevenue, txRevenue);
        totalCost = MathUtils.add(totalCost, goldCogs);
        if (b.paymentMethod === 'CASH') cashFlow.cashIn = MathUtils.add(cashFlow.cashIn, txRevenue);
      });

    // 5. Hitung Reparasi
    await db.repair_services
      .where('date').between(startDate, endDate, true, true)
      .filter(rs => rs.status === 'COMPLETED' || rs.status === 'DELIVERED')
      .each(rs => {
        transactionCount++;
        const txRevenue = rs.price;
        const txCogs = rs.materialCost || 0;
        
        breakdown.services.revenue = MathUtils.add(breakdown.services.revenue, txRevenue);
        breakdown.services.cogs = MathUtils.add(breakdown.services.cogs, txCogs);
        breakdown.services.grossProfit = MathUtils.add(breakdown.services.grossProfit, MathUtils.sub(txRevenue, txCogs));

        totalRevenue = MathUtils.add(totalRevenue, txRevenue);
        totalCost = MathUtils.add(totalCost, txCogs);
        if (rs.paymentMethod === 'CASH') cashFlow.cashIn = MathUtils.add(cashFlow.cashIn, txRevenue);
      });

    cashFlow.netCash = MathUtils.sub(cashFlow.cashIn, cashFlow.cashOut);
    const grossProfit = MathUtils.sub(totalRevenue, totalCost);
    const margin = totalRevenue > 0 ? MathUtils.mul(MathUtils.div(grossProfit, totalRevenue), 100) : 0;

    return { totalRevenue, totalCost, grossProfit, margin, transactionCount, breakdown, cashFlow };
  }

  async getTransactions(page: number, pageSize: number): Promise<Transaction[]> {
    const records = await db.transactions
      .orderBy('date')
      .reverse()
      .offset(page * pageSize)
      .limit(pageSize)
      .toArray();
    return await Promise.all(records.map(r => this.decryptTransaction(r)));
  }

  async getTransactionsByDateRange(startDate: number, endDate: number): Promise<Transaction[]> {
    const records = await db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
    return await Promise.all(records.map(r => this.decryptTransaction(r)));
  }

  async getTransactionsByFilters(filters: ReportFilters): Promise<Transaction[]> {
    const query = db.transactions
      .where('date')
      .between(filters.startDate, filters.endDate, true, true);

    const records = await query.toArray();
    const transactions = await Promise.all(records.map(r => this.decryptTransaction(r)));

    return transactions.filter(tx => {
      if (filters.cashier && tx.user !== filters.cashier) return false;
      if (filters.paymentMethod && tx.paymentMethod !== filters.paymentMethod) return false;
      return true;
    });
  }

  async getRevenueByCategory(startDate: number, endDate: number): Promise<CategoryRevenue[]> {
    const records = await db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .filter(tx => tx.status === 'SUCCESS')
      .toArray();

    const transactions = await Promise.all(records.map(r => this.decryptTransaction(r)));

    const categoryMap = new Map<string, number>();

    // Optimization: Fetch all stock items involved in these transactions
    const stockIds = new Set<string>();
    transactions.forEach(tx => tx.items.forEach(item => stockIds.add(item.stockId)));
    const stocks = await db.stock.where('id').anyOf(Array.from(stockIds)).toArray();
    const stockCategoryMap = new Map(stocks.map(s => [s.id, s.category]));

    transactions.forEach(tx => {
      tx.items.forEach(item => {
        const category = stockCategoryMap.get(item.stockId) || 'Lainnya';
        categoryMap.set(category, MathUtils.add((categoryMap.get(category) || 0), item.subtotal));
      });
    });

    const goldSold = await db.gold_buyback
      .filter(gb => gb.status === 'sold_to_collector' && gb.soldDate !== undefined && new Date(gb.soldDate).getTime() >= startDate && new Date(gb.soldDate).getTime() <= endDate)
      .toArray();

    let goldRevenue = 0;
    goldSold.forEach(tx => {
      goldRevenue += (tx.soldPrice || 0);
    });

    if (goldRevenue > 0) {
      categoryMap.set('Emas (Treasury)', (categoryMap.get('Emas (Treasury)') || 0) + goldRevenue);
    }

    return Array.from(categoryMap.entries()).map(([category, revenue]) => ({ category, revenue }));
  }

  async getSalesTrends(startDate: number, endDate: number): Promise<DailyRevenueTrend[]> {
    const trendMap = new Map<string, number>();
    await db.transactions
      .where('date').between(startDate, endDate, true, true)
      .filter(tx => tx.status === 'SUCCESS')
      .each(tx => {
        const dateStr = new Date(tx.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        trendMap.set(dateStr, MathUtils.add((trendMap.get(dateStr) || 0), tx.total));
      });
    return Array.from(trendMap.entries()).map(([date, revenue]) => ({ date, revenue }));
  }

  async getRevenueByPaymentMethod(startDate: number, endDate: number): Promise<PaymentMethodRevenue[]> {
    const methodMap = new Map<string, number>();
    await db.transactions
      .where('date').between(startDate, endDate, true, true)
      .filter(tx => tx.status === 'SUCCESS')
      .each(tx => {
        methodMap.set(tx.paymentMethod, MathUtils.add((methodMap.get(tx.paymentMethod) || 0), tx.total));
      });
    return Array.from(methodMap.entries()).map(([method, revenue]) => ({ method, revenue }));
  }

  async getLowStockItems(): Promise<StockItem[]> {
    const dbItems = await db.stock.filter(item => item.quantity < 5).toArray();
    return dbItems.map(item => {
      const { id, ...props } = item;
      return StockItem.create(props, id);
    });
  }

  async getCustomerSegmentation(): Promise<{ segment: string; count: number; revenue: number }[]> {
    const customers = await db.customers.toArray();
    const transactions = await db.transactions.filter(tx => tx.status === 'SUCCESS' && !!tx.customerId).toArray();

    const customerRevenueMap = new Map<string, number>();
    transactions.forEach(tx => {
      const customerId = tx.customerId!;
      customerRevenueMap.set(customerId, (customerRevenueMap.get(customerId) || 0) + tx.total);
    });

    let regularCount = 0;
    let regularRevenue = 0;
    let loyalCount = 0;
    let loyalRevenue = 0;
    let vipCount = 0;
    let vipRevenue = 0;

    // We can't import useSettingsStore directly at the top if it causes circular dependency, 
    // but we can import it here or at the top. Let's import it at the top.
    const { useSettingsStore } = await import('../../shared/store/settingsStore');
    const thresholds = useSettingsStore.getState().segmentationThresholds;

    customers.forEach(customer => {
      const revenue = customerRevenueMap.get(customer.id) || 0;
      if (revenue >= thresholds.vip) {
        vipCount++;
        vipRevenue += revenue;
      } else if (revenue >= thresholds.loyal) {
        loyalCount++;
        loyalRevenue += revenue;
      } else {
        regularCount++;
        regularRevenue += revenue;
      }
    });

    const formatCurrency = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    return [
      { segment: `VIP (>= ${formatCurrency(thresholds.vip)})`, count: vipCount, revenue: vipRevenue },
      { segment: `Loyal (${formatCurrency(thresholds.loyal)} - ${formatCurrency(thresholds.vip)})`, count: loyalCount, revenue: loyalRevenue },
      { segment: `Reguler (< ${formatCurrency(thresholds.loyal)})`, count: regularCount, revenue: regularRevenue }
    ];
  }

  async getAuditLogs(page: number, pageSize: number): Promise<AuditLog[]> {
    return await db.audit_logs
      .orderBy('timestamp')
      .reverse()
      .offset(page * pageSize)
      .limit(pageSize)
      .toArray();
  }
}
