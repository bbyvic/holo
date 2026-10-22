import type { WebSocket } from 'ws';
import { PacketDecoder } from '../protocol/codec.ts';
import type { ClientMessage } from '../protocol/incoming.ts';
import type { ServerMessage } from '../protocol/outgoing.ts';
import type { UserRecord } from '../storage/index.ts';
import type { Recipient } from '../game/room.ts';

let nextSessionId = 1;

/** Una conexión del cliente, con el usuario autenticado si ya pasó el login. */
export class Session implements Recipient {
  readonly id = nextSessionId++;
  readonly decoder = new PacketDecoder();
  user: UserRecord | null = null;
  roomId: number | null = null;
  /** Último pong, para cortar conexiones zombis. */
  lastSeen = Date.now();
  /**
   * Cola de procesamiento. Los handlers son asíncronos (van a la base de
   * datos), así que sin esto el cliente puede ganarle a su propio login: manda
   * el ticket y el InfoRetrieve juntos y el segundo llegaría antes de que el
   * primero termine. Encadenando las tareas, cada sesión procesa sus paquetes
   * en el orden en que los mandó.
   */
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly socket: WebSocket) {}

  get userId(): number {
    return this.user?.id ?? 0;
  }

  get authenticated(): boolean {
    return this.user !== null;
  }

  send(message: ServerMessage): void {
    if (this.socket.readyState !== this.socket.OPEN) return;
    this.socket.send(message.toBuffer());
  }

  /** Encola el procesamiento de un paquete detrás de los anteriores. */
  enqueue(task: () => void | Promise<void>): void {
    this.queue = this.queue.then(task).catch(() => {});
  }

  close(): void {
    this.socket.close();
  }
}

export type Handler = (session: Session, message: ClientMessage) => void | Promise<void>;
