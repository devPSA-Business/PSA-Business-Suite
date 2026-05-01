import { Entity } from '../core/Entity';

export interface ShiftProps {
  startTime: number;
  startCash: number;
  endTime?: number;
  endCash?: number;
  expectedCash?: number;
  variance?: number;
  handoverNotes?: string;
  status: 'OPEN' | 'CLOSED';
  userId: string;
}

export class Shift extends Entity<ShiftProps> {
  public readonly startTime: number;
  public readonly startCash: number;
  public readonly endTime?: number;
  public readonly endCash?: number;
  public readonly expectedCash?: number;
  public readonly variance?: number;
  public readonly handoverNotes?: string;
  public readonly status: 'OPEN' | 'CLOSED';
  public readonly userId: string;

  private constructor(props: ShiftProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.startTime = props.startTime;
    this.startCash = props.startCash;
    this.endTime = props.endTime;
    this.endCash = props.endCash;
    this.expectedCash = props.expectedCash;
    this.variance = props.variance;
    this.handoverNotes = props.handoverNotes;
    this.status = props.status;
    this.userId = props.userId;
    
    Object.freeze(this);
  }

  public static create(props: ShiftProps, id?: string, createdAt?: number): Shift {
    if (props.startCash < 0) {
      throw new Error('Modal awal tidak boleh negatif.');
    }
    
    const generatedId = id || crypto.randomUUID();
    return new Shift(props, generatedId, createdAt);
  }

  public close(endCash: number, expectedCash: number, handoverNotes?: string): Shift {
    if (this.status === 'CLOSED') {
      throw new Error('Shift sudah ditutup.');
    }
    if (endCash < 0) {
      throw new Error('Saldo akhir tidak boleh negatif.');
    }

    return new Shift(
      {
        ...this,
        status: 'CLOSED',
        endTime: Date.now(),
        endCash,
        expectedCash,
        variance: endCash - expectedCash,
        handoverNotes,
      },
      this.id,
      this.createdAt
    );
  }
}
