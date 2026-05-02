import { logger } from '@lib/logger';
import { IShiftRepository } from '@domain/repositories/IShiftRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { Shift } from '@domain/models/Shift';
import { db } from '@shared/api/db';

export interface OpenShiftRequestDTO {
  startCash: number;
  userId: string;
}

export interface OpenShiftResponseDTO {
  shiftId: string;
  warning?: string;
}

export class OpenShiftUseCase {
  constructor(
    private readonly shiftRepository: IShiftRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: OpenShiftRequestDTO): Promise<OpenShiftResponseDTO> {
    // 1.5 Check cloud for concurrent shift (Scenario 5) outside the transaction to avoid blocking
    let warning: string | undefined;
    if (!import.meta.env.DEV) {
      const cloudCheck = await this.shiftRepository.checkCloudForActiveShift(request.userId);
      
      if (cloudCheck.hasActiveShift) {
        throw new Error('Akun ini sudah memiliki shift aktif di perangkat lain. Harap tutup shift tersebut sebelum membuka yang baru.');
      }

      if (cloudCheck.isOffline || cloudCheck.isTimeout) {
        warning = 'Shift dibuka dalam mode Offline/Terbatas. Pastikan tidak ada perangkat lain yang menggunakan akun ini secara bersamaan untuk menghindari konflik data.';
      }
    } else {
      logger.warn('Development mode: Skipping cloud shift checks');
    }

    const shiftId = await this.unitOfWork.execute(async () => {
      // 1. Check if there's already an open shift locally
      const hasOpenShift = await this.shiftRepository.hasOpenShift();
      if (hasOpenShift) {
        throw new Error('Shift lain masih terbuka di perangkat ini. Tutup shift sebelumnya terlebih dahulu.');
      }

      // 2. Create Domain Entity
      const shift = Shift.create({
        startCash: request.startCash,
        startTime: Date.now(),
        status: 'OPEN',
        userId: request.userId,
      });

      // 3. Persist Entity
      await this.shiftRepository.save(shift);

      // Create initial shift_totals document
      await db.shift_totals.put({
        id: shift.id,
        startTime: shift.startTime,
        openCash: shift.startCash,
        cashIn: 0,
        cashOut: 0,
        salesTotal: 0,
        buybackTotal: 0,
        pettyCashTotal: 0
      });

      // 4. Register Audit Log
      await this.unitOfWork.registerAudit(
        'OPEN_SHIFT',
        request.userId,
        `Membuka shift dengan modal awal Rp ${request.startCash.toLocaleString('id-ID')}${warning ? ' (OFFLINE MODE)' : ''}`
      );

      // 5. Register Sync Event
      await this.unitOfWork.registerSync('shifts', 'INSERT', {
        id: shift.id,
        startTime: shift.startTime,
        startCash: shift.startCash,
        status: shift.status,
        user: shift.userId,
      });

      return shift.id;
    }, ['shifts', 'shift_totals']);

    return { shiftId, warning };
  }
}
