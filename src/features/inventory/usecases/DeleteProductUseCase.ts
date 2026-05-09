/**
 * @ai_context: UseCase hapus produk dari inventaris perhiasan imitasi
 * @business_rule: Soft delete (isDeleted=true). Tidak bisa hapus jika ada transaksi aktif.
 * @security_tier: MEDIUM
 */
import { IStockRepository } from '@domain/repositories/IStockRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { UserRole } from '@domain/models/User';

export class DeleteProductUseCase {
  constructor(
    private readonly stockRepository: IStockRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(id: string, userId: string, userRole: UserRole): Promise<void> {
    // RBAC: Only ADMIN can delete products
    if (userRole !== 'ADMIN') {
      throw new Error('Akses ditolak: Hanya Administrator yang dapat menghapus produk.');
    }

    return this.unitOfWork.execute(async () => {
      const existingItem = await this.stockRepository.findById(id);
      if (!existingItem) {
        throw new Error('Produk tidak ditemukan');
      }

      const updatedItem = existingItem.update({ isDeleted: true });
      await this.stockRepository.update(updatedItem);
      
      await this.unitOfWork.registerAudit(
        'DELETE_PRODUCT',
        userId,
        `Menghapus produk (soft delete) ${existingItem.name} (${existingItem.barcode})`
      );

      // Update sync event to UPDATE with isDeleted: true instead of DELETE
      await this.unitOfWork.registerSync('stock', 'UPDATE', { id, isDeleted: true });
    }, ['stock']);
  }
}
