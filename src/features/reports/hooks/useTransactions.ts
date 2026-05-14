import { useState, useCallback, useEffect } from 'react';
import { DIContainer } from '@infrastructure/di/Container';
import { Transaction } from '../../../shared/api/db';

export const useTransactions = (startTimestamp: number, endTimestamp: number, cashier: string, paymentMethod: string) => {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [cashiers, setCashiers] = useState<string[] | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const txs = await DIContainer.reportQuery.getTransactionsByDateRange(startTimestamp, endTimestamp);
      const uniqueCashiers = Array.from(new Set(txs.map(t => t.user)));
      setCashiers(uniqueCashiers.sort());
      
      const filteredTxs = await DIContainer.reportQuery.getTransactionsByFilters({
        startDate: startTimestamp,
        endDate: endTimestamp,
        cashier: cashier || undefined,
        paymentMethod: paymentMethod || undefined
      });
      setTransactions(filteredTxs);
    } catch (e) {
      console.error("Failed to fetch transactions", e);
    }
  }, [startTimestamp, endTimestamp, cashier, paymentMethod]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, cashiers };
};
