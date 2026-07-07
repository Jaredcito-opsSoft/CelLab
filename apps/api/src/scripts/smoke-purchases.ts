import { env } from '../config/env.js';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const runId = Date.now();
const password = `Smoke-${runId}`;

type LoginResponse = { token: string };
type IdResponse = { item: { id: string; folio?: string; status?: string; stock?: number } };
type ProductResponse = { item: { id: string; stock: number } };
type MovementResponse = { items: Array<{ type: string; referenceId: string; quantity: number; newStock: number }> };
type PurchaseDetailResponse = { item: { subtotalCents: number; items: Array<{ unitCostCents: number; totalCents: number }> } };

async function request(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function login(email: string, loginPassword: string) {
  const { response, data } = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: loginPassword }) });
  if (!response.ok) throw new Error(`Login fallo para ${email}: ${data.error ?? response.status}`);
  return (data as LoginResponse).token;
}

function assert(label: string, condition: boolean, detail = '') {
  if (!condition) throw new Error(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`ok ${label}`);
}

async function setModule(token: string, key: string, enabled: boolean, expected = 200) {
  const { response, data } = await request(`/api/operations/modules/${key}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }, token);
  assert(`${enabled ? 'activa' : 'desactiva'} ${key}`, response.status === expected, data.error);
}

async function trySetModule(token: string, key: string, enabled: boolean) {
  const { response, data } = await request(`/api/operations/modules/${key}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }, token);
  if (!response.ok) console.warn(`warn no se pudo restaurar ${key}: ${data.error ?? response.status}`);
}

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD para smoke de compras.');

const adminToken = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);

try {
  await setModule(adminToken, 'purchases', false);
  await trySetModule(adminToken, 'suppliers', false);

  const blocked = await request('/api/operations/purchases', {}, adminToken);
  assert('purchases apagado bloquea endpoints', blocked.response.status === 403, blocked.data.error);

  const blockedDependency = await request('/api/operations/modules/purchases', { method: 'PATCH', body: JSON.stringify({ enabled: true }) }, adminToken);
  assert('suppliers apagado impide activar purchases', blockedDependency.response.status === 409, blockedDependency.data.error);

  await setModule(adminToken, 'suppliers', true);
  await setModule(adminToken, 'purchases', true);

  const staffEmail = `smoke-purchases-staff-${runId}@example.com`;
  const staffCreate = await request('/api/operations/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'Smoke Compras Staff', email: staffEmail, password, role: 'staff', active: true }),
  }, adminToken);
  assert('admin crea usuario staff smoke', staffCreate.response.ok, staffCreate.data.error);
  const staffToken = await login(staffEmail, password);

  const supplier = await request('/api/operations/suppliers', {
    method: 'POST',
    body: JSON.stringify({ name: `Proveedor Smoke ${runId}`, contactName: 'Compras', phone: '9610000000', email: null, notes: 'Smoke Hito 12' }),
  }, adminToken);
  assert('admin crea proveedor', supplier.response.ok, supplier.data.error);
  const supplierId = (supplier.data as IdResponse).item.id;

  const product = await request('/api/operations/products', {
    method: 'POST',
    body: JSON.stringify({ sku: `SMK-COM-${runId}`, name: `Producto compra smoke ${runId}`, costCents: 500, priceCents: 1200, stock: 0, minimumStock: 1, active: true }),
  }, adminToken);
  assert('admin crea producto para compra', product.response.ok, product.data.error);
  const productId = (product.data as ProductResponse).item.id;

  const purchase = await request('/api/operations/purchases', {
    method: 'POST',
    body: JSON.stringify({ supplierId, notes: 'Compra smoke', status: 'draft' }),
  }, adminToken);
  assert('admin crea compra', purchase.response.ok, purchase.data.error);
  const purchaseId = (purchase.data as IdResponse).item.id;

  const line = await request(`/api/operations/purchases/${purchaseId}/items`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity: 3, unitCostCents: 700 }),
  }, adminToken);
  assert('admin agrega producto a compra', line.response.ok, line.data.error);

  const staffDetail = await request(`/api/operations/purchases/${purchaseId}`, {}, staffToken);
  assert('staff puede consultar compra sin costos', staffDetail.response.ok, staffDetail.data.error);
  const maskedPurchase = staffDetail.data as PurchaseDetailResponse;
  assert('staff no ve importes de compra', maskedPurchase.item.subtotalCents === 0 && maskedPurchase.item.items.every((item) => item.unitCostCents === 0 && item.totalCents === 0));

  const staffReceive = await request(`/api/operations/purchases/${purchaseId}/receive`, { method: 'POST', body: JSON.stringify({ note: 'Intento staff' }) }, staffToken);
  assert('rol sin permiso no puede recibir compra', staffReceive.response.status === 403, staffReceive.data.error);

  const receive = await request(`/api/operations/purchases/${purchaseId}/receive`, { method: 'POST', body: JSON.stringify({ note: 'Recepcion smoke' }) }, adminToken);
  assert('admin recibe compra', receive.response.ok, receive.data.error);
  assert('compra queda recibida', (receive.data as IdResponse).item.status === 'received');

  const productAfter = await request(`/api/operations/products?search=${encodeURIComponent(`SMK-COM-${runId}`)}`, {}, adminToken);
  const receivedProduct = (productAfter.data as { items: Array<{ id: string; stock: number; costCents: number }> }).items.find((item) => item.id === productId);
  assert('stock aumenta', receivedProduct?.stock === 3);
  assert('costo de producto se actualiza', receivedProduct?.costCents === 700);

  const movements = await request(`/api/operations/inventory-movements?productId=${productId}&type=purchase_receipt`, {}, adminToken);
  assert('movimiento purchase_receipt queda registrado', (movements.data as MovementResponse).items.some((item) => item.referenceId === purchaseId && item.quantity === 3 && item.newStock === 3));

  const editReceived = await request(`/api/operations/purchases/${purchaseId}/items/${(line.data as IdResponse).item.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity: 4 }),
  }, adminToken);
  assert('compra recibida no puede editarse como borrador', editReceived.response.status === 409, editReceived.data.error);

  console.log('Smoke de compras completado.');
} finally {
  await trySetModule(adminToken, 'purchases', false);
  await trySetModule(adminToken, 'suppliers', false);
  console.log('ok smoke restaura suppliers y purchases apagados');
}
