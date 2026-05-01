import Decimal from 'decimal.js';

// Konfigurasi global untuk presisi (Rounding Half Up, 2 desimal untuk gram)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const MathUtils = {
  /** Menambahkan dua angka dengan presisi mutlak */
  add: (a: number | string, b: number | string): number => {
    return new Decimal(a || 0).plus(new Decimal(b || 0)).toNumber();
  },
  /** Mengurangkan dua angka dengan presisi mutlak */
  sub: (a: number | string, b: number | string): number => {
    return new Decimal(a || 0).minus(new Decimal(b || 0)).toNumber();
  },
  /** Mengalikan dua angka dengan presisi mutlak */
  mul: (a: number | string, b: number | string): number => {
    return new Decimal(a || 0).times(new Decimal(b || 0)).toNumber();
  },
  /** Membagi dua angka dengan presisi mutlak */
  div: (a: number | string, b: number | string): number => {
    return new Decimal(a || 0).dividedBy(new Decimal(b || 1)).toNumber();
  },
  /** Membulatkan ke 2 angka di belakang koma (Standar Gram Emas) */
  roundGram: (val: number | string): number => {
    return new Decimal(val || 0).toDecimalPlaces(2).toNumber();
  },
  /** Membulatkan ke integer (Standar Finansial Rupiah) */
  roundInt: (val: number | string): number => {
    return new Decimal(val || 0).toDecimalPlaces(0).toNumber();
  }
};
