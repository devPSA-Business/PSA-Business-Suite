import { Entity } from '../core/Entity';
import { StockCategory } from './StockCategory';

export interface StockItemProps {
  name: string;
  category: StockCategory;
  price: number;
  cost: number;
  quantity: number;
  barcode: string;
  weight?: number;
  karat?: number;
  specificCost?: number;
  version?: number;
  isDeleted?: boolean;
  branchId?: string;
  isStale?: boolean;
  is_shadow_hpp?: boolean; // Phase 1.1: Shadow HPP integration
}

/**
 * @ai_context Representasi tunggal item stok/barang dalam sistem.
 * @business_rule Barcode harus unik dan divalidasi saat pembuatan.
 */
export class StockItem extends Entity<StockItemProps> {
  public readonly name: string;
  public readonly category: StockCategory;
  public readonly price: number;
  public readonly cost: number;
  public readonly quantity: number;
  public readonly barcode: string;
  public readonly weight: number;
  public readonly karat: number;
  public readonly specificCost?: number;
  public version: number;
  public readonly isDeleted: boolean;
  public readonly branchId?: string;
  public readonly isStale: boolean;
  public readonly is_shadow_hpp?: boolean;

  private constructor(props: StockItemProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.name = props.name;
    this.category = props.category;
    this.price = props.price;
    this.cost = props.cost;
    this.quantity = props.quantity;
    this.barcode = props.barcode;
    this.weight = props.weight ?? 0;
    this.karat = props.karat ?? 0;
    this.specificCost = props.specificCost;
    this.version = props.version ?? 1;
    this.isDeleted = props.isDeleted ?? false;
    this.branchId = props.branchId;
    this.isStale = props.isStale ?? false;
    this.is_shadow_hpp = props.is_shadow_hpp;
  }

  public static create(props: StockItemProps, id?: string, createdAt?: number): StockItem {
    const generatedId = id || crypto.randomUUID();
    return new StockItem({ ...props, version: props.version ?? 1 }, generatedId, createdAt);
  }

  public update(props: Partial<StockItemProps>): StockItem {
    return new StockItem({
      ...this.toProps(),
      ...props
    }, this.id, this.createdAt);
  }

  public incrementVersion(): StockItem {
    return new StockItem({
      ...this.toProps(),
      version: (this.version || 0) + 1
    }, this.id, this.createdAt);
  }

  private toProps(): StockItemProps {
    return {
      name: this.name,
      category: this.category,
      price: this.price,
      cost: this.cost,
      quantity: this.quantity,
      barcode: this.barcode,
      weight: this.weight,
      karat: this.karat,
      specificCost: this.specificCost,
      version: this.version,
      isDeleted: this.isDeleted,
      branchId: this.branchId,
      isStale: this.isStale,
      is_shadow_hpp: this.is_shadow_hpp,
    };
  }
}
