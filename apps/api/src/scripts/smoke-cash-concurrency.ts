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
assert('login carga multicaja', login.response.ok, login.data.error); const token = login.data.token as string;

async function ensureRegister(index: number) {
  const code = `SMOKE-${String(index).padStart(2, '0')}`;
  const list = await call('/api/operations/cash/registers', {}, token);
  const existing = list.data.items.find((item: Json) => item.code === code);
  if (existing) {
    if (!existing.active) await call(`/api/operations/cash/registers/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ active: true }) }, token);
    return existing;
  }
  const created = await call('/api/operations/cash/registers', { method: 'POST', body: JSON.stringify({ code, name: `Caja carga ${index}` }) }, token);
  assert(`crea terminal ${index}`, created.response.status === 201, created.data.error);
  return created.data.item;
}

const registers: Json[] = [];
for (let index = 1; index <= 9; index += 1) registers.push(await ensureRegister(index));
for (const register of registers) {
  const current = await call(`/api/operations/cash/current?cashRegisterId=${register.id}`, {}, token);
  if (current.data.item) await call('/api/operations/cash/close', { method: 'POST', body: JSON.stringify({ cashRegisterId: register.id, countedCashCents: current.data.item.summary.expectedCashCents, notes: 'Reinicio de carga' }) }, token);
}
const opened = await Promise.all(registers.map((register, index) => call('/api/operations/cash/open', { method: 'POST', body: JSON.stringify({ cashRegisterId: register.id, openingCashCents: 10_000 + index * 100, notes: 'Prueba concurrente' }) }, token)));
assert('abre nueve terminales', opened.every((result) => result.response.status === 201), opened.find((result) => !result.response.ok)?.data.error);

const product = await call('/api/operations/products', { method: 'POST', body: JSON.stringify({ sku: `LOAD-${runId}`, barcode: `9${runId}`, name: `Producto concurrencia ${runId}`, costCents: 400, priceCents: 1000, stock: 30, minimumStock: 5, active: true }) }, token);
assert('producto para nueve ventas', product.response.status === 201, product.data.error);
const startedAt = Date.now();
const sales = await Promise.all(registers.map((register, index) => call('/api/operations/sales', { method: 'POST', body: JSON.stringify({ cashRegisterId: register.id, payments: index % 3 === 0 ? [{ method: 'cash', amountCents: 1000, receivedAmountCents: 1000 }] : index % 3 === 1 ? [{ method: 'card', amountCents: 1000 }] : [{ method: 'transfer', amountCents: 1000 }], discountCents: 0, notes: `Venta concurrente terminal ${index + 1}`, items: [{ productId: product.data.item.id, quantity: 1 }] }) }, token)));
const elapsedMs = Date.now() - startedAt;
assert('nueve ventas concurrentes', sales.every((result) => result.response.status === 201), sales.find((result) => !result.response.ok)?.data.error);
assert('folios únicos en concurrencia', new Set(sales.map((result) => result.data.item.folio)).size === 9);

const currents = await Promise.all(registers.map((register) => call(`/api/operations/cash/current?cashRegisterId=${register.id}`, {}, token)));
assert('cada turno conserva su venta', currents.every((result, index) => result.data.item.movements.some((movement: Json) => movement.referenceFolio === sales.at(index)!.data.item.folio)));
const closes = await Promise.all(registers.map((register, index) => call('/api/operations/cash/close', { method: 'POST', body: JSON.stringify({ cashRegisterId: register.id, countedCashCents: currents.at(index)!.data.item.summary.expectedCashCents, notes: 'Cierre prueba concurrente' }) }, token)));
assert('cierra nueve terminales sin diferencia', closes.every((result) => result.response.ok && result.data.item.differenceCents === 0));
for (const register of registers.slice(2)) await call(`/api/operations/cash/registers/${register.id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }, token);
console.log(`Smoke de concurrencia aprobado: 9 terminales y 9 ventas en ${elapsedMs} ms.`);
