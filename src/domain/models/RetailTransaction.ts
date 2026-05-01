import { Entity } from '../core/Entity';

export interface RetailTransactionItem {
  stockId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  unitCost?: number;
  isCustomItem?: boolean;
}

export interface RetailTransactionProps {
  total: number;
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' | 'SPLIT';
  items: RetailTransactionItem[];
  status: 'SUCCESS' | 'VOIDED';
  userId: string;
  sessionId?: string;
  customerId?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  loyaltyDiscountAmount?: number;
  manualDiscountAmount?: number;
  manualDiscountNote?: string;
  isVoided?: boolean;
  voidReason?: string;
  authorizedBy?: string;
  isFlagged?: boolean;
  flagReason?: string;
  branchId?: string;
}

export class RetailTransaction extends Entity<RetailTransactionProps> {
  public readonly total: number;
  public readonly paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' | 'SPLIT';
  public readonly items: RetailTransactionItem[];
  public readonly status: 'SUCCESS' | 'VOIDED';
  public readonly userId: string;
  public readonly sessionId?: string;
  public readonly customerId?: string;
  public readonly pointsEarned?: number;
  public readonly pointsRedeemed?: number;
  public readonly loyaltyDiscountAmount?: number;
  public readonly manualDiscountAmount?: number;
  public readonly manualDiscountNote?: string;
  public readonly isVoided?: boolean;
  public readonly voidReason?: string;
  public readonly authorizedBy?: string;
  public readonly isFlagged?: boolean;
  public readonly flagReason?: string;
  public readonly branchId?: string;

  private constructor(props: RetailTransactionProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.total = props.total;
    this.paymentMethod = props.paymentMethod;
    this.items = props.items;
    this.status = props.status;
    this.userId = props.userId;
    this.sessionId = props.sessionId;
    this.customerId = props.customerId;
    this.pointsEarned = props.pointsEarned || 0;
    this.pointsRedeemed = props.pointsRedeemed || 0;
    this.loyaltyDiscountAmount = props.loyaltyDiscountAmount || 0;
    this.manualDiscountAmount = props.manualDiscountAmount || 0;
    this.manualDiscountNote = props.manualDiscountNote;
    this.isVoided = props.isVoided;
    this.voidReason = props.voidReason;
    this.authorizedBy = props.authorizedBy;
    this.isFlagged = props.isFlagged;
    this.flagReason = props.flagReason;
    this.branchId = props.branchId;
    
    Object.freeze(this);
  }

  public static create(props: RetailTransactionProps, id?: string, createdAt?: number): RetailTransaction {
    if (props.total < 0) {
      throw new Error('total cannot be negative');
    }
    if (!props.items || props.items.length === 0) {
      throw new Error('Transaction must have at least one item');
    }
    
    const generatedId = id || crypto.randomUUID();
    return new RetailTransaction(props, generatedId, createdAt);
  }

  public voidTransaction(reason: string, authorizedBy: string): RetailTransaction {
    return new RetailTransaction(
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

  public flagTransaction(reason: string): RetailTransaction {
    return new RetailTransaction(
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
