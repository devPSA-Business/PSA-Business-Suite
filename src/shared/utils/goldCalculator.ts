import { MathUtils } from './decimalUtils';

export const GoldCalculator = {
  calculatePGE: (netWeight: number, goldContent: number): number => {
    if (netWeight <= 0) throw new Error('Berat emas tidak boleh 0 atau negatif.');
    if (goldContent <= 0 || goldContent > 100) throw new Error('Kadar emas harus antara 1-100.');
    return MathUtils.mul(netWeight, MathUtils.div(goldContent, 100));
  },

  calculateLiquidationPrice: (
    netWeight: number,
    goldContent: number,
    marketPrice: number,
    laborCost: number
  ): number => {
    if (netWeight <= 0) throw new Error('Berat emas tidak boleh 0 atau negatif.');
    if (goldContent <= 0 || goldContent > 100) throw new Error('Kadar emas harus antara 1-100.');
    if (marketPrice <= 0) throw new Error('Harga pasar emas tidak valid.');
    if (laborCost < 0) throw new Error('Biaya jasa tidak boleh negatif.');

    const goldValue = MathUtils.mul(
      MathUtils.mul(netWeight, MathUtils.div(goldContent, 100)),
      marketPrice
    );

    const liquidationPrice = MathUtils.sub(goldValue, laborCost);

    if (liquidationPrice < 0) {
      throw new Error(`Harga likuidasi tidak valid (negatif). Biaya jasa (Rp ${laborCost.toLocaleString('id-ID')}) melebihi nilai emas (Rp ${goldValue.toLocaleString('id-ID')}).`);
    }

    return MathUtils.roundInt(liquidationPrice);
  }
};
