import { logger } from '../util/logger.ts';
import { MalformedPacketError } from '../protocol/incoming.ts';
import type { ClientMessage } from '../protocol/incoming.ts';
import type { Handler, Session } from './session.ts';

const log = logger('router');

/** Mapea cabecera de paquete a handler, y aisla los errores de cada uno. */
export class Router {
  private readonly handlers = new Map<number, { handler: Handler; needsAuth: boolean }>();

  on(header: number, handler: Handler, options: { needsAuth?: boolean } = {}): this {
    this.handlers.set(header, { handler, needsAuth: options.needsAuth ?? true });
    return this;
  }

  async dispatch(session: Session, message: ClientMessage): Promise<void> {
    const entry = this.handlers.get(message.header);
    if (!entry) {
      log.debug(`paquete sin handler: ${message.header}`);
      return;
    }
    if (entry.needsAuth && !session.authenticated) {
      log.warn(`sesión ${session.id} mandó ${message.header} sin autenticarse`);
      session.close();
      return;
    }

    try {
      await entry.handler(session, message);
    } catch (error) {
      if (error instanceof MalformedPacketError) {
        log.warn(`paquete inválido de la sesión ${session.id}: ${error.message}`);
        return;
      }
      log.error(`handler de ${message.header} falló`, error);
    }
  }
}
