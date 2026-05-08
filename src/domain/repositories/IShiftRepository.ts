import { Shift } from '../models/Shift';

export type CloudShiftCheckResult = {
  hasActiveShift: boolean;
  isOffline?: boolean;
  isTimeout?: boolean;
};

export interface IShiftRepository {
  hasOpenShift(): Promise<boolean>;
  getOpenShift(): Promise<Shift | null>;
  save(shift: Shift): Promise<void>;
  calculateExpectedCash(shiftId: string): Promise<number>;
  findById(id: string): Promise<Shift | null>;
  checkCloudForActiveShift(userId: string): Promise<CloudShiftCheckResult>;
  incrementShiftSales(shiftId: string, addedCash: number, finalTotal: number): Promise<void>;
  revertShiftSales(shiftId: string, removedCash: number, voidAmount: number): Promise<void>;
}
