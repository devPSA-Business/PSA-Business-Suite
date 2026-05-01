import { ISuspendedCartRepository } from '@domain/repositories/ISuspendedCartRepository';
import { SuspendedCart } from '@domain/models/SuspendedCart';
import { db } from '../../shared/api/db';

export class SuspendedCartRepositoryImpl implements ISuspendedCartRepository {
  async save(cart: SuspendedCart): Promise<void> {
    await db.suspended_carts.add({
      id: cart.id,
      name: cart.name,
      items: cart.items,
      total: cart.total,
      timestamp: cart.timestamp,
      user: cart.user,
    });
  }

  async getAll(): Promise<SuspendedCart[]> {
    const records = await db.suspended_carts.toArray();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return records.map((record: any) => SuspendedCart.create({
      name: record.name,
      items: record.items,
      total: record.total,
      timestamp: record.timestamp,
      user: record.user,
    }, record.id));
  }

  async getById(id: string): Promise<SuspendedCart | null> {
    const record = await db.suspended_carts.get(id);
    if (!record) return null;
    return SuspendedCart.create({
      name: record.name,
      items: record.items,
      total: record.total,
      timestamp: record.timestamp,
      user: record.user,
    }, record.id);
  }

  async delete(id: string): Promise<void> {
    await db.suspended_carts.delete(id);
  }
}
