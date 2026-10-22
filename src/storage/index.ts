import type { Config } from '../config.ts';
import { memoryStorage } from './memory.ts';
import type { Storage } from './types.ts';

export type { Storage, UserRecord } from './types.ts';
export { memoryStorage } from './memory.ts';

export async function openStorage(config: Config): Promise<Storage> {
  if (config.storage === 'memory') return memoryStorage();
  // Import diferido: sin MySQL configurado no hace falta cargar el driver.
  const { mysqlStorage } = await import('./mysql.ts');
  return mysqlStorage(config);
}
