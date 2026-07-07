import { env } from '../config/env.js';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

type LoginResponse = { token: string };
type ModulesResponse = { items: Array<{ key: string; enabled: boolean; isCore: boolean }> };

async function request(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function login() {
  const { response, data } = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
  if (!response.ok) throw new Error(`Login admin fallo: ${data.error ?? response.status}`);
  return (data as LoginResponse).token;
}

async function expect(label: string, condition: boolean, detail = '') {
  if (!condition) throw new Error(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`ok ${label}`);
}

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD para smoke de modulos.');

const adminToken = await login();

const modules = await request('/api/operations/modules', {}, adminToken);
await expect('admin consulta modulos', modules.response.ok);
const initialModules = modules.data as ModulesResponse;
await expect('modulos base existen', ['core_pos', 'cash', 'inventory_basic'].every((key) => initialModules.items.some((item) => item.key === key && item.enabled && item.isCore)));

await request('/api/operations/modules/purchases', { method: 'PATCH', body: JSON.stringify({ enabled: false }) }, adminToken);

const enableSuppliers = await request('/api/operations/modules/suppliers', { method: 'PATCH', body: JSON.stringify({ enabled: true }) }, adminToken);
await expect('admin activa suppliers', enableSuppliers.response.ok, enableSuppliers.data.error);

const suppliersEnabled = await request('/api/operations/suppliers', {}, adminToken);
await expect('proveedores aparece en API', suppliersEnabled.response.ok, suppliersEnabled.data.error);

const disableSuppliers = await request('/api/operations/modules/suppliers', { method: 'PATCH', body: JSON.stringify({ enabled: false }) }, adminToken);
await expect('admin desactiva suppliers', disableSuppliers.response.ok, disableSuppliers.data.error);

const suppliersDisabled = await request('/api/operations/suppliers', {}, adminToken);
await expect('endpoint suppliers queda bloqueado', suppliersDisabled.response.status === 403, suppliersDisabled.data.error);

const disableCore = await request('/api/operations/modules/core_pos', { method: 'PATCH', body: JSON.stringify({ enabled: false }) }, adminToken);
await expect('no se pueden desactivar modulos core', disableCore.response.status === 400, disableCore.data.error);

const audit = await request('/api/operations/audit-logs?search=module', {}, adminToken);
await expect('cambio de modulo queda auditado', audit.response.ok);

console.log('Smoke de modulos completado.');
