/** Un tile fuera del modelo (la "x" del heightmap de Habbo). */
export const VOID_TILE = -1;

export interface Point {
  x: number;
  y: number;
}

/**
 * Modelo de sala al estilo Habbo: filas de caracteres donde `x` es vacío,
 * `0`-`9` son alturas y `a`-`z` siguen desde 10.
 */
export class RoomModel {
  readonly width: number;
  readonly height: number;
  /** Altura por tile, indexada como [y * width + x]. */
  private readonly heights: Int8Array;

  constructor(
    rows: readonly string[],
    readonly door: Point,
    readonly doorDirection: number,
  ) {
    if (rows.length === 0) throw new Error('el modelo de sala no tiene filas');
    this.height = rows.length;
    this.width = Math.max(...rows.map((row) => row.length));
    this.heights = new Int8Array(this.width * this.height).fill(VOID_TILE);

    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        this.heights[y * this.width + x] = parseTile(row[x] ?? 'x');
      }
    });
  }

  static parse(map: string, door: Point, doorDirection = 2): RoomModel {
    const rows = map
      .trim()
      .split('\n')
      .map((row) => row.trim())
      .filter((row) => row.length > 0);
    return new RoomModel(rows, door, doorDirection);
  }

  inBounds({ x, y }: Point): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Altura del tile, o VOID_TILE si está fuera del modelo. */
  heightAt(point: Point): number {
    if (!this.inBounds(point)) return VOID_TILE;
    return this.heights[point.y * this.width + point.x] ?? VOID_TILE;
  }

  isOpen(point: Point): boolean {
    return this.heightAt(point) !== VOID_TILE;
  }
}

function parseTile(char: string): number {
  if (char === 'x' || char === 'X') return VOID_TILE;
  const digit = Number.parseInt(char, 10);
  if (Number.isInteger(digit)) return digit;

  const code = char.toLowerCase().charCodeAt(0) - 97;
  if (code >= 0 && code <= 25) return 10 + code;
  return VOID_TILE;
}
