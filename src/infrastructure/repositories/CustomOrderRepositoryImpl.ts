import { ICustomOrderRepository } from '../../domain/repositories/ICustomOrderRepository';
import { CustomOrder, db } from '../../shared/api/db';

export class CustomOrderRepositoryImpl implements ICustomOrderRepository {
  async save(order: CustomOrder): Promise<void> {
    try {
      await db.custom_orders.add(order);
    } catch (error) {
      throw new Error('Gagal menyimpan data pesanan kustom ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async findById(id: string): Promise<CustomOrder | null> {
    const record = await db.custom_orders.get(id);
    return record || null;
  }

  async update(order: CustomOrder): Promise<void> {
    try {
      await db.custom_orders.update(order.id, order);
    } catch (error) {
      throw new Error('Gagal memperbarui data pesanan kustom ke penyimpanan lokal. Pastikan memori perangkat tidak penuh. Detail: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}
