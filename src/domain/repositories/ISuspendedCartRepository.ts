import { SuspendedCart } from '../models/SuspendedCart';

export interface ISuspendedCartRepository {
  save(cart: SuspendedCart): Promise<void>;
  getAll(): Promise<SuspendedCart[]>;
  getById(id: string): Promise<SuspendedCart | null>;
  delete(id: string): Promise<void>;
}
