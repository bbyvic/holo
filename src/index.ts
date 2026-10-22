import { loadConfig } from './config.ts';
import { Hotel } from './game/hotel.ts';
import { buildRouter } from './handlers/index.ts';
import { startServer } from './net/server.ts';
import { openStorage } from './storage/index.ts';
import { logger } from './util/logger.ts';

const log = logger('main');

async function main(): Promise<void> {
  const config = loadConfig();
  const storage = await openStorage(config);

  const hotel = new Hotel(storage, config);
  await hotel.preload();
  hotel.start();

  const router = buildRouter(hotel, storage);
  const server = startServer(config, router, {
    onDisconnect: (session) => hotel.removeFromRoom(session),
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`${signal} recibido, cerrando`);
    hotel.stop();
    await server.close();
    await storage.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  log.error('el servidor no pudo arrancar', error);
  process.exit(1);
});
