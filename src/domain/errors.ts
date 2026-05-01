export class VersionConflictError extends Error {
  constructor(message: string = 'Version conflict during update') {
    super(message);
    this.name = 'VersionConflictError';
  }
}

export class InsufficientStockError extends Error {
  public stockId?: string;
  public availableQuantity?: number;
  public requestedQuantity?: number;

  constructor(message: string = 'Stok tidak mencukupi', stockId?: string, availableQuantity?: number, requestedQuantity?: number) {
    super(message);
    this.name = 'InsufficientStockError';
    this.stockId = stockId;
    this.availableQuantity = availableQuantity;
    this.requestedQuantity = requestedQuantity;
  }
}

export class StalePriceError extends Error {
  constructor(message: string = 'Harga emas sudah usang (lebih dari 12 jam). Silakan perbarui harga atau minta otorisasi Manajer.') {
    super(message);
    this.name = 'StalePriceError';
  }
}
