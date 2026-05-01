import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';

export class DeleteCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    return this.unitOfWork.execute(async () => {
      const existingCustomer = await this.customerRepository.findById(id);
      if (!existingCustomer) {
        throw new Error('Pelanggan tidak ditemukan');
      }

      // Lakukan Soft Delete
      const updatedCustomer = existingCustomer.update({ isDeleted: true });
      await this.customerRepository.update(updatedCustomer);

      // Catat di Audit Log
      await this.unitOfWork.registerAudit(
        'DELETE_CUSTOMER',
        userId,
        `Menghapus pelanggan (soft delete): ${existingCustomer.name} (${existingCustomer.phoneNumber})`
      );

      // Daftarkan event sinkronisasi ke Cloud
      await this.unitOfWork.registerSync('customers', 'UPDATE', {
        id: updatedCustomer.id,
        isDeleted: true,
        version: updatedCustomer.version
      });
    }, ['customers']);
  }
}
