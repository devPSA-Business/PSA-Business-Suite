/**
 * @ai_context: UseCase kalkulasi dan redeem poin loyalitas pelanggan toko perhiasan imitasi
 * @business_rule: Poin berbasis nilai transaksi. Redeem butuh konfirmasi Manager.
 * @security_tier: MEDIUM
 */
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { MathUtils } from '@shared/utils/decimalUtils';

export interface LoyaltyCalculationRequest {
  customerId: string;
  transactionAmount: number;
  pointsToRedeem: number;
  userId: string;
}

export interface LoyaltyCalculationResponse {
  netTotal: number;
  pointsEarned: number;
  pointsRedeemed: number;
  loyaltyDiscountAmount: number;
}

export class LoyaltyUseCase {
  private readonly POINTS_PER_IDR = 10000; // 1 point per Rp 10,000 spent
  private readonly IDR_PER_POINT = 100; // Rp 100 discount per point redeemed

  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async calculateAndApplyLoyalty(request: LoyaltyCalculationRequest): Promise<LoyaltyCalculationResponse> {
    const customer = await this.customerRepository.findById(request.customerId);
    if (!customer) {
      throw new Error('Customer not found for loyalty calculation.');
    }

    // 1. Calculate Redemption Discount
    const maxPointsNeeded = Math.ceil(MathUtils.div(request.transactionAmount, this.IDR_PER_POINT));
    const pointsRedeemed = Math.min(request.pointsToRedeem, customer.loyaltyPoints, maxPointsNeeded);
    const loyaltyDiscountAmount = MathUtils.roundInt(MathUtils.mul(pointsRedeemed, this.IDR_PER_POINT));
    const netTotal = Math.max(0, MathUtils.roundInt(MathUtils.sub(request.transactionAmount, loyaltyDiscountAmount)));

    // 2. Calculate Earned Points (based on net total after discount)
    const pointsEarned = Math.floor(MathUtils.div(netTotal, this.POINTS_PER_IDR));

    // 3. Update Customer Balance
    const newLoyaltyPoints = MathUtils.roundInt(
      MathUtils.add(MathUtils.sub(customer.loyaltyPoints, pointsRedeemed), pointsEarned)
    );

    await this.customerRepository.save(customer.update({ loyaltyPoints: newLoyaltyPoints }));

    // 4. Return results for transaction entity creation
    return {
      netTotal,
      pointsEarned,
      pointsRedeemed,
      loyaltyDiscountAmount
    };
  }
}
