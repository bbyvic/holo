export type StorageKind = 'memory' | 'mysql';

export interface Config {
  host: string;
  port: number;
  tps: number;
  storage: StorageKind;
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} no es un número: ${raw}`);
  return value;
}

export function loadConfig(): Config {
  const storage = (process.env.HOLO_STORAGE ?? 'memory') as StorageKind;
  if (storage !== 'memory' && storage !== 'mysql') {
    throw new Error(`HOLO_STORAGE debe ser "memory" o "mysql", no "${storage}"`);
  }

  return {
    host: process.env.HOLO_HOST ?? '0.0.0.0',
    port: num('HOLO_PORT', 2096),
    tps: num('HOLO_TPS', 2),
    storage,
    mysql: {
      host: process.env.HOLO_DB_HOST ?? '127.0.0.1',
      port: num('HOLO_DB_PORT', 3306),
      user: process.env.HOLO_DB_USER ?? 'holo',
      password: process.env.HOLO_DB_PASSWORD ?? '',
      database: process.env.HOLO_DB_NAME ?? 'holo',
    },
  };
}
