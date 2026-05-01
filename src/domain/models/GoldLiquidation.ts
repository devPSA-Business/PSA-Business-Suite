import { Entity } from '../core/Entity';

export interface GoldLiquidationProps {
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  fineWeight: number;
  cogs: number;
  goldContent: number;
  laborCost: number;
  marketPrice: number;
  totalPrice: number;
  paymentMethod: 'CASH' | 'TRANSFER';
  status: 'SUCCESS' | 'VOIDED';
  userId: string;
  isVoided?: boolean;
  voidReason?: string;
  authorizedBy?: string;
  isFlagged?: boolean;
  flagReason?: string;
  branchId?: string;
}

export class GoldLiquidation extends Entity<GoldLiquidationProps> {
  public readonly grossWeight: number;
  public readonly stoneWeight: number;
  public readonly netWeight: number;
  public readonly fineWeight: number;
  public readonly cogs: number;
  public readonly goldContent: number;
  public readonly laborCost: number;
  public readonly marketPrice: number;
  public readonly totalPrice: number;
  public readonly paymentMethod: 'CASH' | 'TRANSFER';
  public readonly status: 'SUCCESS' | 'VOIDED';
  public readonly userId: string;
  public readonly isVoided?: boolean;
  public readonly voidReason?: string;
  public readonly authorizedBy?: string;
  public readonly isFlagged?: boolean;
  public readonly flagReason?: string;
  public readonly branchId?: string;

  private constructor(props: GoldLiquidationProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.grossWeight = props.grossWeight;
    this.stoneWeight = props.stoneWeight;
    this.netWeight = props.netWeight;
    this.fineWeight = props.fineWeight;
    this.cogs = props.cogs;
    this.goldContent = props.goldContent;
    this.laborCost = props.laborCost;
    this.marketPrice = props.marketPrice;
    this.totalPrice = props.totalPrice;
    this.paymentMethod = props.paymentMethod;
    this.status = props.status;
    this.userId = props.userId;
    this.isVoided = props.isVoided;
    this.voidReason = props.voidReason;
    this.authorizedBy = props.authorizedBy;
    this.isFlagged = props.isFlagged;
    this.flagReason = props.flagReason;
    this.branchId = props.branchId;
    
    Object.freeze(this);
  }

  public static create(props: GoldLiquidationProps & { createdAt?: number }, id?: string): GoldLiquidation {
    if (props.netWeight < 0) {
      throw new Error('netWeight cannot be negative');
    }
    if (props.goldContent < 0 || props.goldContent > 100) {
      throw new Error('goldContent must be between 0 and 100');
    }
    if (props.totalPrice < 0) {
      throw new Error('totalPrice cannot be negative');
    }
    
    const generatedId = id || crypto.randomUUID();
    return new GoldLiquidation(props, generatedId, props.createdAt);
  }

  public voidTransaction(reason: string, authorizedBy: string): GoldLiquidation {
    return new GoldLiquidation(
      {
        ...this,
        status: 'VOIDED',
        isVoided: true,
        voidReason: reason,
        authorizedBy
      },
      this.id,
      this.createdAt
    );
  }

  public flagTransaction(reason: string): GoldLiquidation {
    return new GoldLiquidation(
      {
        ...this,
        isFlagged: true,
        flagReason: reason
      },
      this.id,
      this.createdAt
    );
  }
}
