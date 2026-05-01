import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { IRetailRepository } from '@domain/repositories/IRetailRepository';

export interface FlagTransactionDTO {
  transactionId: string;
  reason: string;
  userId: string;
}

export class FlagTransactionUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly retailRepo: IRetailRepository
  ) {}

  async execute(dto: FlagTransactionDTO): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const transaction = await this.retailRepo.findById(dto.transactionId);
      if (!transaction) {
        throw new Error('Transaksi tidak ditemukan.');
      }

      const flaggedTransaction = transaction.flagTransaction(dto.reason);
      await this.retailRepo.save(flaggedTransaction);

      // Explicitly register audit
      if ('registerAudit' in this.unitOfWork) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.unitOfWork as any).registerAudit(
          'FLAG_RETAIL_TRANSACTION',
          dto.userId,
          `Flagging transaction ${dto.transactionId} over reason: ${dto.reason}`,
          { entityId: dto.transactionId }
        );
      }

      return flaggedTransaction;
    }, ['transactions']);
  }
}
