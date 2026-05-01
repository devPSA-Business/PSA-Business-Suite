import { Entity } from '../core/Entity';

export interface HandoverProps {
  timestamp: number;
  category: string;
  message: string;
  user: string;
}

export class Handover extends Entity<HandoverProps> {
  public readonly timestamp: number;
  public readonly category: string;
  public readonly message: string;
  public readonly user: string;

  private constructor(props: HandoverProps, id: string, createdAt?: number) {
    super(id, createdAt);
    this.timestamp = props.timestamp;
    this.category = props.category;
    this.message = props.message;
    this.user = props.user;
    
    Object.freeze(this);
  }

  public static create(props: HandoverProps, id?: string, createdAt?: number): Handover {
    const generatedId = id || crypto.randomUUID();
    return new Handover(props, generatedId, createdAt);
  }
}
