import { env } from '../config/env.js';

export function assertIsolatedSmokeEnvironment() {
  const api = new URL(process.env.API_URL ?? '');
  const database = new URL(env.DATABASE_URL);

  if (api.protocol !== 'http:' || api.hostname !== '127.0.0.1' || api.port !== '3001') {
    throw new Error('Smoke bloqueado: API_URL debe ser exactamente http://127.0.0.1:3001.');
  }
  if (database.hostname !== '127.0.0.1' || database.port !== '55432' || database.pathname !== '/localpos_audit') {
    throw new Error('Smoke bloqueado: DATABASE_URL debe apuntar a PostgreSQL aislado 127.0.0.1:55432/localpos_audit.');
  }
}
