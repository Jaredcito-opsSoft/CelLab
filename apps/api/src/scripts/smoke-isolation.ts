import { env } from '../config/env.js';

export function assertIsolatedSmokeEnvironment() {
  const api = new URL(process.env.API_URL ?? '');
  const database = new URL(env.DATABASE_URL);
  const databaseName = decodeURIComponent(database.pathname.replace(/^\//, '')).toLowerCase();

  if (api.protocol !== 'http:' || api.hostname !== '127.0.0.1' || !api.port) {
    throw new Error('Smoke bloqueado: API_URL debe usar HTTP, 127.0.0.1 y un puerto explícito.');
  }
  const isolatedName = ['audit', 'tenant', 'test'].some((marker) => databaseName.includes(marker));
  if (
    database.hostname !== '127.0.0.1'
    || database.port !== '55432'
    || !isolatedName
    || databaseName.includes('demo')
    || database.hostname.includes('supabase')
  ) {
    throw new Error('Smoke bloqueado: DATABASE_URL debe apuntar a PostgreSQL aislado en 127.0.0.1:55432, con nombre audit/tenant/test y nunca demo.');
  }
}
