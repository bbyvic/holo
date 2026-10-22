import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage } from '../src/storage/memory.ts';
import { Room, type Recipient } from '../src/game/room.ts';
import type { ServerMessage } from '../src/protocol/outgoing.ts';

/** Receptor de prueba que guarda las cabeceras que le llegaron. */
function spy(userId: number): Recipient & { headers: number[] } {
  const headers: number[] = [];
  return {
    userId,
    headers,
    send: (message: ServerMessage) => headers.push(message.header),
  };
}

async function lobby(): Promise<Room> {
  const storage = memoryStorage();
  const data = await storage.roomById(1);
  if (!data) throw new Error('falta la sala de demo');
  // memoryStorage() devuelve datos nuevos en cada llamada, así que no hay estado compartido.
  return new Room(data);
}

describe('Room', () => {
  let room: Room;

  beforeEach(async () => {
    room = await lobby();
  });

  it('pone al que entra en la puerta', () => {
    const unit = room.enter(spy(1), {
      userId: 1,
      username: 'Vic',
      look: 'hd-180-1',
      motto: '',
      gender: 'M',
    });
    expect(unit.position).toEqual(room.model.door);
    expect(room.userCount).toBe(1);
  });

  it('camina tile por tile, un paso por tick', () => {
    const unit = room.enter(spy(1), {
      userId: 1,
      username: 'Vic',
      look: 'hd-180-1',
      motto: '',
      gender: 'M',
    });
    const target = { x: 5, y: 3 };
    expect(room.walkTo(unit, target)).toBe(true);

    const start = { ...unit.position };
    room.tick();
    // El primer tick anuncia el paso; la posición cambia en el siguiente.
    expect(unit.status.moving).toBeDefined();
    expect(unit.position).toEqual(start);

    for (let i = 0; i < 10 && (unit.isWalking || unit.status.moving); i++) room.tick();
    expect(unit.position).toEqual(target);
    expect(unit.status.moving).toBeUndefined();
  });

  it('sienta al avatar cuando termina sobre una silla', () => {
    const unit = room.enter(spy(1), {
      userId: 1,
      username: 'Vic',
      look: 'hd-180-1',
      motto: '',
      gender: 'M',
    });
    expect(room.walkTo(unit, { x: 3, y: 4 })).toBe(true);
    for (let i = 0; i < 20 && (unit.isWalking || unit.status.moving); i++) room.tick();

    expect(unit.position).toEqual({ x: 3, y: 4 });
    expect(unit.status.sitting).toBe(1);
    expect(unit.statusString()).toBe('sit 1.000/');
  });

  it('no deja caminar sobre un furni que bloquea', () => {
    const unit = room.enter(spy(1), {
      userId: 1,
      username: 'Vic',
      look: 'hd-180-1',
      motto: '',
      gender: 'M',
    });
    // La mesa de (4,4) no es pisable ni para sentarse.
    expect(room.heightAt({ x: 4, y: 4 })).toBeNull();
    expect(room.walkTo(unit, { x: 4, y: 4 })).toBe(false);
    expect(unit.isWalking).toBe(false);
  });

  it('bloquea el tile ocupado por otro avatar, salvo la puerta', () => {
    const a = room.enter(spy(1), {
      userId: 1,
      username: 'Vic',
      look: 'hd-180-1',
      motto: '',
      gender: 'M',
    });
    room.walkTo(a, { x: 5, y: 3 });
    for (let i = 0; i < 20 && (a.isWalking || a.status.moving); i++) room.tick();

    expect(room.heightAt(a.position)).toBeNull();
    expect(room.heightAt(room.model.door)).not.toBeNull();
  });

  it('manda el broadcast a todos menos al excluido', () => {
    const one = spy(1);
    const two = spy(2);
    room.enter(one, { userId: 1, username: 'Vic', look: 'x', motto: '', gender: 'M' });
    const unit = room.enter(two, { userId: 2, username: 'Frank', look: 'x', motto: '', gender: 'M' });

    room.broadcast({ header: 1446 } as ServerMessage, unit.userId);
    expect(one.headers).toEqual([1446]);
    expect(two.headers).toEqual([]);
  });

  it('al salir libera el tile y el cupo', () => {
    const unit = room.enter(spy(1), {
      userId: 1,
      username: 'Vic',
      look: 'x',
      motto: '',
      gender: 'M',
    });
    expect(room.leave(unit.userId)).toBe(unit);
    expect(room.userCount).toBe(0);
    expect(room.unitOf(1)).toBeUndefined();
  });
});
