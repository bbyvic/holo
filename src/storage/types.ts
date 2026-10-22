import type { RoomData } from '../game/room.ts';

export interface UserRecord {
  id: number;
  username: string;
  look: string;
  motto: string;
  gender: 'M' | 'F';
  credits: number;
  rank: number;
  /** Ticket que el cliente manda al conectarse (lo emite la web del hotel). */
  ssoTicket: string;
}

export interface Storage {
  userByTicket(ticket: string): Promise<UserRecord | null>;
  listRooms(): Promise<RoomData[]>;
  roomById(id: number): Promise<RoomData | null>;
  close(): Promise<void>;
}
