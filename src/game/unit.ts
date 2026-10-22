import type { Point } from './model.ts';

/** Estados que el cliente dibuja a partir del paquete de status. */
export interface UnitStatus {
  /** Tile destino del paso en curso, si está caminando. */
  moving?: Point & { height: number };
  sitting?: number;
  laying?: number;
  dance: number;
  sign?: number;
}

/** Un avatar dentro de una sala. */
export class RoomUnit {
  /** Id de la unidad dentro de la sala (no es el id del usuario). */
  readonly virtualId: number;
  position: Point;
  height: number;
  headDirection: number;
  bodyDirection: number;
  status: UnitStatus = { dance: 0 };
  /** Tiles que faltan caminar, en orden. */
  path: Point[] = [];
  goal: Point | null = null;

  constructor(
    virtualId: number,
    readonly userId: number,
    readonly username: string,
    readonly look: string,
    readonly motto: string,
    readonly gender: 'M' | 'F',
    start: Point,
    height: number,
    direction: number,
  ) {
    this.virtualId = virtualId;
    this.position = { ...start };
    this.height = height;
    this.headDirection = direction;
    this.bodyDirection = direction;
  }

  get isWalking(): boolean {
    return this.path.length > 0;
  }

  /** Cadena de status que lee el cliente, p. ej. "mv 3,4,0.0/ sit 1.0/". */
  statusString(): string {
    const parts: string[] = [];
    if (this.status.moving) {
      const { x, y, height } = this.status.moving;
      parts.push(`mv ${x},${y},${height.toFixed(3)}`);
    }
    if (this.status.sitting !== undefined) parts.push(`sit ${this.status.sitting.toFixed(3)}`);
    if (this.status.laying !== undefined) parts.push(`lay ${this.status.laying.toFixed(3)}`);
    if (this.status.sign !== undefined) parts.push(`sign ${this.status.sign}`);
    return parts.length === 0 ? '/' : `${parts.join('/ ')}/`;
  }

  stop(): void {
    this.path = [];
    this.goal = null;
    delete this.status.moving;
  }
}
