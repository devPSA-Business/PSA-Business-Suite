/**
 * @ai_context: UseCase membuat data pelanggan baru
 * @business_rule: Nama dan HP wajib diisi. Data pelanggan disimpan lokal dulu lalu sync ke cloud.
 * @security_tier: HIGH
 */
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { Customer, CustomerProps } from '@domain/models/Customer';
import { IUnitOfWork } from '@application/core/IUnitOfWork';

export interface CreateCustomerRequestDTO extends Omit<CustomerProps, 'version' | 'loyaltyPoints'> {
  userId: string;
}

export class CreateCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: CreateCustomerRequestDTO): Promise<Customer> {
    return this.unitOfWork.execute(async () => {
      // 1. Create Domain Entity
      const customer = Customer.create({
        name: request.name,
        phoneNumber: request.phoneNumber,
        email: request.email,
        address: request.address,
        loyaltyPoints: 0,
      });

      // 2. Persist Entity
      const savedCustomer = await this.customerRepository.save(customer);

      // 3. Register Audit Log
      await this.unitOfWork.registerAudit(
        'CREATE_CUSTOMER',
        request.userId,
        `Mendaftarkan pelanggan baru: ${savedCustomer.name} (${savedCustomer.phoneNumber})`
      );

      // 4. Register Sync Event
      await this.unitOfWork.registerSync('customers', 'INSERT', {
        id: savedCustomer.id,
        name: savedCustomer.name,
        phoneNumber: savedCustomer.phoneNumber,
        secureData: savedCustomer.secureData, // Sync encrypted data
        createdAt: savedCustomer.createdAt,
        version: savedCustomer.version,
        branchId: savedCustomer.branchId,
      });

      return savedCustomer;
    }, ['customers']);
  }
}
