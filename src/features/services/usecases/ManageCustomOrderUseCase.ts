/**
 * @ai_context: UseCase kelola custom order perhiasan (pesanan khusus pelanggan)
 * @business_rule: Custom order tidak mengurangi stok langsung. Progress diupdate manual oleh Manager.
 * @security_tier: MEDIUM
 */
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { ICustomOrderRepository } from '@domain/repositories/ICustomOrderRepository';
import { CustomOrder } from '@shared/api/db';

export class ManageCustomOrderUseCase {
  constructor(
    private customOrderRepository: ICustomOrderRepository,
    private unitOfWork: IUnitOfWork
  ) {}

  async createOrder(order: CustomOrder): Promise<void> {
    await this.unitOfWork.execute(async () => {
      await this.customOrderRepository.save(order);
      
      await this.unitOfWork.registerAudit(
        'CREATE_CUSTOM_ORDER',
        order.user,
        `Membuat pesanan kustom baru untuk ${order.customerName}`
      );
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.unitOfWork.registerSync('custom_orders', 'INSERT', order as unknown as Record<string, unknown>);
    }, ['custom_orders']);
  }

  async markAsDone(id: string, userId: string): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const order = await this.customOrderRepository.findById(id);
      if (!order) {
        throw new Error('Pesanan tidak ditemukan');
      }

      order.status = 'DONE';
      await this.customOrderRepository.update(order);
      
      await this.unitOfWork.registerAudit(
        'COMPLETE_CUSTOM_ORDER',
        userId,
        `Menyelesaikan pesanan kustom untuk ${order.customerName}`
      );
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.unitOfWork.registerSync('custom_orders', 'UPDATE', order as unknown as Record<string, unknown>);
    }, ['custom_orders']);
  }
}
