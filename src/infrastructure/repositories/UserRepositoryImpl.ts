import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/models/User';
import { db } from '../../shared/api/db';

export class UserRepositoryImpl implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const userRecord = await db.users.get(id);
    if (!userRecord) return null;
    
    return {
      id: userRecord.id,
      name: userRecord.name,
      role: userRecord.role,
      pinHash: userRecord.pinHash,
      status: userRecord.status,
      createdAt: userRecord.createdAt,
      branchId: userRecord.branchId,
    };
  }

  async findByName(name: string): Promise<User | null> {
    const userRecord = await db.users.where('name').equals(name).first();
    if (!userRecord) return null;
    
    return {
      id: userRecord.id,
      name: userRecord.name,
      role: userRecord.role,
      pinHash: userRecord.pinHash,
      status: userRecord.status,
      createdAt: userRecord.createdAt,
      branchId: userRecord.branchId,
    };
  }

  async findAll(): Promise<User[]> {
    const userRecords = await db.users.toArray();
    return userRecords.map(record => ({
      id: record.id,
      name: record.name,
      role: record.role,
      pinHash: record.pinHash,
      status: record.status,
      createdAt: record.createdAt,
      branchId: record.branchId,
    }));
  }

  async save(user: User): Promise<void> {
    await db.users.put({
      id: user.id,
      name: user.name,
      pinHash: user.pinHash,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      branchId: user.branchId,
    });
  }

  async delete(name: string): Promise<void> {
    const user = await this.findByName(name);
    if(user) {
      await db.users.delete(user.id);
    }
  }
}
