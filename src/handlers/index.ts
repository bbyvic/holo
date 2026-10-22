import { Incoming } from '../protocol/headers.ts';
import { Router } from '../net/router.ts';
import type { Hotel } from '../game/hotel.ts';
import type { Storage } from '../storage/index.ts';
import { registerHandshake } from './handshake.ts';
import { registerNavigator } from './navigator.ts';
import { registerRoom } from './room.ts';
import { registerChat } from './chat.ts';
import * as compose from './composers.ts';

export function buildRouter(hotel: Hotel, storage: Storage): Router {
  const router = new Router();
  router.on(Incoming.Ping, (session) => session.send(compose.pong()), { needsAuth: false });
  registerHandshake(router, storage);
  registerNavigator(router, hotel);
  registerRoom(router, hotel);
  registerChat(router, hotel);
  return router;
}
