/**
 * @ai_context: UseCase update profil pelanggan
 * @business_rule: Version bump wajib untuk deteksi conflict saat sync. PII tidak dikirim ke AI.
 * @security_tier: HIGH
 */
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { Customer, CustomerProps } from '@domain/models/Customer';
import { IUnitOfWork } from '@application/core/IUnitOfWork';

export interface UpdateCustomerRequestDTO extends Partial<CustomerProps> {
  id: string;
  userId: string;
}

export class UpdateCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: UpdateCustomerRequestDTO): Promise<Customer> {
    return this.unitOfWork.execute(async () => {
      // 1. Get Existing Entity
      const existingCustomer = await this.customerRepository.findById(request.id);
      if (!existingCustomer) {
        throw new Error('Pelanggan tidak ditemukan');
      }

      // 2. Update Domain Entity
      const updatedCustomer = existingCustomer.update({
        name: request.name,
        phoneNumber: request.phoneNumber,
        email: request.email,
        address: request.address,
        loyaltyPoints: request.loyaltyPoints,
      });

      // 3. Persist Entity
      const savedCustomer = await this.customerRepository.update(updatedCustomer);

      // 4. Register Audit Log
      await this.unitOfWork.registerAudit(
        'UPDATE_CUSTOMER',
        request.userId,
        `Memperbarui data pelanggan: ${savedCustomer.name} (${savedCustomer.phoneNumber})`
      );

      // 5. Register Sync Event
      await this.unitOfWork.registerSync('customers', 'UPDATE', {
        id: savedCustomer.id,
        name: savedCustomer.name,
        phoneNumber: savedCustomer.phoneNumber,
        secureData: savedCustomer.secureData, // Sync encrypted data
        version: savedCustomer.version,
        branchId: savedCustomer.branchId,
      });

      return savedCustomer;
    }, ['customers']);
  }
}
