import { Incoming } from '../protocol/headers.ts';
import type { Router } from '../net/router.ts';
import type { Hotel } from '../game/hotel.ts';
import type { Room } from '../game/room.ts';
import type { RoomUnit } from '../game/unit.ts';
import { directionTo } from '../game/pathfinder.ts';
import * as compose from './composers.ts';

/** Largo máximo de un mensaje de chat; el cliente corta parecido. */
const MAX_CHAT_LENGTH = 100;
/** Radio del susurro, en tiles. */
const WHISPER_RANGE = 6;

export function registerChat(router: Router, hotel: Hotel): void {
  router.on(Incoming.Chat, async (session, message) => {
    const text = clean(message.string());
    const found = await locate(hotel, session.roomId, session.userId);
    if (!found || text === '') return;
    found.room.broadcast(compose.chat(found.unit, text, 'say'));
  });

  router.on(Incoming.Shout, async (session, message) => {
    const text = clean(message.string());
    const found = await locate(hotel, session.roomId, session.userId);
    if (!found || text === '') return;
    found.room.broadcast(compose.chat(found.unit, text, 'shout'));
  });

  router.on(Incoming.Whisper, async (session, message) => {
    const raw = message.string();
    const found = await locate(hotel, session.roomId, session.userId);
    if (!found) return;

    const space = raw.indexOf(' ');
    if (space <= 0) return;
    const target = raw.slice(0, space);
    const text = clean(raw.slice(space + 1));
    if (text === '') return;

    const targetUnit = found.room
      .allUnits()
      .find((unit) => unit.username.toLowerCase() === target.toLowerCase());
    if (!targetUnit) {
      session.send(compose.notification(`${target} no está en la sala.`));
      return;
    }

    // Al que susurra se le gira la cabeza hacia el destinatario, como en Habbo.
    found.unit.headDirection = directionTo(found.unit.position, targetUnit.position);
    found.room.broadcastNear(
      compose.chat(found.unit, text, 'whisper'),
      targetUnit.position,
      WHISPER_RANGE,
    );
  });

  router.on(Incoming.Dance, async (session, message) => {
    const style = message.int();
    const found = await locate(hotel, session.roomId, session.userId);
    if (!found) return;

    found.unit.status.dance = style >= 0 && style <= 4 ? style : 0;
    found.room.broadcast(compose.userDance(found.unit, found.unit.status.dance));
  });

  router.on(Incoming.Wave, async (session) => {
    const found = await locate(hotel, session.roomId, session.userId);
    if (!found) return;
    found.room.broadcast(compose.userAction(found.unit, 1));
  });
}

async function locate(
  hotel: Hotel,
  roomId: number | null,
  userId: number,
): Promise<{ room: Room; unit: RoomUnit } | null> {
  if (roomId === null) return null;
  const room = await hotel.room(roomId);
  const unit = room?.unitOf(userId);
  return room && unit ? { room, unit } : null;
}

function clean(text: string): string {
  // Sin saltos de línea ni control: el cliente los renderiza mal.
  return text
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, MAX_CHAT_LENGTH);
}
