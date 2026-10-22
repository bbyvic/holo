import type { Config } from '../config.ts';
import type { Storage } from '../storage/index.ts';
import { logger } from '../util/logger.ts';
import type { Session } from '../net/session.ts';
import { roomUserRemove, roomUserStatus } from '../handlers/composers.ts';
import { Room } from './room.ts';

const log = logger('hotel');

/** Salas cargadas y el loop del juego. */
export class Hotel {
  private readonly rooms = new Map<number, Room>();
  private loop: NodeJS.Timeout | null = null;

  constructor(
    private readonly storage: Storage,
    private readonly config: Config,
  ) {}

  async preload(): Promise<void> {
    for (const data of await this.storage.listRooms()) {
      this.rooms.set(data.id, new Room(data));
    }
    log.info(`${this.rooms.size} sala(s) cargada(s)`);
  }

  loadedRooms(): readonly Room[] {
    return [...this.rooms.values()];
  }

  async room(id: number): Promise<Room | null> {
    const loaded = this.rooms.get(id);
    if (loaded) return loaded;

    const data = await this.storage.roomById(id);
    if (!data) return null;
    const room = new Room(data);
    this.rooms.set(id, room);
    return room;
  }

  /** Saca al usuario de su sala y avisa a los demás. */
  removeFromRoom(session: Session): void {
    if (session.roomId === null) return;
    const room = this.rooms.get(session.roomId);
    session.roomId = null;
    if (!room) return;

    const unit = room.leave(session.userId);
    if (unit) room.broadcast(roomUserRemove(unit.virtualId));
  }

  start(): void {
    if (this.loop) return;
    const interval = Math.max(50, Math.round(1000 / this.config.tps));
    this.loop = setInterval(() => this.tick(), interval);
    log.info(`loop del juego a ${this.config.tps} tick(s) por segundo`);
  }

  stop(): void {
    if (!this.loop) return;
    clearInterval(this.loop);
    this.loop = null;
  }

  private tick(): void {
    for (const room of this.rooms.values()) {
      if (room.userCount === 0) continue;
      try {
        const changed = room.tick();
        if (changed.length > 0) room.broadcast(roomUserStatus(changed));
      } catch (error) {
        log.error(`el tick de la sala ${room.id} falló`, error);
      }
    }
  }
}
