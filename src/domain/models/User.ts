export enum UserRole {
  CASHIER = 'CASHIER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pinHash: string;
  salt?: string | Uint8Array;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: number;
  branchId?: string;
}
