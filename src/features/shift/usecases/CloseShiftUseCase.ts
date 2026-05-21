/**
 * @ai_context Use case penutupan shift kasir harian.
 * @security_tier HIGH
 * @business_rule Shift hanya bisa ditutup jika ada shift aktif (status OPEN).
 *   Auto-backup lokal wajib dijalankan sebelum shift ditutup.
 *   Auto-prune data lama (> 90 hari) diinjeksikan ke workflow tutup shift.
 * @data-component-id: close-shift-usecase
 * @data-error-domain: shift
 * @changelog:
 *   2026-05-20 — P3: Inject archiveOldLogsAndEvents() ke workflow tutup shift
 *                    Prune berjalan async non-blocking setelah shift berhasil ditutup
 *                    Audit trail untuk hasil prune (berhasil/gagal)
 */
import { logger } from '@lib/logger';
import { IShiftRepository } from '@domain/repositories/IShiftRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { ISyncService } from '@application/services/ISyncService';
import { backupManager } from '@shared/utils/backupManager';
import { MathUtils } from '@shared/utils/decimalUtils';
import { mapErrorToUser } from '@shared/utils/errorMapper';
import { archiveOldLogsAndEvents } from '@shared/utils/dataArchiver';

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
    try {
      return await this.unitOfWork.execute(async () => {

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
        const discrepancy = MathUtils.sub(request.endCash, expectedCash);

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

        // 7. POST-SHIFT ASYNC TASKS (fire-and-forget, tidak menghalangi response ke UI)
        //    Dijalankan setelah UnitOfWork.execute() selesai agar tidak masuk dalam
        //    transaksi Dexie yang sama (Rule 6: Anti-TransactionInactiveError).
        setTimeout(() => {
          // 7a. Force Sync — dorong antrian sinkronisasi segera ke Firestore
          this.syncService.processSyncQueue().catch(err => {
            logger.error('[CloseShift] Gagal melakukan force sync saat tutup shift:', {
              error: err instanceof Error ? err.message : String(err)
            });
          });

          // 7b. Auto-Prune — bersihkan data lama (> 90 hari) yang sudah ter-sync
          //    Diinjeksikan sesuai P3 Remediation Plan: CloseShiftUseCase → archiveOldLogsAndEvents()
          //    Tidak dijalankan dalam transaksi Dexie (untuk menghindari TransactionInactiveError)
          archiveOldLogsAndEvents()
            .then(({ count }) => {
              if (count > 0) {
                logger.info(`[CloseShift] Auto-prune berhasil: ${count} records lama dibersihkan.`);
                // Audit untuk prune berhasil (UoW baru, di luar transaksi shift)
                this.unitOfWork.registerAudit(
                  'AUTO_PRUNE_SUCCESS',
                  request.userId,
                  `Auto-prune setelah tutup shift: ${count} data lama (> 90 hari) berhasil dibersihkan.`
                ).catch(auditErr => {
                  logger.warn('[CloseShift] Gagal mencatat audit auto-prune:', { error: String(auditErr) });
                });
              }
            })
            .catch(pruneErr => {
              logger.warn('[CloseShift] Auto-prune gagal (non-critical):', {
                error: pruneErr instanceof Error ? pruneErr.message : String(pruneErr)
              });
              // Audit untuk prune gagal
              this.unitOfWork.registerAudit(
                'AUTO_PRUNE_FAILED',
                request.userId,
                `Auto-prune gagal setelah tutup shift: ${pruneErr instanceof Error ? pruneErr.message : String(pruneErr)}`
              ).catch(() => { /* silent — jangan cascade error */ });
            });
        }, 1000); // Tunda 1 detik agar UoW komit selesai, transaksi Dexie benar-benar closed

      }, ['shifts', 'shift_totals']);
    } catch (error) {
      throw mapErrorToUser(error);
    }
  }
}
