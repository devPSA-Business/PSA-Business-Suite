import { Customer } from '../models/Customer';

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findAll(branchId?: string): Promise<Customer[]>;
  search(query: string, branchId?: string): Promise<Customer[]>;
  save(customer: Customer): Promise<Customer>;
  update(customer: Customer): Promise<Customer>;
  delete(id: string): Promise<void>;
}
