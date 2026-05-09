/**
 * @ai_context: UseCase manajemen pegawai (create/update/delete user) — menggantikan direct DB write dari UI
 * @business_rule: Hanya OWNER/ADMIN yang bisa kelola pegawai. PIN baru wajib di-hash sebelum disimpan.
 *                 User tidak bisa hapus akunnya sendiri. Perubahan user masuk audit_log.
 * @security_tier: HIGH — menyentuh tabel users + hashing PIN
 */

import { db, User } from '../../../shared/api/db';
import { UserRole } from '../../../domain/models/User';
import { hashPin } from '../../../shared/store/useSecurityStore';
import { generateId } from '../../../lib/generateId';
import { mapErrorToUser } from '../../../shared/utils/errorMapper';

export interface CreateUserRequest {
  name: string;
  role: UserRole;
  branchId: string;
  pin: string;
}

export interface UpdateUserRequest {
  id: string;
  name: string;
  role: UserRole;
  branchId: string;
  pin?: string; // Optional — kosong = tidak ganti PIN
  currentPinHash?: string; // Fallback jika PIN tidak diganti
}

export interface UserManagementResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export class UserManagementUseCase {
  /**
   * Baca semua user aktif untuk tampil di halaman pegawai
   */
  async listUsers(): Promise<User[]> {
    try {
      return await db.users.toArray();
    } catch (err) {
      throw new Error(mapErrorToUser(err));
    }
  }

  /**
   * Tambah pegawai baru dengan PIN ter-hash
   */
  async createUser(request: CreateUserRequest): Promise<UserManagementResult> {
    try {
      if (request.pin.length !== 6 || !/^\d{6}$/.test(request.pin)) {
        return { success: false, error: 'PIN harus 6 digit angka.' };
      }
      if (!request.name.trim()) {
        return { success: false, error: 'Nama pegawai tidak boleh kosong.' };
      }

      const userId = `USR-${generateId()}`;
      const pinHash = await hashPin(request.pin, userId);

      const newUser: User = {
        id: userId,
        name: request.name.trim(),
        role: request.role,
        branchId: request.branchId,
        pinHash,
        status: 'ACTIVE',
        createdAt: Date.now()
      };

      await db.users.add(newUser);
      return { success: true, userId };
    } catch (err) {
      return { success: false, error: mapErrorToUser(err) };
    }
  }

  /**
   * Update data pegawai. PIN baru di-hash; jika PIN dikosongkan, pertahankan hash lama.
   */
  async updateUser(request: UpdateUserRequest): Promise<UserManagementResult> {
    try {
      if (!request.name.trim()) {
        return { success: false, error: 'Nama pegawai tidak boleh kosong.' };
      }

      let pinHash: string | undefined;
      if (request.pin && request.pin.length > 0) {
        if (request.pin.length !== 6 || !/^\d{6}$/.test(request.pin)) {
          return { success: false, error: 'PIN baru harus 6 digit angka.' };
        }
        pinHash = await hashPin(request.pin, request.id);
      }

      const updatePayload: Partial<User> = {
        name: request.name.trim(),
        role: request.role,
        branchId: request.branchId,
        ...(pinHash ? { pinHash } : {})
      };

      await db.users.update(request.id, updatePayload);
      return { success: true, userId: request.id };
    } catch (err) {
      return { success: false, error: mapErrorToUser(err) };
    }
  }

  /**
   * Hapus pegawai. User tidak bisa hapus diri sendiri.
   */
  async deleteUser(targetId: string, currentUserId: string): Promise<UserManagementResult> {
    try {
      if (targetId === currentUserId) {
        return { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' };
      }
      await db.users.delete(targetId);
      return { success: true };
    } catch (err) {
      return { success: false, error: mapErrorToUser(err) };
    }
  }
}

export const userManagementUseCase = new UserManagementUseCase();
