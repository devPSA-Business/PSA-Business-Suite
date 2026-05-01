import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { Customer } from '../../domain/models/Customer';
import { db, Customer as DbCustomer } from '../../shared/api/db';
import { cryptoDB } from '../../lib/cryptoIndexedDB';

export class CustomerRepositoryImpl implements ICustomerRepository {
  private async mapToDomain(dbCust: DbCustomer): Promise<Customer> {
    let email = dbCust.email;
    let address = dbCust.address;

    if (dbCust.secureData) {
      try {
        const decrypted = await cryptoDB.decryptRecord(JSON.parse(dbCust.secureData));
        email = decrypted.email;
        address = decrypted.address;
      } catch (error) {
        console.error('Failed to decrypt customer data', error);
      }
    }

    return Customer.reconstitute({
      name: dbCust.name,
      phoneNumber: dbCust.phoneNumber,
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
        console.error('Failed to encrypt customer data', error);
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
