import { Incoming } from '../protocol/headers.ts';
import type { Router } from '../net/router.ts';
import type { Storage } from '../storage/index.ts';
import { logger } from '../util/logger.ts';
import * as compose from './composers.ts';

const log = logger('handshake');

/** Login: ClientHello, ticket SSO y los paquetes de arranque del cliente. */
export function registerHandshake(router: Router, storage: Storage): void {
  router.on(
    Incoming.ClientHello,
    (session) => {
      session.send(compose.helloOk());
    },
    { needsAuth: false },
  );

  router.on(
    Incoming.SsoTicket,
    async (session, message) => {
      const ticket = message.string();
      if (session.authenticated) {
        session.close();
        return;
      }

      const user = await storage.userByTicket(ticket);
      if (!user) {
        log.warn(`sesión ${session.id} usó un ticket desconocido`);
        session.close();
        return;
      }

      session.user = user;
      log.info(`${user.username} (#${user.id}) autenticado en la sesión ${session.id}`);

      session.send(compose.authenticationOk());
      session.send(compose.userRights(user.rank));
      session.send(compose.navigatorSettings(0));
    },
    { needsAuth: false },
  );

  router.on(Incoming.InfoRetrieve, (session) => {
    if (session.user) session.send(compose.userObject(session.user));
  });
}
