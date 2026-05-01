import { Entity } from '../core/Entity';
import { TransactionItem } from '../../shared/api/db';

export interface SuspendedCartProps {
  name: string;
  items: TransactionItem[];
  total: number;
  timestamp: number;
  user: string;
}

export class SuspendedCart extends Entity<SuspendedCartProps> {
  public readonly name: string;
  public readonly items: TransactionItem[];
  public readonly total: number;
  public readonly timestamp: number;
  public readonly user: string;

  private constructor(props: SuspendedCartProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.name = props.name;
    this.items = props.items;
    this.total = props.total;
    this.timestamp = props.timestamp;
    this.user = props.user;
    
    Object.freeze(this);
  }

  public static create(props: SuspendedCartProps, id?: string, createdAt?: number): SuspendedCart {
    const generatedId = id || crypto.randomUUID();
    return new SuspendedCart(props, generatedId, createdAt);
  }
}
