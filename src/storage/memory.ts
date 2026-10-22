import { RoomModel } from '../game/model.ts';
import type { RoomData } from '../game/room.ts';
import type { FurnitureDefinition } from '../game/items.ts';
import type { Storage, UserRecord } from './types.ts';

const CHAIR: FurnitureDefinition = {
  spriteId: 1,
  name: 'chair_basic',
  stackHeight: 1,
  walkable: false,
  sittable: true,
};

const TABLE: FurnitureDefinition = {
  spriteId: 2,
  name: 'table_basic',
  stackHeight: 1,
  walkable: false,
  sittable: false,
};

/**
 * Hotel de demo en memoria: arranca sin base de datos, con un usuario y un
 * par de salas. Útil para desarrollo y para los tests.
 */
export function memoryStorage(): Storage {
  const users: UserRecord[] = [
    {
      id: 1,
      username: 'Vic',
      look: 'hd-180-1.ch-210-66.lg-270-82.sh-290-91',
      motto: 'primer holo',
      gender: 'M',
      credits: 5000,
      rank: 7,
      ssoTicket: 'demo-ticket',
    },
    {
      id: 2,
      username: 'Frank',
      look: 'hd-180-2.ch-215-62.lg-285-77',
      motto: 'bienvenido al hotel',
      gender: 'M',
      credits: 0,
      rank: 1,
      ssoTicket: 'demo-ticket-2',
    },
  ];

  const lobby: RoomData = {
    id: 1,
    name: 'Lobby',
    description: 'La sala de entrada del hotel',
    ownerId: 1,
    ownerName: 'Vic',
    maxUsers: 25,
    model: RoomModel.parse(
      `
      xxxx000000xxxx
      xxxx000000xxxx
      0000000000xxxx
      0000000000xxxx
      0000000000xxxx
      0000000000xxxx
      00000000000000
      00000000000000
      `,
      { x: 5, y: 0 },
      4,
    ),
    floorItems: [
      { id: 1, definition: TABLE, position: { x: 4, y: 4 }, z: 0, rotation: 2, state: '0' },
      { id: 2, definition: CHAIR, position: { x: 3, y: 4 }, z: 0, rotation: 6, state: '0' },
      { id: 3, definition: CHAIR, position: { x: 5, y: 4 }, z: 0, rotation: 2, state: '0' },
    ],
    wallItems: [],
    paint: { floor: '101', wall: '201', landscape: '1.1' },
  };

  const plaza: RoomData = {
    id: 2,
    name: 'Plaza',
    description: 'Sala abierta para probar el pathfinding',
    ownerId: 1,
    ownerName: 'Vic',
    maxUsers: 50,
    model: RoomModel.parse(
      `
      0000000000
      0000000000
      0011110000
      0011110000
      0000000000
      0000000000
      `,
      { x: 0, y: 0 },
      2,
    ),
    floorItems: [],
    wallItems: [],
    paint: { floor: '110', wall: '203', landscape: '2.2' },
  };

  const rooms = [lobby, plaza];

  return {
    async userByTicket(ticket) {
      return users.find((user) => user.ssoTicket === ticket) ?? null;
    },
    async listRooms() {
      return rooms;
    },
    async roomById(id) {
      return rooms.find((room) => room.id === id) ?? null;
    },
    async close() {},
  };
}
