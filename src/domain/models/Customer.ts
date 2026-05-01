import { Entity } from '../core/Entity';

export interface CustomerProps {
  name: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  version: number;
  isDeleted?: boolean;
  branchId?: string;
  secureData?: string;
}

export class Customer extends Entity<CustomerProps> {
  public readonly name: string;
  public readonly phoneNumber: string;
  public readonly email?: string;
  public readonly address?: string;
  public readonly loyaltyPoints: number;
  public readonly version: number;
  public readonly isDeleted: boolean;
  public readonly branchId?: string;
  public readonly secureData?: string;

  private constructor(props: CustomerProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.name = props.name;
    this.phoneNumber = props.phoneNumber;
    this.email = props.email;
    this.address = props.address;
    this.loyaltyPoints = props.loyaltyPoints;
    this.version = props.version;
    this.isDeleted = props.isDeleted ?? false;
    this.branchId = props.branchId;
    this.secureData = props.secureData;
    Object.freeze(this);
  }

  public static create(props: Omit<CustomerProps, 'version'>, id?: string, createdAt?: number): Customer {
    const generatedId = id || crypto.randomUUID();
    return new Customer({ ...props, version: 1 }, generatedId, createdAt);
  }

  public static reconstitute(props: CustomerProps, id: string, createdAt: number): Customer {
    return new Customer(props, id, createdAt);
  }

  public update(props: Partial<CustomerProps>): Customer {
    return new Customer({ ...this.toProps(), ...props, version: this.version + 1 }, this.id, this.createdAt);
  }
  
  private toProps(): CustomerProps {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      address: this.address,
      loyaltyPoints: this.loyaltyPoints,
      version: this.version,
      isDeleted: this.isDeleted,
      branchId: this.branchId,
      secureData: this.secureData
    };
  }
}
