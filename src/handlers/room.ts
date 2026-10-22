import { Incoming } from '../protocol/headers.ts';
import type { Router } from '../net/router.ts';
import type { Hotel } from '../game/hotel.ts';
import { logger } from '../util/logger.ts';
import * as compose from './composers.ts';

const log = logger('room');

export function registerRoom(router: Router, hotel: Hotel): void {
  router.on(Incoming.RequestRoomLoad, async (session, message) => {
    const roomId = message.int();
    const user = session.user;
    if (!user) return;

    const room = await hotel.room(roomId);
    if (!room) {
      session.send(compose.notification('Esa sala no existe.'));
      return;
    }
    if (room.isFull() && !room.unitOf(user.id)) {
      session.send(compose.notification('La sala está llena.'));
      return;
    }

    // Salir de la sala anterior antes de entrar a la nueva.
    hotel.removeFromRoom(session);

    session.roomId = room.id;
    session.send(compose.roomOpen(room.id));
    session.send(compose.roomModel(room));
    session.send(compose.roomPaint(room));
  });

  // El cliente avisa cuando terminó de dibujar el modelo: ahí mandamos el
  // contenido de la sala y creamos el avatar.
  router.on(Incoming.RoomModelReady, async (session) => {
    const user = session.user;
    if (!user || session.roomId === null) return;

    const room = await hotel.room(session.roomId);
    if (!room) return;

    session.send(compose.roomHeightMap(room));
    session.send(compose.floorItems(room));
    session.send(compose.wallItems(room));
    session.send(compose.roomEntryInfo(room, room.data.ownerId === user.id));

    const unit = room.enter(session, {
      userId: user.id,
      username: user.username,
      look: user.look,
      motto: user.motto,
      gender: user.gender,
    });

    // A quien entra, todos; a los que ya estaban, solo el nuevo.
    session.send(compose.roomUsers(room.allUnits()));
    session.send(compose.roomUserStatus(room.allUnits()));
    room.broadcast(compose.roomUsers([unit]), user.id);
    room.broadcast(compose.roomUserStatus([unit]), user.id);

    log.info(`${user.username} entró a la sala ${room.id} (${room.userCount} usuario/s)`);
  });

  router.on(Incoming.Move, async (session, message) => {
    const x = message.int();
    const y = message.int();
    if (session.roomId === null) return;

    const room = await hotel.room(session.roomId);
    const unit = room?.unitOf(session.userId);
    if (!room || !unit) return;
    if (!room.model.inBounds({ x, y })) return;

    room.walkTo(unit, { x, y });
  });

  router.on(Incoming.Sit, async (session) => {
    if (session.roomId === null) return;
    const room = await hotel.room(session.roomId);
    const unit = room?.unitOf(session.userId);
    if (!room || !unit || unit.isWalking) return;

    if (unit.status.sitting === undefined) unit.status.sitting = 0.5;
    else delete unit.status.sitting;

    room.broadcast(compose.roomUserStatus([unit]));
  });
}
