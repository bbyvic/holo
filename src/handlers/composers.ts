import { Outgoing } from '../protocol/headers.ts';
import { ServerMessage } from '../protocol/outgoing.ts';
import { VOID_TILE } from '../game/model.ts';
import type { Room } from '../game/room.ts';
import type { RoomUnit } from '../game/unit.ts';
import type { UserRecord } from '../storage/index.ts';

export function helloOk(): ServerMessage {
  return new ServerMessage(Outgoing.HelloOk);
}

export function authenticationOk(): ServerMessage {
  return new ServerMessage(Outgoing.AuthenticationOk);
}

export function userObject(user: UserRecord): ServerMessage {
  return new ServerMessage(Outgoing.UserObject)
    .int(user.id)
    .string(user.username)
    .string(user.look)
    .string(user.gender)
    .string(user.motto)
    .string('')
    .bool(false)
    .int(user.credits)
    .int(0)
    .int(0)
    .bool(true)
    .bool(false)
    .string('')
    .string('')
    .bool(false)
    .bool(false);
}

export function userRights(rank: number): ServerMessage {
  return new ServerMessage(Outgoing.UserRights).int(rank >= 7 ? 7 : 2).int(rank).bool(rank >= 7);
}

export function navigatorSettings(homeRoomId: number): ServerMessage {
  return new ServerMessage(Outgoing.NavigatorSettings).int(homeRoomId).int(homeRoomId);
}

export function pong(): ServerMessage {
  return new ServerMessage(Outgoing.Pong);
}

export function notification(message: string): ServerMessage {
  return new ServerMessage(Outgoing.Notification).string('generic').list(
    [
      ['title', 'Hotel'],
      ['message', message],
    ] as const,
    ([key, value], packet) => packet.string(key).string(value),
  );
}

export function navigatorResults(
  searchCode: string,
  query: string,
  rooms: readonly Room[],
): ServerMessage {
  const message = new ServerMessage(Outgoing.NavigatorSearchResults).string(searchCode).string(query);
  // Un solo bloque de resultados con todas las salas.
  message.int(1).string('rooms').string('Salas').int(0).bool(false).int(0);
  return message.list(rooms, (room, packet) => {
    packet
      .int(room.id)
      .string(room.data.name)
      .int(room.data.ownerId)
      .string(room.data.ownerName)
      .int(0) // 0 = sala abierta
      .int(room.userCount)
      .int(room.data.maxUsers)
      .string(room.data.description)
      .int(0)
      .int(0)
      .int(0)
      .int(-1)
      .string('')
      .int(0)
      .int(0);
  });
}

export function roomOpen(roomId: number): ServerMessage {
  return new ServerMessage(Outgoing.RoomOpen).int(roomId).int(0);
}

export function roomModel(room: Room): ServerMessage {
  return new ServerMessage(Outgoing.RoomModel)
    .string(`model_${room.id}`)
    .int(room.id);
}

export function roomPaint(room: Room): ServerMessage {
  const { paint } = room.data;
  return new ServerMessage(Outgoing.RoomPaint)
    .string('floor')
    .string(paint.floor)
    .string('wallpaper')
    .string(paint.wall)
    .string('landscape')
    .string(paint.landscape);
}

/**
 * Heightmap: el cliente recibe una fila por línea, con `x` para el vacío y la
 * altura en base 36 para los tiles pisables.
 */
export function roomHeightMap(room: Room): ServerMessage {
  const { model } = room;
  const rows: string[] = [];
  for (let y = 0; y < model.height; y++) {
    let row = '';
    for (let x = 0; x < model.width; x++) {
      const height = model.heightAt({ x, y });
      row += height === VOID_TILE ? 'x' : height.toString(36);
    }
    rows.push(row);
  }
  return new ServerMessage(Outgoing.RoomHeightMap)
    .int(model.width)
    .int(model.width * model.height)
    .string(rows.join('\r'));
}

export function roomEntryInfo(room: Room, isOwner: boolean): ServerMessage {
  return new ServerMessage(Outgoing.RoomEntryInfo).int(room.id).bool(isOwner);
}

export function roomUsers(units: readonly RoomUnit[]): ServerMessage {
  return new ServerMessage(Outgoing.RoomUsers).list(units, (unit, packet) => {
    packet
      .int(unit.userId)
      .string(unit.username)
      .string(unit.motto)
      .string(unit.look)
      .int(unit.virtualId)
      .int(unit.position.x)
      .int(unit.position.y)
      .string(unit.height.toFixed(3))
      .int(0)
      .int(1) // 1 = avatar de usuario
      .string(unit.gender.toLowerCase())
      .int(-1)
      .int(-1)
      .string('')
      .int(0)
      .bool(false);
  });
}

export function roomUserStatus(units: readonly RoomUnit[]): ServerMessage {
  return new ServerMessage(Outgoing.RoomUserStatus).list(units, (unit, packet) => {
    packet
      .int(unit.virtualId)
      .int(unit.position.x)
      .int(unit.position.y)
      .string(unit.height.toFixed(3))
      .int(unit.headDirection)
      .int(unit.bodyDirection)
      .string(unit.statusString());
  });
}

export function roomUserRemove(virtualId: number): ServerMessage {
  return new ServerMessage(Outgoing.RoomUserRemove).string(String(virtualId));
}

export type ChatKind = 'say' | 'shout' | 'whisper';

export function chat(unit: RoomUnit, text: string, kind: ChatKind): ServerMessage {
  const header =
    kind === 'shout'
      ? Outgoing.RoomUserShout
      : kind === 'whisper'
        ? Outgoing.RoomUserWhisper
        : Outgoing.RoomUserChat;
  return new ServerMessage(header)
    .int(unit.virtualId)
    .string(text)
    .int(0) // gesto
    .int(0) // color de burbuja
    .int(0)
    .int(0);
}

export function userAction(unit: RoomUnit, action: number): ServerMessage {
  return new ServerMessage(Outgoing.RoomUserAction).int(unit.virtualId).int(action);
}

export function userDance(unit: RoomUnit, style: number): ServerMessage {
  return new ServerMessage(Outgoing.RoomUserDance).int(unit.virtualId).int(style);
}

export function floorItems(room: Room): ServerMessage {
  const message = new ServerMessage(Outgoing.RoomFloorItems);
  message.list([room.data.ownerName], (owner, packet) => packet.int(room.data.ownerId).string(owner));
  return message.list(room.data.floorItems, (item, packet) => {
    packet
      .int(item.id)
      .int(item.definition.spriteId)
      .int(item.position.x)
      .int(item.position.y)
      .int(item.rotation)
      .string(item.z.toFixed(3))
      .string(item.definition.stackHeight.toFixed(3))
      .int(0)
      .int(0)
      .string(item.state)
      .int(-1)
      .int(0)
      .int(room.data.ownerId);
  });
}

export function wallItems(room: Room): ServerMessage {
  const message = new ServerMessage(Outgoing.RoomWallItems);
  message.list([room.data.ownerName], (owner, packet) => packet.int(room.data.ownerId).string(owner));
  return message.list(room.wallItems, (item, packet) => {
    packet
      .string(String(item.id))
      .int(item.definition.spriteId)
      .string(item.wallPosition)
      .string(item.state)
      .int(-1)
      .int(0)
      .int(room.data.ownerId);
  });
}
