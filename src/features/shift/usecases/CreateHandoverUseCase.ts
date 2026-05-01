import { IHandoverRepository } from '@domain/repositories/IHandoverRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { Handover } from '@domain/models/Handover';

export interface CreateHandoverRequestDTO {
  category: string;
  message: string;
  user: string;
}

export class CreateHandoverUseCase {
  constructor(
    private readonly handoverRepository: IHandoverRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: CreateHandoverRequestDTO): Promise<void> {
    return this.unitOfWork.execute(async () => {
      const handover = Handover.create({
        timestamp: Date.now(),
        category: request.category,
        message: request.message,
        user: request.user,
      });

      await this.handoverRepository.save(handover);
      
      await this.unitOfWork.registerAudit(
        'CREATE_HANDOVER',
        request.user,
        `Serah terima: ${request.category} - ${request.message}`
      );

      await this.unitOfWork.registerSync('handover', 'INSERT', { id: handover.id });
    }, ['handovers']);
  }
}
