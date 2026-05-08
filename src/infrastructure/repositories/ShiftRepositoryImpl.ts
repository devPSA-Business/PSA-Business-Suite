import { IShiftRepository, CloudShiftCheckResult } from '@domain/repositories/IShiftRepository';
import { Shift } from '@domain/models/Shift';
import { db, GoldBuyback } from '../../shared/api/db';
import { firestoreDb, isConfigValid } from '../../shared/api/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export class ShiftRepositoryImpl implements IShiftRepository {
  async hasOpenShift(): Promise<boolean> {
    const openShift = await db.shifts.where('status').equals('OPEN').first();
    return !!openShift;
  }

  async checkCloudForActiveShift(userId: string): Promise<CloudShiftCheckResult> {
    if (!navigator.onLine || !isConfigValid) {
      return { hasActiveShift: false, isOffline: true };
    }

    try {
      const shiftsRef = collection(firestoreDb, 'shifts');
      const q = query(shiftsRef, where('user', '==', userId), where('status', '==', 'OPEN'));
      
      // Implement 5-second timeout (Scenario 5 Fallback)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
      );

      const snapshot = await Promise.race([
        getDocs(q),
        timeoutPromise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any;

      return { hasActiveShift: !snapshot.empty };
    } catch (error) {
      console.warn('Failed to check cloud for active shift', error);
      if ((error instanceof Error ? error.message : String(error)) === 'TIMEOUT') {
        return { hasActiveShift: false, isTimeout: true };
      }
      return { hasActiveShift: false, isOffline: true }; // Treat other errors as offline/fail-open
    }
  }

  async getOpenShift(): Promise<Shift | null> {
    const record = await db.shifts.where('status').equals('OPEN').first();
    if (!record) return null;

    return Shift.create({
      startTime: record.startTime,
      startCash: record.startCash,
      endTime: record.endTime,
      endCash: record.endCash,
      expectedCash: record.expectedCash,
      status: record.status,
      userId: record.user,
    }, record.id);
  }

  async findById(id: string): Promise<Shift | null> {
    const record = await db.shifts.get(id);
    if (!record) return null;

    return Shift.create({
      startTime: record.startTime,
      startCash: record.startCash,
      endTime: record.endTime,
      endCash: record.endCash,
      expectedCash: record.expectedCash,
      status: record.status,
      userId: record.user,
    }, record.id);
  }

  async save(shift: Shift): Promise<void> {
    try {
      await db.shifts.put({
        id: shift.id,
        startTime: shift.startTime,
        startCash: shift.startCash,
        endTime: shift.endTime,
        endCash: shift.endCash,
        expectedCash: shift.expectedCash,
        status: shift.status,
        user: shift.userId,
      });
    } catch (error) {
      throw new Error('Gagal menyimpan data ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async calculateExpectedCash(shiftId: string): Promise<number> {
    const shift = await db.shifts.get(shiftId);
    if (!shift) throw new Error('Shift tidak ditemukan');

    let expectedCash = shift.startCash;
    const endTime = shift.endTime || Date.now();

    // [+] CASH IN: 1. Transaksi Ritel (Tunai)
    await db.transactions
      .where('sessionId').equals(shiftId)
      .filter(t => t.status === 'SUCCESS' && t.paymentMethod === 'CASH')
      .each(tx => { expectedCash += tx.total; });

    // [+] CASH IN: 2. Pendapatan Jasa/Reparasi (Tunai & Selesai)
    await db.repair_services
      .where('date').between(shift.startTime, endTime, true, true)
      .filter(r => (r.status === 'COMPLETED' || r.status === 'DELIVERED') && r.paymentMethod === 'CASH')
      .each(rs => { expectedCash += rs.price; });

    // [+] CASH IN: 3. Likuidasi Emas ke Pengepul (Tunai)
    // Berdasarkan ADR-008: liquidation menggunakan status 'sold_to_collector'
    await db.gold_buyback
      .filter(gb => gb.status === 'sold_to_collector' && gb.soldDate !== undefined && new Date(gb.soldDate).getTime() >= shift.startTime && new Date(gb.soldDate).getTime() <= endTime)
      // For now assume all sold items paid in CASH if not explicitly stated, or add soldPaymentMethod support.
      // Since we just added paymentMethod to LiquidationUseCase, we need to check it.
      .each(gb => { 
          // We only add to expected cash if it paid in CASH. Currently we'll assume soldPaymentMethod is stored, or default to CASH if checking cash injection from collector.
          // Wait, if it's transfer, we shouldn't add it to physical drawer. Assuming soldPaymentMethod is added.
          if ((gb as GoldBuyback).soldPaymentMethod !== 'TRANSFER') {
            expectedCash += (gb.soldPrice || 0); 
          }
      });

    // [-] CASH OUT: 1. Pengeluaran Kas Kecil (Petty Cash)
    await db.petty_cash
      .where('date').between(shift.startTime, endTime, true, true)
      .each(pc => { expectedCash -= pc.amount; });

    return expectedCash;
  }

  async incrementShiftSales(shiftId: string, addedCash: number, finalTotal: number): Promise<void> {
    const shiftTotal = await db.shift_totals.get(shiftId);
    if (shiftTotal) {
      await db.shift_totals.put({
        ...shiftTotal,
        cashIn: Math.round(shiftTotal.cashIn + addedCash),
        salesTotal: Math.round(shiftTotal.salesTotal + finalTotal),
        lastUpdatedAt: Date.now()
      });
    }
  }

  async revertShiftSales(shiftId: string, removedCash: number, voidAmount: number): Promise<void> {
    const shiftTotal = await db.shift_totals.get(shiftId);
    if (shiftTotal) {
      await db.shift_totals.put({
        ...shiftTotal,
        cashIn: Math.max(0, Math.round(shiftTotal.cashIn - removedCash)),
        salesTotal: Math.max(0, Math.round(shiftTotal.salesTotal - voidAmount)),
        lastUpdatedAt: Date.now()
      });
    }
  }
}
