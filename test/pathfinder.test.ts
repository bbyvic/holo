import { describe, expect, it } from 'vitest';
import { RoomModel, VOID_TILE, type Point } from '../src/game/model.ts';
import { directionTo, findPath } from '../src/game/pathfinder.ts';

function tilesOf(model: RoomModel) {
  return {
    heightAt: (point: Point) => {
      const height = model.heightAt(point);
      return height === VOID_TILE ? null : height;
    },
  };
}

describe('RoomModel', () => {
  it('parsea alturas en dígitos y letras, y la x como vacío', () => {
    const model = RoomModel.parse('0a9x', { x: 0, y: 0 });
    expect(model.heightAt({ x: 0, y: 0 })).toBe(0);
    expect(model.heightAt({ x: 1, y: 0 })).toBe(10);
    expect(model.heightAt({ x: 2, y: 0 })).toBe(9);
    expect(model.heightAt({ x: 3, y: 0 })).toBe(VOID_TILE);
  });

  it('trata lo que está fuera de la grilla como vacío', () => {
    const model = RoomModel.parse('00\n00', { x: 0, y: 0 });
    expect(model.inBounds({ x: 2, y: 0 })).toBe(false);
    expect(model.heightAt({ x: -1, y: 0 })).toBe(VOID_TILE);
  });
});

describe('findPath', () => {
  it('cruza en diagonal cuando el piso está libre', () => {
    const model = RoomModel.parse('000\n000\n000', { x: 0, y: 0 });
    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 2 }, tilesOf(model));
    expect(path).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('rodea un muro en lugar de atravesarlo', () => {
    const model = RoomModel.parse(
      `
      00000
      00x00
      00x00
      00000
      `,
      { x: 0, y: 0 },
    );
    const path = findPath({ x: 1, y: 1 }, { x: 3, y: 1 }, tilesOf(model));
    expect(path.length).toBeGreaterThan(0);
    expect(path.at(-1)).toEqual({ x: 3, y: 1 });
    expect(path.some((tile) => tile.x === 2 && (tile.y === 1 || tile.y === 2))).toBe(false);
  });

  it('no corta esquinas por el hueco entre dos bloqueos', () => {
    const model = RoomModel.parse(
      `
      0x0
      x00
      000
      `,
      { x: 0, y: 0 },
    );
    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, tilesOf(model));
    expect(path).toEqual([]);
  });

  it('devuelve vacío si el destino no se puede pisar', () => {
    const model = RoomModel.parse('00x', { x: 0, y: 0 });
    expect(findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, tilesOf(model))).toEqual([]);
  });

  it('no sube escalones más altos que MAX_STEP_UP', () => {
    const model = RoomModel.parse('05', { x: 0, y: 0 });
    expect(findPath({ x: 0, y: 0 }, { x: 1, y: 0 }, tilesOf(model))).toEqual([]);
  });

  it('devuelve vacío cuando el origen y el destino son el mismo tile', () => {
    const model = RoomModel.parse('00', { x: 0, y: 0 });
    expect(findPath({ x: 0, y: 0 }, { x: 0, y: 0 }, tilesOf(model))).toEqual([]);
  });
});

describe('directionTo', () => {
  it('mapea los ocho vecinos a las direcciones de Habbo', () => {
    const origin = { x: 5, y: 5 };
    expect(directionTo(origin, { x: 5, y: 4 })).toBe(0);
    expect(directionTo(origin, { x: 6, y: 5 })).toBe(2);
    expect(directionTo(origin, { x: 5, y: 6 })).toBe(4);
    expect(directionTo(origin, { x: 4, y: 4 })).toBe(7);
  });
});
