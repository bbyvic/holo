import type { OutgoingHeader } from './headers.ts';

/**
 * Escritor de paquetes salientes.
 *
 * Formato de trama, igual que el cliente de Habbo:
 *   int32 largo (cabecera + cuerpo) | int16 cabecera | cuerpo
 */
export class ServerMessage {
  private chunks: Buffer[] = [];

  constructor(readonly header: OutgoingHeader) {}

  int(value: number): this {
    const b = Buffer.allocUnsafe(4);
    b.writeInt32BE(value | 0, 0);
    this.chunks.push(b);
    return this;
  }

  short(value: number): this {
    const b = Buffer.allocUnsafe(2);
    b.writeInt16BE(value | 0, 0);
    this.chunks.push(b);
    return this;
  }

  byte(value: number): this {
    this.chunks.push(Buffer.from([value & 0xff]));
    return this;
  }

  bool(value: boolean): this {
    return this.byte(value ? 1 : 0);
  }

  string(value: string): this {
    const body = Buffer.from(value, 'utf8');
    this.short(body.length);
    this.chunks.push(body);
    return this;
  }

  /** Escribe el largo de la lista y delega cada elemento. */
  list<T>(values: readonly T[], write: (value: T, message: this) => void): this {
    this.int(values.length);
    for (const value of values) write(value, this);
    return this;
  }

  toBuffer(): Buffer {
    const body = Buffer.concat(this.chunks);
    const frame = Buffer.allocUnsafe(6 + body.length);
    frame.writeInt32BE(2 + body.length, 0);
    frame.writeInt16BE(this.header, 4);
    body.copy(frame, 6);
    return frame;
  }
}
