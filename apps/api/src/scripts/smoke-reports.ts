import { env } from '../config/env.js';
import { assertIsolatedSmokeEnvironment } from './smoke-isolation.js';

assertIsolatedSmokeEnvironment();

const API_URL = process.env.API_URL!;
const runId = Date.now();
const password = `Smoke-${runId}`;

async function call(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();
  return { response, data: data as any };
}

function assert(label: string, condition: boolean, detail?: unknown) {
  if (!condition) throw new Error(`${label}: ${String(detail ?? 'falló')}`);
  console.log(`ok ${label}`);
}

async function login(email: string, loginPassword: string) {
  const result = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: loginPassword }) });
  assert(`login ${email}`, result.response.ok, result.data.error ?? result.response.status);
  return result.data.token as string;
}

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD.');
const adminToken = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
const viewerEmail = `smoke-reports-viewer-${runId}@example.com`;
const viewer = await call('/api/operations/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Viewer smoke reportes', email: viewerEmail, password, role: 'viewer', active: true }),
}, adminToken);
assert('crea viewer', viewer.response.status === 201, viewer.data.error);
const viewerToken = await login(viewerEmail, password);

const modules = await call('/api/operations/modules', {}, adminToken);
assert('consulta módulos', modules.response.ok, modules.data.error);
const originalState = Boolean(modules.data.items.find((item: any) => item.key === 'advanced_reports')?.enabled);
const today = new Date().toISOString().slice(0, 10);
const range = `from=${today}&to=${today}`;

try {
  const disabled = await call('/api/operations/modules/advanced_reports', {
    method: 'PATCH',
    body: JSON.stringify({ enabled: false }),
  }, adminToken);
  assert('desactiva reportes avanzados', disabled.response.ok, disabled.data.error);

  const simpleAdmin = await call(`/api/operations/reports/basic?${range}`, {}, adminToken);
  assert('reportes simples disponibles para admin', simpleAdmin.response.ok && typeof simpleAdmin.data.incomeCents === 'number', simpleAdmin.data.error);
  const simpleViewer = await call(`/api/operations/reports/basic?${range}`, {}, viewerToken);
  assert('reportes simples disponibles para viewer', simpleViewer.response.ok, simpleViewer.data.error);

  const blocked = await call(`/api/operations/reports/managerial?${range}`, {}, adminToken);
  assert('gerenciales bloqueados con módulo apagado', blocked.response.status === 403 && blocked.data.code === 'MODULE_DISABLED', blocked.data.error);

  const enabled = await call('/api/operations/modules/advanced_reports', {
    method: 'PATCH',
    body: JSON.stringify({ enabled: true }),
  }, adminToken);
  assert('activa reportes avanzados', enabled.response.ok, enabled.data.error);

  const managerial = await call(`/api/operations/reports/managerial?${range}`, {}, adminToken);
  assert('gerenciales disponibles con módulo activo', managerial.response.ok && managerial.data.sales && managerial.data.inventory, managerial.data.error);

  const viewerBlocked = await call(`/api/operations/reports/managerial?${range}`, {}, viewerToken);
  assert('viewer sin acceso a datos gerenciales', viewerBlocked.response.status === 403, viewerBlocked.data.error);

  const csv = await call(`/api/operations/reports/managerial.csv?${range}`, {}, adminToken);
  assert('exportación CSV gerencial', csv.response.ok && (csv.response.headers.get('content-type') ?? '').includes('text/csv') && String(csv.data).includes('seccion,metrica,valor_centavos'), csv.data);

  console.log('Smoke de reportes aprobado. Estado del módulo restaurado al finalizar.');
} finally {
  await call('/api/operations/modules/advanced_reports', {
    method: 'PATCH',
    body: JSON.stringify({ enabled: originalState }),
  }, adminToken);
}
