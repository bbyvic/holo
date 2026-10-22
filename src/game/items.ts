import type { Point } from './model.ts';

export interface FurnitureDefinition {
  /** Id del sprite en el catálogo del cliente. */
  spriteId: number;
  name: string;
  /** Alto que agrega al tile cuando se puede pisar o sentar. */
  stackHeight: number;
  /** false = el avatar no puede atravesarlo. */
  walkable: boolean;
  sittable: boolean;
}

export interface FloorItem {
  id: number;
  definition: FurnitureDefinition;
  position: Point;
  /** Altura base del tile donde está apoyado. */
  z: number;
  rotation: number;
  state: string;
}

export interface WallItem {
  id: number;
  definition: FurnitureDefinition;
  /** Coordenada de pared en el formato del cliente, p. ej. ":w=2,3 l=4,5 l". */
  wallPosition: string;
  state: string;
}

/** Índice de los furnis del piso por tile, para que el pathfinder sea O(1). */
export class FurnitureMap {
  private byTile = new Map<string, FloorItem[]>();

  constructor(items: readonly FloorItem[] = []) {
    for (const item of items) this.add(item);
  }

  add(item: FloorItem): void {
    const id = key(item.position);
    const bucket = this.byTile.get(id);
    if (bucket) bucket.push(item);
    else this.byTile.set(id, [item]);
  }

  at(point: Point): readonly FloorItem[] {
    return this.byTile.get(key(point)) ?? [];
  }

  /** El furni más alto del tile, que es el que define si se pisa y a qué altura. */
  topAt(point: Point): FloorItem | null {
    let top: FloorItem | null = null;
    for (const item of this.at(point)) {
      const height = item.z + item.definition.stackHeight;
      if (!top || height > top.z + top.definition.stackHeight) top = item;
    }
    return top;
  }
}

function key(point: Point): string {
  return `${point.x}:${point.y}`;
}
