import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { IPettyCashRepository } from '@domain/repositories/IPettyCashRepository';
import { PettyCash, db } from '@shared/api/db';

export class RecordPettyCashUseCase {
  constructor(
    private pettyCashRepository: IPettyCashRepository,
    private unitOfWork: IUnitOfWork
  ) {}

  async execute(pettyCash: PettyCash): Promise<void> {
    await this.unitOfWork.execute(async () => {
      await this.pettyCashRepository.save(pettyCash);
      
      // Update shift_totals
      const openShift = await db.shifts.where('status').equals('OPEN').first();
      if (openShift) {
        const shiftTotal = await db.shift_totals.get(openShift.id);
        if (shiftTotal) {
          await db.shift_totals.put({
            ...shiftTotal,
            cashOut: shiftTotal.cashOut + pettyCash.amount,
            pettyCashTotal: shiftTotal.pettyCashTotal + pettyCash.amount,
            lastUpdatedAt: Date.now()
          });
        }
      }

      await this.unitOfWork.registerAudit(
        'RECORD_PETTY_CASH',
        pettyCash.user,
        `Mencatat pengeluaran kas: ${pettyCash.category} - Rp ${pettyCash.amount.toLocaleString('id-ID')}`,
        {
          userId: pettyCash.user,
          entityId: pettyCash.id,
          payloadDiff: JSON.stringify({
            category: pettyCash.category,
            amount: pettyCash.amount,
            description: pettyCash.description
          })
        }
      );
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.unitOfWork.registerSync('petty_cash', 'INSERT', pettyCash as any as Record<string, any>);
    }, ['petty_cash', 'shift_totals']);
  }
}
