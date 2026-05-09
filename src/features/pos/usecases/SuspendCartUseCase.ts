/**
 * @ai_context: UseCase suspend transaksi aktif untuk dilayani nanti
 * @business_rule: Cart tersuspend disimpan lokal dengan nama opsional. Tidak hilang saat restart.
 * @security_tier: LOW
 */
import { ISuspendedCartRepository } from '@domain/repositories/ISuspendedCartRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { SuspendedCart } from '@domain/models/SuspendedCart';
import { TransactionItem } from '@shared/api/db';

export interface SuspendCartRequestDTO {
  name: string;
  items: TransactionItem[];
  total: number;
  user: string;
}

export class SuspendCartUseCase {
  constructor(
    private readonly suspendedCartRepository: ISuspendedCartRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(request: SuspendCartRequestDTO): Promise<void> {
    return this.unitOfWork.execute(async () => {
      const cart = SuspendedCart.create({
        name: request.name,
        items: request.items,
        total: request.total,
        timestamp: Date.now(),
        user: request.user,
      });

      await this.suspendedCartRepository.save(cart);
      
      await this.unitOfWork.registerAudit(
        'SUSPEND_CART',
        request.user,
        `Menangguhkan keranjang: ${request.name}`
      );
    }, ['suspended_carts']);
  }
}
