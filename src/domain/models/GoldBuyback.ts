import { Entity } from '../core/Entity';

export interface GoldBuybackProps {
  customerName: string;
  customerId?: string;
  weightGram: number;     // berat riil
  kadar: number;          // 0.375 | 0.585 | 0.750 | 0.916 | 0.999
  pricePerGram: number;   // harga acuan Antam
  margin: number;         // 0.05 - 0.12 dsb
  buybackPrice: number;   // auto-kalkulasi
  paymentMethod: 'CASH' | 'TRANSFER';
  cashSource: 'gold_cash'; // FASE 2: Mutlak dibayar dari kas emas (petty cash khusus)
  status: 'stored' | 'sold_to_collector';
  soldDate?: number;
  soldPrice?: number;
  soldPaymentMethod?: 'CASH' | 'TRANSFER';
  profitLoss?: number;
  notes?: string;
  userId: string;
  branchId?: string;
}

/**
 * @ai_context Representasi transaksi buyback emas dari pelanggan.
 * @business_rule Telah disesuaikan dengan ADR-008. Alur: Beli (Kas Emas) -> Simpan -> Jual ke Pengepul.
 */
export class GoldBuyback extends Entity<GoldBuybackProps> {
  public readonly customerName: string;
  public readonly customerId?: string;
  public readonly weightGram: number;
  public readonly kadar: number;
  public readonly pricePerGram: number;
  public readonly margin: number;
  public readonly buybackPrice: number;
  public readonly paymentMethod: 'CASH' | 'TRANSFER';
  public readonly cashSource: 'gold_cash';
  public readonly status: 'stored' | 'sold_to_collector';
  public readonly soldDate?: number;
  public readonly soldPrice?: number;
  public readonly soldPaymentMethod?: 'CASH' | 'TRANSFER';
  public readonly profitLoss?: number;
  public readonly notes?: string;
  public readonly userId: string;
  public readonly branchId?: string;

  private constructor(props: GoldBuybackProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.customerName = props.customerName;
    this.customerId = props.customerId;
    this.weightGram = props.weightGram;
    this.kadar = props.kadar;
    this.pricePerGram = props.pricePerGram;
    this.margin = props.margin;
    this.buybackPrice = props.buybackPrice;
    this.paymentMethod = props.paymentMethod;
    this.cashSource = props.cashSource;
    this.status = props.status;
    this.soldDate = props.soldDate;
    this.soldPrice = props.soldPrice;
    this.soldPaymentMethod = props.soldPaymentMethod;
    this.profitLoss = props.profitLoss;
    this.notes = props.notes;
    this.userId = props.userId;
    this.branchId = props.branchId;
    
    Object.freeze(this);
  }

  public static create(props: GoldBuybackProps, id?: string, createdAt?: number): GoldBuyback {
    if (props.weightGram < 0) {
      throw new Error('weightGram cannot be negative');
    }
    if (props.kadar < 0 || props.kadar > 1) {
      throw new Error('kadar must be a decimal between 0 and 1 (ex: 0.750)');
    }
    if (props.buybackPrice < 0) {
      throw new Error('buybackPrice cannot be negative');
    }
    if (!props.customerName || props.customerName.trim() === '') {
      throw new Error('customerName is required');
    }
    
    const generatedId = id || crypto.randomUUID();
    return new GoldBuyback(props, generatedId, createdAt);
  }

  public markAsSoldToCollector(soldDate: string | number, soldPrice: number, paymentMethod: 'CASH' | 'TRANSFER', notes?: string): GoldBuyback {
     return new GoldBuyback({
        customerName: this.customerName,
        customerId: this.customerId,
        weightGram: this.weightGram,
        kadar: this.kadar,
        pricePerGram: this.pricePerGram,
        margin: this.margin,
        buybackPrice: this.buybackPrice,
        paymentMethod: this.paymentMethod,
        cashSource: this.cashSource,
        userId: this.userId,
        branchId: this.branchId,
        status: 'sold_to_collector',
        soldDate: typeof soldDate === 'string' ? new Date(soldDate).getTime() : soldDate,
        soldPrice: soldPrice,
        soldPaymentMethod: paymentMethod,
        profitLoss: soldPrice - this.buybackPrice,
        notes: notes || this.notes
     }, this.id, this.createdAt);
  }
}
