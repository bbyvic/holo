import { ClientMessage } from './incoming.ts';

/** Tamaño máximo de un paquete del cliente; más que esto es basura o un ataque. */
const MAX_PACKET_BYTES = 64 * 1024;

/**
 * Acumula bytes del socket y va entregando paquetes completos. TCP y los
 * frames de WebSocket pueden partir o pegar paquetes, así que el buffer
 * sobrevive entre llamadas.
 */
export class PacketDecoder {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): ClientMessage[] {
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);

    const messages: ClientMessage[] = [];
    while (this.buffer.length >= 4) {
      const length = this.buffer.readInt32BE(0);
      if (length < 2 || length > MAX_PACKET_BYTES) {
        throw new Error(`largo de paquete inválido: ${length}`);
      }
      if (this.buffer.length < 4 + length) break;

      const header = this.buffer.readInt16BE(4);
      const body = this.buffer.subarray(6, 4 + length);
      messages.push(new ClientMessage(header, Buffer.from(body)));
      this.buffer = this.buffer.subarray(4 + length);
    }
    return messages;
  }
}
