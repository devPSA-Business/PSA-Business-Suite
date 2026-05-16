import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { Customer } from '../../domain/models/Customer';
import { db, Customer as DbCustomer } from '../../shared/api/db';
import { cryptoDB } from '../../lib/cryptoIndexedDB';
import { logger } from '../../lib/logger';

export class CustomerRepositoryImpl implements ICustomerRepository {
  private async mapToDomain(dbCust: DbCustomer): Promise<Customer> {
    let email = dbCust.email;
    let address = dbCust.address;
    let phoneNumber = dbCust.phoneNumber;

    // RBAC PII Masking: Hanya ADMIN dan MANAGER yang bisa melihat teks asli PII
    // Untuk Cashier/Staff, PII akan di-mask di level Repository agar tidak bocor ke UI.
    const { useAuthStore } = await import('../../shared/store/authStore');
    const { UserRole } = await import('../../domain/models/User');
    const currentUser = useAuthStore.getState().user;
    const canViewPII = currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER);

    if (dbCust.secureData) {
      try {
        const decrypted = await cryptoDB.decryptRecord(JSON.parse(dbCust.secureData));
        email = decrypted.email;
        address = decrypted.address;
      } catch (error) {
        logger.error('Failed to decrypt customer data', error);
      }
    }

    if (!canViewPII) {
      if (phoneNumber && phoneNumber.length > 4) {
        phoneNumber = phoneNumber.slice(0, 4) + '*'.repeat(phoneNumber.length - 6) + phoneNumber.slice(-2);
      }
      if (email) {
        const [userPart, domain] = email.split('@');
        if (userPart && domain) {
          email = userPart.charAt(0) + '*'.repeat(userPart.length - 1) + '@' + domain;
        } else {
          email = '***@***';
        }
      }
      if (address) {
        address = '<<PII_REMOVED>>';
      }
    }

    return Customer.reconstitute({
      name: dbCust.name,
      phoneNumber: phoneNumber,
      email: email,
      address: address,
      loyaltyPoints: dbCust.loyaltyPoints || 0,
      version: dbCust.version || 1,
      isDeleted: dbCust.isDeleted || false,
      branchId: dbCust.branchId || 'HQ',
      secureData: dbCust.secureData
    }, dbCust.id, dbCust.createdAt);
  }

  private async mapToDb(domainCust: Customer): Promise<DbCustomer> {
    let secureData = domainCust.secureData;
    let email = domainCust.email;
    let address = domainCust.address;

    // Encrypt sensitive fields if they exist
    if (email || address) {
      try {
        const encrypted = await cryptoDB.encryptRecord({ email, address });
        secureData = JSON.stringify(encrypted);
        // Clear plaintext for DB storage
        email = undefined;
        address = undefined;
      } catch (error) {
        logger.error('Failed to encrypt customer data', error);
      }
    }

    return {
      id: domainCust.id,
      name: domainCust.name,
      phoneNumber: domainCust.phoneNumber,
      email: email,
      address: address,
      createdAt: domainCust.createdAt,
      version: domainCust.version,
      loyaltyPoints: domainCust.loyaltyPoints,
      isDeleted: domainCust.isDeleted,
      branchId: domainCust.branchId || 'HQ',
      secureData: secureData
    };
  }

  async findById(id: string): Promise<Customer | null> {
    const customer = await db.customers.get(id);
    return customer ? this.mapToDomain(customer) : null;
  }

  async findAll(branchId?: string): Promise<Customer[]> {
    let query = db.customers.filter(c => !c.isDeleted);
    
    if (branchId && branchId !== 'HQ') {
      query = query.and(c => c.branchId === branchId);
    }

    const customers = await query.toArray();
    return Promise.all(customers.map(c => this.mapToDomain(c)));
  }

  async search(query: string, branchId?: string): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    let filterQuery = db.customers.filter(c => 
      !c.isDeleted && (
      c.name.toLowerCase().includes(lowerQuery) || 
      c.phoneNumber.includes(lowerQuery) ||
      (c.email?.toLowerCase().includes(lowerQuery) ?? false))
    );

    if (branchId && branchId !== 'HQ') {
      filterQuery = filterQuery.and(c => c.branchId === branchId);
    }

    const results = await filterQuery.toArray();
    return Promise.all(results.map(c => this.mapToDomain(c)));
  }

  async save(customer: Customer): Promise<Customer> {
    const dbData = await this.mapToDb(customer);
    await db.customers.add(dbData);
    return this.mapToDomain(dbData);
  }

  async update(customer: Customer): Promise<Customer> {
    const dbData = await this.mapToDb(customer);
    await db.customers.put(dbData);
    return this.mapToDomain(dbData);
  }

  async delete(id: string): Promise<void> {
    await db.customers.delete(id);
  }
}
