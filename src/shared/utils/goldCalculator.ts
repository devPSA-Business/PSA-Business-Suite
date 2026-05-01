import { MathUtils } from './decimalUtils';

export const GoldCalculator = {
  calculatePGE: (netWeight: number, goldContent: number): number => {
    return MathUtils.mul(netWeight, MathUtils.div(goldContent, 100));
  },
  calculateLiquidationPrice: (netWeight: number, goldContent: number, marketPrice: number, laborCost: number): number => {
    const goldValue = MathUtils.mul(MathUtils.mul(netWeight, MathUtils.div(goldContent, 100)), marketPrice);
    return MathUtils.sub(goldValue, laborCost);
  }
};
