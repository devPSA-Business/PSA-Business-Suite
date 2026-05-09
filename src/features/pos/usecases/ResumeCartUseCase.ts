/**
 * @ai_context: UseCase resume transaksi yang di-suspend (held cart)
 * @business_rule: Maksimal 5 cart tersuspend. Resume otomatis bersihkan cart kadaluarsa.
 * @security_tier: LOW
 */
import { ISuspendedCartRepository } from '@domain/repositories/ISuspendedCartRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { SuspendedCart } from '@domain/models/SuspendedCart';

export class ResumeCartUseCase {
  constructor(
    private readonly suspendedCartRepository: ISuspendedCartRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(id: string, userId: string): Promise<SuspendedCart | null> {
    return this.unitOfWork.execute(async () => {
      const cart = await this.suspendedCartRepository.getById(id);
      if (!cart) {
        throw new Error('Keranjang tidak ditemukan');
      }

      await this.suspendedCartRepository.delete(id);
      
      await this.unitOfWork.registerAudit(
        'RESUME_CART',
        userId,
        `Melanjutkan keranjang: ${cart.name}`
      );

      return cart;
    }, ['suspended_carts']);
  }
}
