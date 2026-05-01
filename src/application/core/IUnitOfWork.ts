export interface IUnitOfWork {
  execute<T>(work: () => Promise<T>, tables: string[] | 'FULL_SCOPE'): Promise<T>;
  registerAudit(
    action: string, 
    user: string, 
    details: string, 
    extra?: {
      userId?: string;
      role?: string;
      entityId?: string;
      payloadDiff?: string;
      correlationId?: string;
    }
  ): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerSync(entityType: string, action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPDATE_DELTA', payload: Record<string, any>): Promise<void>;
  registerStockHistory(params: {
    stockId: string;
    action: 'ADD' | 'REMOVE' | 'UPDATE' | 'ADJUST';
    quantityChange: number;
    oldCost: number;
    newCost: number;
    newQuantity: number;
    user: string;
    details: string;
  }): Promise<void>;
  registerGoldAssetHistory(params: {
    action: 'BUYBACK' | 'SALE' | 'ADJUST' | 'LIQUIDATION';
    weightChange: number;
    newTotalWeight: number;
    user: string;
    details: string;
  }): Promise<void>;
}
