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
    // P0-FINANCIAL: Math.ceil untuk integer point (bukan Rupiah), acceptable.
    // Math.min untuk comparison antar integer point — bukan kalkulasi Rupiah langsung.
    const maxPointsNeeded = Math.ceil(MathUtils.div(request.transactionAmount, this.IDR_PER_POINT));
    // Clamp pointsRedeemed ke minimum dari 3 nilai integer (points, bukan Rupiah)
    const rawRedeemable = Math.min(request.pointsToRedeem, customer.loyaltyPoints, maxPointsNeeded);
    const pointsRedeemed = rawRedeemable < 0 ? 0 : rawRedeemable;
    const loyaltyDiscountAmount = MathUtils.roundInt(MathUtils.mul(pointsRedeemed, this.IDR_PER_POINT));
    
    // P0-FINANCIAL: Gunakan MathUtils.sub lalu clamp ke 0 — dilarang Math.max untuk nilai Rupiah
    const afterLoyalty = MathUtils.sub(request.transactionAmount, loyaltyDiscountAmount);
    const netTotal = MathUtils.roundInt(afterLoyalty < 0 ? 0 : afterLoyalty);

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
