import { IRepairRepository } from '@domain/repositories/IRepairRepository';
import { RepairService } from '@domain/models/RepairService';
import { db } from '../../shared/api/db';

export class RepairRepositoryImpl implements IRepairRepository {
  async save(repair: RepairService): Promise<void> {
    await db.repair_services.put({
      id: repair.id,
      date: repair.createdAt,
      customerName: repair.customerName,
      phoneNumber: repair.phoneNumber,
      itemDescription: repair.itemDescription,
      serviceType: repair.serviceType,
      initialWeight: repair.initialWeight,
      price: repair.price,
      photoBeforeBlob: repair.photoBeforeBlob,
      photoBeforeBase64: repair.photoBeforeBase64,
      status: repair.status,
      paymentMethod: repair.paymentMethod,
      user: repair.userId,
      customerId: repair.customerId,
      branchId: repair.branchId || 'HQ',
    });
  }

  async findById(id: string): Promise<RepairService | null> {
    const record = await db.repair_services.get(id);
    if (!record) return null;

    return RepairService.create({
      customerName: record.customerName,
      phoneNumber: record.phoneNumber,
      itemDescription: record.itemDescription,
      serviceType: record.serviceType,
      initialWeight: record.initialWeight,
      price: record.price,
      photoBeforeBlob: record.photoBeforeBlob,
      photoBeforeBase64: record.photoBeforeBase64,
      status: record.status,
      paymentMethod: record.paymentMethod,
      userId: record.user,
      customerId: record.customerId,
      branchId: record.branchId || 'HQ',
    }, record.id, record.date);
  }

  async findAll(): Promise<RepairService[]> {
    const records = await db.repair_services.orderBy('date').reverse().toArray();
    return records.map(record => RepairService.create({
      customerName: record.customerName,
      phoneNumber: record.phoneNumber,
      itemDescription: record.itemDescription,
      serviceType: record.serviceType,
      initialWeight: record.initialWeight,
      price: record.price,
      photoBeforeBlob: record.photoBeforeBlob,
      photoBeforeBase64: record.photoBeforeBase64,
      status: record.status,
      paymentMethod: record.paymentMethod,
      userId: record.user,
      customerId: record.customerId,
      branchId: record.branchId || 'HQ',
    }, record.id, record.date));
  }
}
