import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';

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
    return this.unitOfWork.execute(async () => {
      const customer = await this.customerRepository.findById(request.customerId);
      if (!customer) {
        throw new Error('Customer not found for loyalty calculation.');
      }

      // 1. Calculate Redemption Discount
      const availablePoints = customer.loyaltyPoints;
      const maxPointsNeeded = Math.ceil(request.transactionAmount / this.IDR_PER_POINT);
      const pointsRedeemed = Math.min(request.pointsToRedeem, availablePoints, maxPointsNeeded);
      const loyaltyDiscountAmount = pointsRedeemed * this.IDR_PER_POINT;
      const netTotal = Math.max(0, request.transactionAmount - loyaltyDiscountAmount);

      // 2. Calculate Earned Points (based on net total after discount)
      const pointsEarned = Math.floor(netTotal / this.POINTS_PER_IDR);

      // 3. Update Customer Balance
      const newLoyaltyPoints = availablePoints - pointsRedeemed + pointsEarned;
      await this.customerRepository.save(customer.update({ loyaltyPoints: newLoyaltyPoints }));

      // 4. Return results for transaction entity creation
      return {
        netTotal,
        pointsEarned,
        pointsRedeemed,
        loyaltyDiscountAmount
      };
    }, ['customers']);
  }
}
