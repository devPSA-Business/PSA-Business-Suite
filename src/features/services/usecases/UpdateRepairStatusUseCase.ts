import { IRepairRepository } from '@domain/repositories/IRepairRepository';
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { ICommunicationService } from '@application/services/ICommunicationService';
import { IUnitOfWork } from '@application/core/IUnitOfWork';

export interface UpdateRepairStatusRequestDTO {
  id: string;
  newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED';
  userId: string;
}

export class UpdateRepairStatusUseCase {
  constructor(
    private readonly repairRepository: IRepairRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly communicationService: ICommunicationService,
    private readonly customerRepository: ICustomerRepository
  ) {}

  async execute(request: UpdateRepairStatusRequestDTO): Promise<{ success: boolean; whatsappUrl?: string }> {
    let whatsappUrl: string | undefined;

    await this.unitOfWork.execute(async () => {
      // 1. Get Existing Entity
      const existingRepair = await this.repairRepository.findById(request.id);
      if (!existingRepair) {
        throw new Error('Data reparasi tidak ditemukan');
      }

      const oldStatus = existingRepair.status;

      // 2. Update Domain Entity
      const updatedRepair = existingRepair.updateStatus(request.newStatus);

      // 3. Persist Entity
      await this.repairRepository.save(updatedRepair);

      // 4. Register Audit Log
      await this.unitOfWork.registerAudit(
        'UPDATE_REPAIR_STATUS',
        request.userId,
        `Mengubah status reparasi ${existingRepair.itemDescription} (${existingRepair.customerName}) dari ${existingRepair.status} menjadi ${request.newStatus}`
      );

      // 5. Register Sync Event
      await this.unitOfWork.registerSync('repair_services', 'UPDATE', {
        id: updatedRepair.id,
        status: updatedRepair.status,
      });

      // 6. Trigger Notification if status changed to COMPLETED
      if (request.newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
        try {
          // If we have a customerId, fetch their contact info
          if (updatedRepair.customerId) {
            const customer = await this.customerRepository.findById(updatedRepair.customerId);
            if (customer && customer.phoneNumber) {
              const result = await this.communicationService.sendMessage({
                to: customer.phoneNumber,
                message: `Halo ${customer.name}, reparasi ${updatedRepair.itemDescription} Anda telah SELESAI. Silakan ambil di toko. Terima kasih!`,
                type: 'WHATSAPP'
              });
              if (typeof result === 'string') {
                whatsappUrl = result;
              }
            }
          }
        } catch (error) {
          // Log error but don't fail the transaction
          console.error('[UpdateRepairStatusUseCase] Gagal mengirim notifikasi:', error);
        }
      }
    }, ['repair_services']);

    return { success: true, whatsappUrl };
  }
}
