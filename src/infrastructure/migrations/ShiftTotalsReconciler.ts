import { db } from '../../shared/api/db';
import { logger } from '../../lib/logger';

export class ShiftTotalsReconciler {
  /**
   * Reconciles shift totals for any open shift that might have missing or incorrect data.
   * This handles the "Legacy Gap" from Sprint 1.3.5 updates.
   */
  static async reconcileActiveShiftTotals(): Promise<void> {
    try {
      const openShift = await db.shifts.where('status').equals('OPEN').first();
      if (!openShift) return;

      const existingTotal = await db.shift_totals.get(openShift.id);
      
      // If totals exist and have been updated recently, we might skip to avoid unnecessary load
      // However, for a hardening phase, we perform a mandatory check if lastUpdatedAt is missing
      if (existingTotal && existingTotal.lastUpdatedAt) {
        return; 
      }

      logger.info(`Reconciling shift totals for active shift: ${openShift.id}`);

      await db.transaction('rw', [db.shifts, db.shift_totals, db.transactions, db.repair_services, db.petty_cash, db.gold_buyback], async () => {
        const openShiftData = await db.shifts.get(openShift.id);
        if (!openShiftData) return;
        const startTime = openShiftData.startTime;

        // 1. Calculate Cash In (Transactions + Repairs)
        const transactions = await db.transactions
          .where('date').aboveOrEqual(startTime)
          .filter(t => t.status === 'SUCCESS')
          .toArray();
        
        const salesTotal = transactions.reduce((sum, t) => sum + t.total, 0);
        const cashInSales = transactions
          .filter(t => t.paymentMethod === 'CASH')
          .reduce((sum, t) => sum + t.total, 0);

        const repairs = await db.repair_services
          .where('date').aboveOrEqual(startTime)
          .filter(r => (r.status === 'COMPLETED' || r.status === 'DELIVERED') && r.paymentMethod === 'CASH')
          .toArray();
        const cashInRepairs = repairs.reduce((sum, r) => sum + r.price, 0);

        // 2. Calculate Cash Out (Petty Cash + Buyback)
        const pettyCashRecords = await db.petty_cash
          .where('date').aboveOrEqual(startTime)
          .toArray();
        const pettyCashTotal = pettyCashRecords.reduce((sum, pc) => sum + pc.amount, 0);

        const buybacks = await db.gold_buyback
          .where('date').aboveOrEqual(startTime)
          .toArray();
        const buybackTotal = buybacks.reduce((sum, b) => sum + b.buybackPrice, 0);

        // 3. Update shift_totals table
        await db.shift_totals.put({
          id: openShift.id,
          startTime: openShift.startTime,
          openCash: openShift.startCash,
          cashIn: cashInSales + cashInRepairs,
          cashOut: pettyCashTotal, // FASE 2: buyback dari kas terpisah
          salesTotal: salesTotal,
          buybackTotal: buybackTotal,
          pettyCashTotal: pettyCashTotal,
          lastUpdatedAt: Date.now()
        });
      });

      logger.info(`Shift totals reconciled successfully for shift ${openShift.id}`);
    } catch (error) {
      logger.error('Failed to reconcile shift totals:', { error: (error instanceof Error ? error.message : String(error)) || error });
    }
  }
}
