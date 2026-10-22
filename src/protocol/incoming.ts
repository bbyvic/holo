/** Lector de paquetes entrantes. El cuerpo llega ya sin largo ni cabecera. */
export class ClientMessage {
  private offset = 0;

  constructor(
    readonly header: number,
    private readonly body: Buffer,
  ) {}

  get remaining(): number {
    return this.body.length - this.offset;
  }

  int(): number {
    this.require(4);
    const value = this.body.readInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  short(): number {
    this.require(2);
    const value = this.body.readInt16BE(this.offset);
    this.offset += 2;
    return value;
  }

  byte(): number {
    this.require(1);
    return this.body.readUInt8(this.offset++);
  }

  bool(): boolean {
    return this.byte() === 1;
  }

  string(): string {
    const length = this.short();
    this.require(length);
    const value = this.body.toString('utf8', this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  private require(bytes: number): void {
    if (this.remaining < bytes) {
      throw new MalformedPacketError(
        `el paquete ${this.header} pide ${bytes} byte(s) y quedan ${this.remaining}`,
      );
    }
  }
}

export class MalformedPacketError extends Error {}
