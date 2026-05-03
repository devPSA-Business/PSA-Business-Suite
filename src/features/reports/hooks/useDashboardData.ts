import { logger } from '@lib/logger';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { DIContainer } from '../../../infrastructure/di/Container';

export function useDashboardData(startDate: string, endDate: string) {
  const startTimestamp = useMemo(() => new Date(startDate).setHours(0, 0, 0, 0), [startDate]);
  const endTimestamp = useMemo(() => new Date(endDate).setHours(23, 59, 59, 999), [endDate]);
  const todayStart = useMemo(() => new Date().setHours(0, 0, 0, 0),[]);
  const todayEnd = useMemo(() => new Date().setHours(23, 59, 59, 999),[]);
  const sevenDaysAgoStart = useMemo(() => todayStart - 7 * 24 * 60 * 60 * 1000, [todayStart]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transactions, setTransactions] = useState<any[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [revenueByCategory, setRevenueByCategory] = useState<any[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [revenueByPaymentMethod, setRevenueByPaymentMethod] = useState<any[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [salesTrends, setSalesTrends] = useState<any[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topCustomers, setTopCustomers] = useState<any[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lowStockItems, setLowStockItems] = useState<any[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const[recentTransactions, setRecentTransactions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        DIContainer.reportQuery.getTransactionsByDateRange(startTimestamp, endTimestamp),
        DIContainer.reportQuery.getRevenueByCategory(startTimestamp, endTimestamp),
        DIContainer.reportQuery.getRevenueByPaymentMethod(startTimestamp, endTimestamp),
        DIContainer.reportQuery.getSalesTrends(startTimestamp, endTimestamp),
        DIContainer.reportQuery.getTopCustomers(startTimestamp, endTimestamp, 5),
        DIContainer.reportQuery.getLowStockItems(),
        DIContainer.reportQuery.getTransactionsByDateRange(sevenDaysAgoStart, todayEnd)
      ]);
      setTransactions(results[0]);
      setRevenueByCategory(results[1]);
      setRevenueByPaymentMethod(results[2]);
      setSalesTrends(results[3]);
      setTopCustomers(results[4]);
      setLowStockItems(results[5]);
      setRecentTransactions(results[6]);
    } catch (e) {
      logger.error("Failed to fetch dashboard data", { error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [startTimestamp, endTimestamp, sevenDaysAgoStart, todayEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const smartAlert = useMemo(() => {
    if (!recentTransactions) return null;
    
    let todayRevenue = 0;
    let last7DaysRevenue = 0;
    
    recentTransactions.forEach(tx => {
      if (tx.status !== 'SUCCESS') return;
      if (tx.date >= todayStart && tx.date <= todayEnd) {
        todayRevenue += tx.total;
      } else if (tx.date >= sevenDaysAgoStart && tx.date < todayStart) {
        last7DaysRevenue += tx.total;
      }
    });

    const avg7Days = last7DaysRevenue / 7;
    
    if (avg7Days === 0) {
      return { message: "Belum ada data historis yang cukup untuk perbandingan.", type: 'neutral', todayRevenue, avg7Days };
    }

    const diff = todayRevenue - avg7Days;
    const percentChange = (diff / avg7Days) * 100;

    if (percentChange > 0) {
      return { message: `Omzet hari ini naik ${percentChange.toFixed(1)}% dibandingkan rata-rata 7 hari terakhir.`, type: 'positive', todayRevenue, avg7Days, percentChange };
    } else if (percentChange < 0) {
      return { message: `Omzet hari ini turun ${Math.abs(percentChange).toFixed(1)}% dibandingkan rata-rata 7 hari terakhir.`, type: 'negative', todayRevenue, avg7Days, percentChange };
    } else {
      return { message: "Omzet hari ini sama dengan rata-rata 7 hari terakhir.", type: 'neutral', todayRevenue, avg7Days, percentChange };
    }
  },[recentTransactions, todayStart, todayEnd, sevenDaysAgoStart]);

  const stats = useMemo(() => {
    if (!transactions) return { totalRevenue: 0, totalTransactions: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.status === 'SUCCESS') {
        acc.totalRevenue += tx.total;
        acc.totalTransactions += 1;
      }
      return acc;
    }, { totalRevenue: 0, totalTransactions: 0 });
  }, [transactions]);

  const cashierPerformance = useMemo(() => {
    if (!transactions) return[];
    const cashierMap = new Map<string, number>();
    transactions.forEach(tx => {
      if (tx.status !== 'SUCCESS') return;
      cashierMap.set(tx.user, (cashierMap.get(tx.user) || 0) + tx.total);
    });
    return Array.from(cashierMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  return {
    loading,
    transactions,
    revenueByCategory,
    revenueByPaymentMethod,
    salesTrends,
    topCustomers,
    lowStockItems,
    smartAlert,
    stats,
    cashierPerformance,
    refetch: fetchData
  };
}
