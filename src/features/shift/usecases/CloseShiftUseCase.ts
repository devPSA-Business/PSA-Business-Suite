import { IShiftRepository } from '@domain/repositories/IShiftRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { ISyncService } from '@application/services/ISyncService';
import { backupManager } from '@shared/utils/backupManager';

export interface CloseShiftRequestDTO {
  shiftId: string;
  endCash: number;
  userId: string;
}

export class CloseShiftUseCase {
  constructor(
    private readonly shiftRepository: IShiftRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly syncService: ISyncService
  ) {}

  async execute(request: CloseShiftRequestDTO): Promise<void> {
    return this.unitOfWork.execute(async () => {
      // 1. Get Existing Entity
      const existingShift = await this.shiftRepository.findById(request.shiftId);
      if (!existingShift) {
        throw new Error('Shift tidak ditemukan');
      }

      // 1.1 PROSEDUR HARDENING: AUTO-BACKUP LOKAL (Simpan di IndexedDB db.keyval)
      try {
        await backupManager.autoBackupLocal();
        await this.unitOfWork.registerAudit(
          'AUTO_BACKUP_SUCCESS',
          request.userId,
          `Backup otomatis lokal berhasil dibuat untuk shift ${request.shiftId}`
        );
      } catch (backupErr) {
        await this.unitOfWork.registerAudit(
          'AUTO_BACKUP_FAILED',
          request.userId,
          `Gagal membuat backup otomatis lokal: ${backupErr}`
        );
      }

      // 2. Calculate Expected Cash
      const expectedCash = await this.shiftRepository.calculateExpectedCash(request.shiftId);
      const discrepancy = request.endCash - expectedCash;

      // 3. Update Domain Entity
      const updatedShift = existingShift.close(request.endCash, expectedCash);

      // 4. Persist Entity
      await this.shiftRepository.save(updatedShift);

      // 5. Register Audit Log
      await this.unitOfWork.registerAudit(
        'CLOSE_SHIFT',
        request.userId,
        `Menutup shift. Saldo akhir: Rp ${request.endCash.toLocaleString('id-ID')}. Selisih: Rp ${discrepancy.toLocaleString('id-ID')}`,
        {
          userId: request.userId,
          entityId: request.shiftId,
          payloadDiff: JSON.stringify({
            endCash: request.endCash,
            expectedCash,
            discrepancy
          })
        }
      );

      // 6. Register Sync Event
      await this.unitOfWork.registerSync('shifts', 'UPDATE', {
        id: updatedShift.id,
        endTime: updatedShift.endTime,
        endCash: updatedShift.endCash,
        expectedCash: updatedShift.expectedCash,
        status: updatedShift.status,
      });

      // 7. FORCE SYNC & AUTO-BACKUP TRIGGER
      // Memaksa antrean sinkronisasi berjalan seketika setelah shift ditutup
      setTimeout(() => {
        this.syncService.processSyncQueue().catch(err => {
          console.error('[Auto-Backup] Gagal melakukan force sync saat tutup shift:', err);
        });
      }, 1000);

    }, ['shifts', 'shift_totals']);
  }
}
