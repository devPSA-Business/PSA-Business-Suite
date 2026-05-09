/**
 * @ai_context: UseCase buat order reparasi atau sepuh perhiasan
 * @business_rule: Catat item keluhan estimasi biaya dan berat awal. Status awal: RECEIVED.
 * @security_tier: MEDIUM
 */
import { IRepairRepository } from '@domain/repositories/IRepairRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { RepairService, RepairServiceProps } from '@domain/models/RepairService';

export type CreateRepairRequestDTO = Omit<RepairServiceProps, 'status'>;

export class CreateRepairUseCase {
  constructor(
    private readonly repairRepository: IRepairRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: CreateRepairRequestDTO): Promise<string> {
    if (!request.photoBeforeBlob && !request.photoBeforeBase64) {
      throw new Error('Foto bukti reparasi (Before) wajib dilampirkan.');
    }
    return this.unitOfWork.execute(async () => {
      // 1. Create Domain Entity
      const repair = RepairService.create({
        ...request,
        status: 'RECEIVED',
      });

      // 2. Persist Entity
      await this.repairRepository.save(repair);

      // 3. Register Audit Log
      await this.unitOfWork.registerAudit(
        'CREATE_REPAIR_SERVICE',
        request.userId,
        `Menerima jasa ${repair.serviceType} untuk pelanggan ${repair.customerName}. Berat awal: ${repair.initialWeight}g.`
      );

      // 4. Register Sync Event
      await this.unitOfWork.registerSync('repair_services', 'INSERT', {
        id: repair.id,
        date: repair.createdAt,
        customerName: repair.customerName,
        phoneNumber: repair.phoneNumber,
        itemDescription: repair.itemDescription,
        serviceType: repair.serviceType,
        initialWeight: repair.initialWeight,
        price: repair.price,
        photoBeforeBlob: repair.photoBeforeBlob,
        photoBeforeBase64: repair.photoBeforeBase64,
        status: repair.status,
        paymentMethod: repair.paymentMethod,
        user: repair.userId,
        customerId: repair.customerId,
      });

      return repair.id;
    }, ['repair_services']);
  }
}
