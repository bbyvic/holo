import { WebSocketServer } from 'ws';
import type { Config } from '../config.ts';
import { logger } from '../util/logger.ts';
import type { Router } from './router.ts';
import { Session } from './session.ts';

const log = logger('server');

/** Cuánto puede estar callada una sesión antes de que la cortemos. */
const IDLE_TIMEOUT_MS = 60_000;

export interface GameServer {
  sessions(): readonly Session[];
  close(): Promise<void>;
}

export function startServer(
  config: Config,
  router: Router,
  hooks: { onDisconnect: (session: Session) => void },
): GameServer {
  const wss = new WebSocketServer({ host: config.host, port: config.port });
  const sessions = new Set<Session>();

  wss.on('connection', (socket, request) => {
    const session = new Session(socket);
    sessions.add(session);
    log.info(`sesión ${session.id} conectada desde ${request.socket.remoteAddress ?? '?'}`);

    socket.on('message', (data) => {
      session.lastSeen = Date.now();
      const chunk = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data as ArrayBuffer);

      let packets;
      try {
        packets = session.decoder.push(chunk);
      } catch (error) {
        log.warn(`sesión ${session.id} mandó datos corruptos`, error);
        session.close();
        return;
      }

      for (const packet of packets) session.enqueue(() => router.dispatch(session, packet));
    });

    socket.on('close', () => {
      sessions.delete(session);
      hooks.onDisconnect(session);
      log.info(`sesión ${session.id} desconectada`);
    });

    socket.on('error', (error) => log.warn(`socket de la sesión ${session.id} falló`, error));
  });

  wss.on('listening', () => log.info(`escuchando en ws://${config.host}:${config.port}`));

  const reaper = setInterval(() => {
    const now = Date.now();
    for (const session of sessions) {
      if (now - session.lastSeen > IDLE_TIMEOUT_MS) {
        log.info(`sesión ${session.id} sin actividad, se cierra`);
        session.close();
      }
    }
  }, IDLE_TIMEOUT_MS / 2);
  reaper.unref();

  return {
    sessions: () => [...sessions],
    close: () =>
      new Promise((resolve) => {
        clearInterval(reaper);
        for (const session of sessions) session.close();
        wss.close(() => resolve());
      }),
  };
}
