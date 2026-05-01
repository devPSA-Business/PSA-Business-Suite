export abstract class Entity<T> {
  public readonly id: string;
  public readonly createdAt: number;

  constructor(id: string, createdAt?: number) {
    this.id = id;
    this.createdAt = createdAt || Date.now();
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!(object instanceof Entity)) {
      return false;
    }
    return this.id === object.id;
  }
}
