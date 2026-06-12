import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User, UserRole } from '@domain/models/User';
import { IUnitOfWork } from '@application/core/IUnitOfWork';

/**
 * DTO untuk membuat user baru.
 * PIN sudah di-hash di UI layer (menggunakan hashPin dari useSecurityStore)
 * sebelum di-pass ke UseCase. UseCase tidak menerima raw PIN.
 */
export interface CreateUserDTO {
  id: string;
  name: string;
  role: UserRole;
  branchId: string;
  pinHash: string;
  salt?: string | Uint8Array;
  requestedBy: string; // userId dari operator (untuk audit log)
}

/**
 * DTO untuk update user.
 * Semua field opsional kecuali id dan requestedBy.
 * Jika pinHash diisi, salt WAJIB diisi juga.
 */
export interface UpdateUserDTO {
  id: string;
  name?: string;
  role?: UserRole;
  branchId?: string;
  pinHash?: string;
  salt?: string | Uint8Array;
  requestedBy: string;
}

/**
 * DTO untuk delete user.
 */
export interface DeleteUserDTO {
  id: string;
  requestedBy: string;
}

/**
 * ManageUserUseCase — Satu-satunya pintu masuk untuk operasi CRUD user/karyawan.
 *
 * Semua operasi di-wrap dalam UnitOfWork agar:
 * 1. Atomik (Dexie transaction)
 * 2. Tercatat di audit_logs (hash chain integrity)
 * 3. Di-enqueue ke sync_events untuk Firestore sync
 *
 * NT-01 Fix (Audit 2026-06-12): Menggantikan direct db.users.add/update/delete
 * dari EmployeesPage.tsx yang melanggar Clean Architecture.
 */
export class ManageUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  /**
   * Buat user/karyawan baru.
   * PIN harus sudah di-hash sebelum dipanggil.
   */
  async createUser(request: CreateUserDTO): Promise<User> {
    return this.unitOfWork.execute(async () => {
      // Validasi: nama tidak boleh duplikat
      const existing = await this.userRepository.findByName(request.name);
      if (existing) {
        throw new Error(`Pegawai dengan nama "${request.name}" sudah ada.`);
      }

      const newUser: User = {
        id: request.id,
        name: request.name,
        role: request.role,
        branchId: request.branchId,
        pinHash: request.pinHash,
        ...(request.salt ? { salt: request.salt } : {}),
        status: 'ACTIVE',
        createdAt: Date.now(),
      };

      await this.userRepository.save(newUser);

      await this.unitOfWork.registerAudit(
        'CREATE_USER',
        request.requestedBy,
        `Menambahkan pegawai baru: ${request.name} (${request.role})`,
        { entityId: newUser.id, role: request.role }
      );

      await this.unitOfWork.registerSync('users', 'INSERT', {
        id: newUser.id,
        name: newUser.name,
        role: newUser.role,
        branchId: newUser.branchId,
        status: newUser.status,
        createdAt: newUser.createdAt,
      });

      return newUser;
    }, ['users', 'audit_logs', 'sync_events']);
  }

  /**
   * Update data user/karyawan.
   * Untuk update PIN: kirim pinHash + salt baru (sudah di-hash di UI layer).
   */
  async updateUser(request: UpdateUserDTO): Promise<User> {
    return this.unitOfWork.execute(async () => {
      const existing = await this.userRepository.findById(request.id);
      if (!existing) {
        throw new Error(`Pegawai dengan ID "${request.id}" tidak ditemukan.`);
      }

      const updatedUser: User = {
        ...existing,
        ...(request.name !== undefined ? { name: request.name } : {}),
        ...(request.role !== undefined ? { role: request.role } : {}),
        ...(request.branchId !== undefined ? { branchId: request.branchId } : {}),
        ...(request.pinHash !== undefined ? { pinHash: request.pinHash } : {}),
        ...(request.salt !== undefined ? { salt: request.salt } : {}),
      };

      await this.userRepository.save(updatedUser);

      const changeDesc = [
        request.name ? `nama: ${request.name}` : null,
        request.role ? `role: ${request.role}` : null,
        request.pinHash ? 'PIN diperbarui' : null,
      ]
        .filter(Boolean)
        .join(', ');

      await this.unitOfWork.registerAudit(
        'UPDATE_USER',
        request.requestedBy,
        `Memperbarui pegawai: ${existing.name} — ${changeDesc || 'tidak ada perubahan'}`,
        { entityId: request.id, role: updatedUser.role }
      );

      await this.unitOfWork.registerSync('users', 'UPDATE', {
        id: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        branchId: updatedUser.branchId,
        status: updatedUser.status,
      });

      return updatedUser;
    }, ['users', 'audit_logs', 'sync_events']);
  }

  /**
   * Hapus user/karyawan secara permanen.
   * Validasi: tidak bisa hapus diri sendiri (harus dilakukan di caller).
   */
  async deleteUser(request: DeleteUserDTO): Promise<void> {
    return this.unitOfWork.execute(async () => {
      const existing = await this.userRepository.findById(request.id);
      if (!existing) {
        throw new Error(`Pegawai dengan ID "${request.id}" tidak ditemukan.`);
      }

      if (request.id === request.requestedBy) {
        throw new Error('Tidak dapat menghapus akun Anda sendiri.');
      }

      await this.userRepository.deleteById(request.id);

      await this.unitOfWork.registerAudit(
        'DELETE_USER',
        request.requestedBy,
        `Menghapus pegawai: ${existing.name} (${existing.role})`,
        { entityId: request.id, role: existing.role }
      );

      await this.unitOfWork.registerSync('users', 'DELETE', {
        id: request.id,
        name: existing.name,
        deletedAt: Date.now(),
      });
    }, ['users', 'audit_logs', 'sync_events']);
  }
}
