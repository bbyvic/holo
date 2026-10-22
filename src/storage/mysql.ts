import mysql from 'mysql2/promise';
import type { Config } from '../config.ts';
import { RoomModel } from '../game/model.ts';
import type { FloorItem, FurnitureDefinition, WallItem } from '../game/items.ts';
import type { RoomData } from '../game/room.ts';
import type { Storage, UserRecord } from './types.ts';

interface UserRow {
  id: number;
  username: string;
  look: string;
  motto: string;
  gender: string;
  credits: number;
  rank: number;
  sso_ticket: string;
}

interface RoomRow {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  owner_name: string;
  max_users: number;
  model_map: string;
  door_x: number;
  door_y: number;
  door_direction: number;
  paint_floor: string;
  paint_wall: string;
  paint_landscape: string;
}

interface ItemRow {
  id: number;
  room_id: number;
  sprite_id: number;
  name: string;
  stack_height: number;
  walkable: number;
  sittable: number;
  x: number;
  y: number;
  z: number;
  rotation: number;
  state: string;
  wall_position: string | null;
}

/** Driver de MySQL/MariaDB. El esquema está en sql/schema.sql. */
export async function mysqlStorage(config: Config): Promise<Storage> {
  const pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    connectionLimit: 8,
    namedPlaceholders: true,
  });

  async function loadItems(roomId: number): Promise<{ floor: FloorItem[]; wall: WallItem[] }> {
    const [rows] = await pool.query<(ItemRow & mysql.RowDataPacket)[]>(
      'SELECT * FROM items WHERE room_id = :roomId',
      { roomId },
    );

    const floor: FloorItem[] = [];
    const wall: WallItem[] = [];
    for (const row of rows) {
      const definition: FurnitureDefinition = {
        spriteId: row.sprite_id,
        name: row.name,
        stackHeight: Number(row.stack_height),
        walkable: row.walkable === 1,
        sittable: row.sittable === 1,
      };
      if (row.wall_position) {
        wall.push({ id: row.id, definition, wallPosition: row.wall_position, state: row.state });
      } else {
        floor.push({
          id: row.id,
          definition,
          position: { x: row.x, y: row.y },
          z: Number(row.z),
          rotation: row.rotation,
          state: row.state,
        });
      }
    }
    return { floor, wall };
  }

  async function toRoomData(row: RoomRow): Promise<RoomData> {
    const items = await loadItems(row.id);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      maxUsers: row.max_users,
      model: RoomModel.parse(
        row.model_map,
        { x: row.door_x, y: row.door_y },
        row.door_direction,
      ),
      floorItems: items.floor,
      wallItems: items.wall,
      paint: {
        floor: row.paint_floor,
        wall: row.paint_wall,
        landscape: row.paint_landscape,
      },
    };
  }

  return {
    async userByTicket(ticket) {
      const [rows] = await pool.query<(UserRow & mysql.RowDataPacket)[]>(
        'SELECT * FROM users WHERE sso_ticket = :ticket LIMIT 1',
        { ticket },
      );
      const row = rows[0];
      if (!row) return null;
      const user: UserRecord = {
        id: row.id,
        username: row.username,
        look: row.look,
        motto: row.motto,
        gender: row.gender === 'F' ? 'F' : 'M',
        credits: row.credits,
        rank: row.rank,
        ssoTicket: row.sso_ticket,
      };
      return user;
    },

    async listRooms() {
      const [rows] = await pool.query<(RoomRow & mysql.RowDataPacket)[]>(
        'SELECT * FROM rooms ORDER BY id',
      );
      return Promise.all(rows.map(toRoomData));
    },

    async roomById(id) {
      const [rows] = await pool.query<(RoomRow & mysql.RowDataPacket)[]>(
        'SELECT * FROM rooms WHERE id = :id LIMIT 1',
        { id },
      );
      const row = rows[0];
      return row ? toRoomData(row) : null;
    },

    async close() {
      await pool.end();
    },
  };
}
