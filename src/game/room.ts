import type { ServerMessage } from '../protocol/outgoing.ts';
import { FurnitureMap, type FloorItem, type WallItem } from './items.ts';
import { RoomModel, VOID_TILE, type Point } from './model.ts';
import { directionTo, findPath, type TileQuery } from './pathfinder.ts';
import { RoomUnit } from './unit.ts';

export interface RoomData {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  ownerName: string;
  maxUsers: number;
  model: RoomModel;
  floorItems: FloorItem[];
  wallItems: WallItem[];
  /** Pintura de piso/pared/paisaje, como la manda RoomPaint. */
  paint: { floor: string; wall: string; landscape: string };
}

/** Quien recibe los paquetes de la sala (un socket, o un espía en los tests). */
export interface Recipient {
  readonly userId: number;
  send(message: ServerMessage): void;
}

export class Room implements TileQuery {
  readonly furniture: FurnitureMap;
  private readonly units = new Map<number, RoomUnit>();
  private readonly recipients = new Map<number, Recipient>();
  private nextVirtualId = 1;

  constructor(readonly data: RoomData) {
    this.furniture = new FurnitureMap(data.floorItems);
  }

  get id(): number {
    return this.data.id;
  }

  get model(): RoomModel {
    return this.data.model;
  }

  get userCount(): number {
    return this.units.size;
  }

  get wallItems(): readonly WallItem[] {
    return this.data.wallItems;
  }

  allUnits(): readonly RoomUnit[] {
    return [...this.units.values()];
  }

  unitOf(userId: number): RoomUnit | undefined {
    return this.units.get(userId);
  }

  isFull(): boolean {
    return this.units.size >= this.data.maxUsers;
  }

  enter(recipient: Recipient, profile: Omit<EnterProfile, 'virtualId'>): RoomUnit {
    const door = this.model.door;
    const unit = new RoomUnit(
      this.nextVirtualId++,
      profile.userId,
      profile.username,
      profile.look,
      profile.motto,
      profile.gender,
      door,
      Math.max(this.model.heightAt(door), 0),
      this.model.doorDirection,
    );
    this.units.set(profile.userId, unit);
    this.recipients.set(profile.userId, recipient);
    return unit;
  }

  leave(userId: number): RoomUnit | undefined {
    const unit = this.units.get(userId);
    this.units.delete(userId);
    this.recipients.delete(userId);
    return unit;
  }

  /** Manda el paquete a todos los que están en la sala. */
  broadcast(message: ServerMessage, exceptUserId?: number): void {
    for (const recipient of this.recipients.values()) {
      if (recipient.userId === exceptUserId) continue;
      recipient.send(message);
    }
  }

  /** Manda el paquete solo a quien está parado dentro del rango (susurro). */
  broadcastNear(message: ServerMessage, origin: Point, tiles: number): void {
    for (const [userId, recipient] of this.recipients) {
      const unit = this.units.get(userId);
      if (!unit) continue;
      const far =
        Math.abs(unit.position.x - origin.x) > tiles ||
        Math.abs(unit.position.y - origin.y) > tiles;
      if (!far) recipient.send(message);
    }
  }

  /** Altura pisable del tile, o null si no se puede pisar. */
  heightAt(point: Point): number | null {
    const base = this.model.heightAt(point);
    if (base === VOID_TILE) return null;

    const top = this.furniture.topAt(point);
    if (top && !top.definition.walkable && !top.definition.sittable) return null;

    const occupied = [...this.units.values()].some(
      (unit) => unit.position.x === point.x && unit.position.y === point.y,
    );
    // El tile de la puerta no se bloquea: si no, nadie más puede entrar.
    if (occupied && !samePoint(point, this.model.door)) return null;

    return top ? top.z + top.definition.stackHeight : base;
  }

  /** Pide a una unidad que camine hacia un tile. Devuelve si encontró camino. */
  walkTo(unit: RoomUnit, target: Point): boolean {
    const path = findPath(unit.position, target, {
      // El tile propio siempre es pisable, aunque la unidad lo esté ocupando.
      heightAt: (point) => (samePoint(point, unit.position) ? 0 : this.heightAt(point)),
    });
    if (path.length === 0) {
      unit.stop();
      return false;
    }
    unit.path = path;
    unit.goal = target;
    delete unit.status.sitting;
    delete unit.status.laying;
    return true;
  }

  /**
   * Avanza un paso a cada unidad que esté caminando.
   *
   * Devuelve las unidades que cambiaron de status, para que el servidor mande
   * un solo paquete por tick en lugar de uno por paso.
   */
  tick(): RoomUnit[] {
    const changed: RoomUnit[] = [];

    for (const unit of this.units.values()) {
      // El paso anunciado en el tick anterior se concreta en este.
      if (unit.status.moving) {
        unit.position = { x: unit.status.moving.x, y: unit.status.moving.y };
        unit.height = unit.status.moving.height;
        delete unit.status.moving;
        changed.push(unit);
      }

      const next = unit.path.shift();
      if (!next) {
        if (unit.goal) {
          unit.goal = null;
          this.applySeat(unit);
          if (!changed.includes(unit)) changed.push(unit);
        }
        continue;
      }

      let height = this.heightAt(next);
      if (height === null) {
        // Alguien nos tapó el tile: recalculamos una vez hacia el mismo destino.
        const goal = unit.goal;
        unit.stop();
        if (goal && this.walkTo(unit, goal)) {
          const retry = unit.path.shift();
          if (!retry) continue;
          height = this.heightAt(retry);
          if (height === null) continue;
          this.stepTo(unit, retry, height);
          if (!changed.includes(unit)) changed.push(unit);
        }
        continue;
      }

      this.stepTo(unit, next, height);
      if (!changed.includes(unit)) changed.push(unit);
    }

    return changed;
  }

  private stepTo(unit: RoomUnit, next: Point, height: number): void {
    const direction = directionTo(unit.position, next);
    unit.bodyDirection = direction;
    unit.headDirection = direction;
    unit.status.moving = { x: next.x, y: next.y, height };
    delete unit.status.sitting;
    delete unit.status.laying;
  }

  /** Al terminar de caminar, sentarse si el tile tiene un furni para eso. */
  private applySeat(unit: RoomUnit): void {
    const top = this.furniture.topAt(unit.position);
    if (top?.definition.sittable) {
      unit.status.sitting = top.definition.stackHeight;
      unit.bodyDirection = top.rotation;
      unit.headDirection = top.rotation;
    }
  }
}

export interface EnterProfile {
  virtualId: number;
  userId: number;
  username: string;
  look: string;
  motto: string;
  gender: 'M' | 'F';
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}
