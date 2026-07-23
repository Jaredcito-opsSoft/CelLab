import { env } from '../config/env.js';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const runId = Date.now();
type Json = Record<string, any>;
async function call(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return { response, data: await response.json().catch(() => ({})) as Json };
}
function assert(label: string, condition: boolean, detail?: string) { if (!condition) throw new Error(`${label}: ${detail ?? 'falló'}`); console.log(`ok ${label}`); }
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD.');

const login = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
assert('login admin', login.response.ok, login.data.error); const token = login.data.token as string;

async function ensureRegister(code: string, name: string) {
  const list = await call('/api/operations/cash/registers', {}, token);
  const existing = list.data.items?.find((item: Json) => item.code === code);
  if (existing) return existing;
  const created = await call('/api/operations/cash/registers', { method: 'POST', body: JSON.stringify({ code, name }) }, token);
  assert(`crea ${name}`, created.response.status === 201, created.data.error);
  return created.data.item;
}
async function current(registerId: string) { return call(`/api/operations/cash/current?cashRegisterId=${registerId}`, {}, token); }
async function closeIfOpen(registerId: string) {
  const open = await current(registerId);
  if (!open.data.item) return;
  const closed = await call('/api/operations/cash/close', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerId, countedCashCents: open.data.item.summary.expectedCashCents, notes: 'Cierre previo smoke' }) }, token);
  assert('cierra turno previo', closed.response.ok, closed.data.error);
}

const registerA = await ensureRegister('SMOKE-01', 'Caja smoke 1');
const registerB = await ensureRegister('SMOKE-02', 'Caja smoke 2');
await closeIfOpen(registerA.id); await closeIfOpen(registerB.id);
const [openA, openB] = await Promise.all([
  call('/api/operations/cash/open', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerA.id, openingCashCents: 50000, notes: 'Turno smoke A' }) }, token),
  call('/api/operations/cash/open', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerB.id, openingCashCents: 30000, notes: 'Turno smoke B' }) }, token),
]);
assert('abre dos cajas simultáneas', openA.response.status === 201 && openB.response.status === 201 && openA.data.item.id !== openB.data.item.id, openA.data.error ?? openB.data.error);

const product = await call('/api/operations/products', { method: 'POST', body: JSON.stringify({ sku: `MULTI-${runId}`, barcode: String(runId), name: `Producto multicaja ${runId}`, costCents: 1200, priceCents: 2500, stock: 10, minimumStock: 2, active: true }) }, token);
assert('crea producto multicaja', product.response.status === 201, product.data.error); const productId = product.data.item.id;
const saleA = await call('/api/operations/sales', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerA.id, paymentMethod: 'cash', payments: [{ method: 'cash', amountCents: 5000, receivedAmountCents: 6000 }], discountCents: 0, notes: 'Compra simulada caja A', items: [{ productId, quantity: 2 }] }) }, token);
assert('venta efectivo caja A', saleA.response.status === 201 && !saleA.data.item.cashWarning, saleA.data.error);
const saleB = await call('/api/operations/sales', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerB.id, payments: [{ method: 'cash', amountCents: 1000, receivedAmountCents: 1000 }, { method: 'card', amountCents: 1500 }], discountCents: 0, notes: 'Pago mixto caja B', items: [{ productId, quantity: 1 }] }) }, token);
assert('venta mixta caja B', saleB.response.status === 201 && saleB.data.item.paymentMethod === 'mixed' && !saleB.data.item.cashWarning, saleB.data.error);

const detailA = await call(`/api/operations/sales/${saleA.data.item.id}`, {}, token);
const returned = await call(`/api/operations/sales/${saleA.data.item.id}/returns`, { method: 'POST', body: JSON.stringify({ cashRegisterId: registerA.id, reason: 'Devolución parcial smoke multicaja', items: [{ saleItemId: detailA.data.item.items[0].id, quantity: 1 }], payments: [{ method: 'cash', amountCents: 2500 }] }) }, token);
assert('devolución parcial en caja A', returned.response.status === 201 && String(returned.data.item.folio).startsWith('DEV-'), returned.data.error);

const [currentA, currentB] = await Promise.all([current(registerA.id), current(registerB.id)]);
const movementsA = currentA.data.item.movements as Json[]; const movementsB = currentB.data.item.movements as Json[];
assert('movimientos aislados por caja', movementsA.some((movement) => movement.referenceFolio === saleA.data.item.folio) && !movementsA.some((movement) => movement.referenceFolio === saleB.data.item.folio) && movementsB.some((movement) => movement.referenceFolio === saleB.data.item.folio), 'las ventas se mezclaron entre turnos');

const [closeA, closeB] = await Promise.all([
  call('/api/operations/cash/close', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerA.id, countedCashCents: currentA.data.item.summary.expectedCashCents, notes: 'Cierre exacto smoke A' }) }, token),
  call('/api/operations/cash/close', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerB.id, countedCashCents: currentB.data.item.summary.expectedCashCents, notes: 'Cierre exacto smoke B' }) }, token),
]);
assert('cierres independientes sin diferencia', closeA.response.ok && closeB.response.ok && closeA.data.item.differenceCents === 0 && closeB.data.item.differenceCents === 0, closeA.data.error ?? closeB.data.error);
console.log('Smoke multicaja aprobado: apertura simultánea, ventas, pago mixto, devolución, aislamiento y cierre.');
