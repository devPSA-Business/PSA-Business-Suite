export interface GoldLiquidationDTO {
  id?: string;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  fineWeight: number;
  cogs: number;
  goldContent: number;
  laborCost: number;
  marketPrice: number;
  totalPrice: number;
  status: 'SUCCESS' | 'VOIDED';
  userId: string;
  
  // Audit and idempotency fields
  idempotencyKey: string;
  createdBy: string;
  createdAt: number;
  auditHash: string;
}
