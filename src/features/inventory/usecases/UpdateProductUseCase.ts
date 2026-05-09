/**
 * @ai_context: UseCase update data produk (harga, stok, info perhiasan imitasi)
 * @business_rule: Version bump untuk conflict resolution. Perubahan harga masuk stock_history.
 * @security_tier: MEDIUM
 */
import { IStockRepository } from '@domain/repositories/IStockRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { StockCategory } from '@domain/models/StockCategory';
import { UserRole } from '@domain/models/User';

export interface UpdateProductRequestDTO {
  id: string;
  name: string;
  category: StockCategory;
  price: number;
  cost: number;
  barcode: string;
  userId: string;
  userRole: UserRole;
}

export class UpdateProductUseCase {
  constructor(
    private readonly stockRepository: IStockRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: UpdateProductRequestDTO): Promise<void> {
    // RBAC: Only MANAGER and ADMIN can update product details
    if (request.userRole === 'CASHIER') {
      throw new Error('Akses ditolak: Kasir tidak memiliki izin untuk memperbarui detail produk.');
    }

    return this.unitOfWork.execute(async () => {
      const existingItem = await this.stockRepository.findById(request.id);
      if (!existingItem) {
        throw new Error('Produk tidak ditemukan');
      }

      const updatedStock = existingItem.update({
        name: request.name,
        category: request.category,
        price: request.price,
        cost: request.cost,
        barcode: request.barcode,
      });

      await this.stockRepository.update(updatedStock);
      
      await this.unitOfWork.registerAudit(
        'UPDATE_PRODUCT',
        request.userId,
        `Memperbarui detail produk ${request.name} (${request.barcode})`
      );

      await this.unitOfWork.registerSync('stock', 'UPDATE', {
        id: updatedStock.id,
        name: updatedStock.name,
        category: updatedStock.category,
        price: updatedStock.price,
        cost: updatedStock.cost,
        barcode: updatedStock.barcode,
        version: updatedStock.version
      });
    }, ['stock']);
  }
}
