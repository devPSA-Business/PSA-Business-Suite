import { StockCategory } from '../../domain/models/StockCategory';
import { MathUtils } from '../utils/decimalUtils';
import Decimal from 'decimal.js';

export class DbService {
  /**
   * @ai_context Perhitungan HPP stok gabungan menggunakan rata-rata bergerak.
   * @security_tier HIGH 
   * @business_rule JANGAN DIUBAH! Kalkulasi emas dan aksesoris (Moving Average) tidak 
   * boleh memiliki cacat koma. Pemanggilan harus mengembalikan nilai di-round ke Integer.
   * Jangan ganti `Decimal.ROUND_HALF_UP` atau menghilangkan `MathUtils`!
   */
  public static calculateMovingAverage(
    currentQty: number,
    currentCost: number,
    addedQty: number,
    addedCost: number
  ): number {
    // Guard against negative quantities from out-of-order sync events
    const validCurrentQty = currentQty < 0 ? 0 : currentQty;
    
    const totalQty = MathUtils.add(validCurrentQty, addedQty);
    if (totalQty <= 0) return addedCost;

    const totalValue = MathUtils.add(
      MathUtils.mul(validCurrentQty, currentCost),
      MathUtils.mul(addedQty, addedCost)
    );
    
    // Lakukan pembagian menggunakan Decimal.js dan bulatkan ke integer terdekat
    const newCost = new Decimal(totalValue).dividedBy(new Decimal(totalQty)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    return newCost;
  }

  /**
   * @ai_context Penentuan jenis inventarisasi HPP untuk komoditas perhiasan.
   * @business_rule Emas JANGAN DIGABUNG HPP-NYA! Specific Cost wajib dipakai.
   * Kategori yang mengembalikan True di sini akan mengabaikan kalkulasi Moving Average.
   */
  public static isSpecificIdentification(category: StockCategory): boolean {
    return category === StockCategory.GOLD_JEWELLERY || category === StockCategory.GOLD_BAR;
  }
}
