import type { Point } from './model.ts';

/** Diferencia de altura que un avatar puede subir de un tile al siguiente. */
export const MAX_STEP_UP = 1.5;

export interface TileQuery {
  /** Altura del tile, o null si no se puede pisar (vacío, ocupado, bloqueado). */
  heightAt(point: Point): number | null;
}

const NEIGHBOURS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

interface Node {
  point: Point;
  cost: number;
  estimate: number;
  parent: Node | null;
}

/**
 * A* sobre la grilla de la sala, con diagonales.
 *
 * Devuelve los tiles a caminar sin incluir el de salida; vacío si no hay
 * camino. Igual que en Habbo, una diagonal necesita que los dos tiles
 * ortogonales adyacentes también se puedan pisar (no se corta esquinas).
 */
export function findPath(from: Point, to: Point, tiles: TileQuery): Point[] {
  if (same(from, to)) return [];
  if (tiles.heightAt(to) === null) return [];

  const open: Node[] = [{ point: from, cost: 0, estimate: distance(from, to), parent: null }];
  const seen = new Map<string, number>([[key(from), 0]]);

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      const candidate = open[i]!;
      if (candidate.cost + candidate.estimate < open[best]!.cost + open[best]!.estimate) best = i;
    }
    const node = open.splice(best, 1)[0]!;

    if (same(node.point, to)) return rebuild(node);

    const height = tiles.heightAt(node.point);
    if (height === null) continue;

    for (const offset of NEIGHBOURS) {
      const next = { x: node.point.x + offset.x, y: node.point.y + offset.y };
      const nextHeight = tiles.heightAt(next);
      if (nextHeight === null) continue;
      if (nextHeight - height > MAX_STEP_UP) continue;

      const diagonal = offset.x !== 0 && offset.y !== 0;
      if (diagonal) {
        const sideA = { x: node.point.x + offset.x, y: node.point.y };
        const sideB = { x: node.point.x, y: node.point.y + offset.y };
        if (tiles.heightAt(sideA) === null || tiles.heightAt(sideB) === null) continue;
      }

      const cost = node.cost + (diagonal ? 1.4 : 1);
      const id = key(next);
      const known = seen.get(id);
      if (known !== undefined && known <= cost) continue;

      seen.set(id, cost);
      open.push({ point: next, cost, estimate: distance(next, to), parent: node });
    }
  }

  return [];
}

/** Dirección de Habbo (0 = norte, en sentido horario de a 45°). */
export function directionTo(from: Point, to: Point): number {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (dx === 0 && dy === -1) return 0;
  if (dx === 1 && dy === -1) return 1;
  if (dx === 1 && dy === 0) return 2;
  if (dx === 1 && dy === 1) return 3;
  if (dx === 0 && dy === 1) return 4;
  if (dx === -1 && dy === 1) return 5;
  if (dx === -1 && dy === 0) return 6;
  if (dx === -1 && dy === -1) return 7;
  return 0;
}

function rebuild(node: Node): Point[] {
  const path: Point[] = [];
  for (let current: Node | null = node; current?.parent; current = current.parent) {
    path.unshift(current.point);
  }
  return path;
}

function distance(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function same(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function key(point: Point): string {
  return `${point.x}:${point.y}`;
}
