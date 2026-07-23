import { env } from '../config/env.js';

const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
type Json = Record<string, any>;
async function call(path: string, token?: string, init: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  return { response, data: await response.json().catch(() => ({})) as Json };
}
function assert(label: string, condition: boolean, detail = '') {
  if (!condition) throw new Error(`${label}: ${detail || 'falló'}`);
  console.log(`ok ${label}`);
}

const live = await call('/health/live');
assert('liveness', live.response.ok && live.data.status === 'ok');
const ready = await call('/health/ready');
assert('readiness de base de datos', ready.response.ok && ready.data.database === 'ready', ready.data.database);
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD para el smoke autenticado.');
const login = await call('/api/auth/login', undefined, { method: 'POST', body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
assert('login administrativo', login.response.ok && Boolean(login.data.token), login.data.error);
const token = login.data.token as string;

for (const [label, path] of [
  ['sesión', '/api/auth/session'],
  ['configuración del negocio', '/api/operations/business-settings'],
  ['módulos', '/api/operations/modules'],
  ['cajas físicas', '/api/operations/cash/registers'],
  ['productos', '/api/operations/products?limit=1'],
  ['ventas', '/api/operations/sales?limit=1'],
  ['dashboard operativo', '/api/operations/dashboard/summary'],
] as const) {
  const result = await call(path, token);
  assert(label, result.response.ok, result.data.error);
}
console.log('Smoke de lanzamiento aprobado (solo lectura): salud, auth y operación principal disponibles.');
