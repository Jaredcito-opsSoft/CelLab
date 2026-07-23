import { env } from '../config/env.js';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const runId = Date.now();
const password = `Smoke-${runId}`;

type LoginResponse = { token: string };
type IdResponse = { item: { id: string } };
type RepairDetailResponse = { item: { items: Array<{ costTotalCents: number; grossProfitCents: number; grossMarginBps: number }> } };

async function request(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function login(email: string, loginPassword: string) {
  const { response, data } = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: loginPassword }) });
  if (!response.ok) throw new Error(`Login fallo para ${email}: ${data.error ?? response.status}`);
  return (data as LoginResponse).token;
}

async function expectStatus(label: string, expected: number, path: string, options: RequestInit, token: string) {
  const { response, data } = await request(path, options, token);
  if (response.status !== expected) throw new Error(`${label}: esperado ${expected}, recibido ${response.status} ${data.error ?? ''}`);
  console.log(`ok ${label}`);
}

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD para smoke de permisos.');
}

const adminToken = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);

async function createUser(role: 'manager' | 'staff' | 'technician' | 'viewer') {
  const email = `smoke-${role}-${runId}@example.com`;
  const { response, data } = await request('/api/operations/users', {
    method: 'POST',
    body: JSON.stringify({ name: `Smoke ${role}`, email, password, role, active: true }),
  }, adminToken);
  if (!response.ok) throw new Error(`No se pudo crear ${role}: ${data.error ?? response.status}`);
  return { email, token: await login(email, password) };
}

const manager = await createUser('manager');
const staff = await createUser('staff');
const technician = await createUser('technician');
const viewer = await createUser('viewer');

const productResponse = await request('/api/operations/products', {
  method: 'POST',
  body: JSON.stringify({ sku: `COST-${runId}`, name: `Producto privacidad ${runId}`, costCents: 4321, priceCents: 8765, stock: 5, minimumStock: 1, active: true }),
}, adminToken);
if (!productResponse.response.ok) throw new Error(`No se pudo crear producto de privacidad: ${productResponse.data.error ?? productResponse.response.status}`);

for (const [role, token, shouldSeeCosts] of [
  ['admin', adminToken, true],
  ['manager', manager.token, true],
  ['staff', staff.token, false],
  ['technician', technician.token, false],
  ['viewer', viewer.token, false],
] as const) {
  const catalog = await request(`/api/operations/products?search=${encodeURIComponent(`COST-${runId}`)}`, {}, token);
  const product = (catalog.data as { items: Array<Record<string, unknown>> }).items?.[0];
  const exposesCost = Boolean(product && Object.prototype.hasOwnProperty.call(product, 'costCents'));
  if (!catalog.response.ok || !product || exposesCost !== shouldSeeCosts) {
    throw new Error(`privacidad de costo de catálogo incorrecta para ${role}`);
  }
  console.log(`ok catálogo protege costo para ${role}`);
}

await expectStatus('admin lista usuarios', 200, '/api/operations/users', {}, adminToken);
await expectStatus('manager no lista usuarios', 403, '/api/operations/users', {}, manager.token);
await expectStatus('viewer no muta clientes', 403, '/api/operations/clients', { method: 'POST', body: JSON.stringify({ name: 'Smoke Viewer', phone: '9999999999' }) }, viewer.token);
await expectStatus('technician no registra venta', 403, '/api/operations/sales', { method: 'POST', body: JSON.stringify({ paymentMethod: 'cash', discountCents: 0, items: [] }) }, technician.token);
await expectStatus('staff no cancela venta dummy', 403, '/api/operations/sales/00000000-0000-4000-8000-000000000000/cancel', { method: 'POST', body: JSON.stringify({ reason: 'Smoke test' }) }, staff.token);
await expectStatus('viewer no lee auditoria', 403, '/api/operations/audit-logs', {}, viewer.token);

const clientResponse = await request('/api/operations/clients', {
  method: 'POST',
  body: JSON.stringify({ name: `Smoke Cost ${runId}`, phone: `55${String(runId).slice(-8)}` }),
}, adminToken);
if (!clientResponse.response.ok) throw new Error(`No se pudo crear cliente smoke: ${clientResponse.data.error ?? clientResponse.response.status}`);
const clientId = (clientResponse.data as IdResponse).item.id;

const repairResponse = await request('/api/operations/repairs', {
  method: 'POST',
  body: JSON.stringify({ clientId, brand: 'Smoke', model: 'Cost Guard', reportedIssue: 'Prueba de permisos', physicalCondition: 'Equipo de smoke sin daño físico', depositCents: 0 }),
}, adminToken);
if (!repairResponse.response.ok) throw new Error(`No se pudo crear reparación smoke: ${repairResponse.data.error ?? repairResponse.response.status}`);
const repairId = (repairResponse.data as IdResponse).item.id;

const itemResponse = await request(`/api/operations/repairs/${repairId}/items`, {
  method: 'POST',
  body: JSON.stringify({ name: 'Concepto técnico sin costo permitido', quantity: 1, unitPriceCents: 10000, costCents: 9000, affectsInventory: false }),
}, technician.token);
if (!itemResponse.response.ok) throw new Error(`Técnico no pudo agregar concepto operativo: ${itemResponse.data.error ?? itemResponse.response.status}`);
const technicianItem = (itemResponse.data as { item: Record<string, unknown> }).item;
if (['costCentsSnapshot', 'costTotalCents', 'grossProfitCents', 'grossMarginBps'].some((field) => Object.prototype.hasOwnProperty.call(technicianItem, field))) {
  throw new Error('La respuesta al técnico expone costos o margen del concepto.');
}
console.log('ok respuesta de concepto técnico omite costos y margen');

const detailResponse = await request(`/api/operations/repairs/${repairId}`, {}, adminToken);
if (!detailResponse.response.ok) throw new Error(`No se pudo leer reparación smoke: ${detailResponse.data.error ?? detailResponse.response.status}`);
const [repairItem] = (detailResponse.data as RepairDetailResponse).item.items;
if (!repairItem || repairItem.costTotalCents !== 0 || repairItem.grossProfitCents !== 10000 || repairItem.grossMarginBps !== 10000) {
  throw new Error('technician no modifica costos: el costo manual enviado por técnico fue persistido o calculado incorrectamente.');
}
console.log('ok technician no modifica costos manuales');

const technicianDetail = await request(`/api/operations/repairs/${repairId}`, {}, technician.token);
if (!technicianDetail.response.ok) throw new Error(`Técnico no pudo leer reparación: ${technicianDetail.data.error ?? technicianDetail.response.status}`);
const safeItem = (technicianDetail.data as { item: { items: Array<Record<string, unknown>> } }).item.items[0];
if (!safeItem || ['costCentsSnapshot', 'costTotalCents', 'grossProfitCents', 'grossMarginBps'].some((field) => Object.prototype.hasOwnProperty.call(safeItem, field))) {
  throw new Error('El detalle de reparación expone costos o margen al técnico.');
}
console.log('ok detalle de reparación omite costos y margen para técnico');

console.log('Smoke de permisos completado.');
