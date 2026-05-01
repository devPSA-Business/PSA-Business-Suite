import { Entity } from '../core/Entity';

export interface RepairServiceProps {
  customerName: string;
  phoneNumber: string;
  itemDescription: string;
  serviceType: 'REPARASI' | 'SEPUH';
  initialWeight: number;
  price: number;
  materialCost?: number;
  photoBeforeBlob?: Blob;
  photoBeforeBase64?: string;
  status: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED';
  paymentMethod: 'CASH' | 'TRANSFER' | 'QRIS';
  userId: string;
  customerId?: string;
  branchId?: string;
}

export class RepairService extends Entity<RepairServiceProps> {
  public readonly customerName: string;
  public readonly phoneNumber: string;
  public readonly itemDescription: string;
  public readonly serviceType: 'REPARASI' | 'SEPUH';
  public readonly initialWeight: number;
  public readonly price: number;
  public readonly materialCost?: number;
  public readonly photoBeforeBlob?: Blob;
  public readonly photoBeforeBase64?: string;
  public readonly status: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED';
  public readonly paymentMethod: 'CASH' | 'TRANSFER' | 'QRIS';
  public readonly userId: string;
  public readonly customerId?: string;
  public readonly branchId?: string;

  private constructor(props: RepairServiceProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.customerName = props.customerName;
    this.phoneNumber = props.phoneNumber;
    this.itemDescription = props.itemDescription;
    this.serviceType = props.serviceType;
    this.initialWeight = props.initialWeight;
    this.price = props.price;
    this.materialCost = props.materialCost;
    this.photoBeforeBlob = props.photoBeforeBlob;
    this.photoBeforeBase64 = props.photoBeforeBase64;
    this.status = props.status;
    this.paymentMethod = props.paymentMethod;
    this.userId = props.userId;
    this.customerId = props.customerId;
    this.branchId = props.branchId;
    
    Object.freeze(this);
  }

  public static create(props: RepairServiceProps, id?: string, createdAt?: number): RepairService {
    if (!props.initialWeight || props.initialWeight <= 0) {
      throw new Error('SOP Pelanggaran: Berat awal wajib diisi dan harus lebih dari 0.');
    }
    if (!props.photoBeforeBlob && !props.photoBeforeBase64) {
      throw new Error('SOP Pelanggaran: Foto barang (Before) wajib disertakan sebagai bukti.');
    }
    
    const generatedId = id || crypto.randomUUID();
    return new RepairService(props, generatedId, createdAt);
  }

  public updateStatus(newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED'): RepairService {
    return new RepairService(
      {
        ...this,
        status: newStatus
      },
      this.id,
      this.createdAt
    );
  }
}
