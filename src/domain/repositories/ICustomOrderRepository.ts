import { CustomOrder } from '../../shared/api/db';

export interface ICustomOrderRepository {
  save(order: CustomOrder): Promise<void>;
  findById(id: string): Promise<CustomOrder | null>;
  update(order: CustomOrder): Promise<void>;
}
