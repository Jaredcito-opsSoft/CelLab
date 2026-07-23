import { env } from '../config/env.js';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const runId = Date.now();

async function call(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return { response, data: await response.json().catch(() => ({})) as any };
}

function assert(label: string, condition: boolean, detail?: string) {
  if (!condition) throw new Error(`${label}: ${detail ?? 'falló'}`);
  console.log(`ok ${label}`);
}

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD.');
const login = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
assert('login admin', login.response.ok, login.data.error);
const token = login.data.token as string;

const modules = await call('/api/operations/modules', {}, token);
assert('consulta módulos', modules.response.ok, modules.data.error);
const originalLayawaysState = Boolean(modules.data.items.find((item: any) => item.key === 'layaways')?.enabled);
const currentCash = await call('/api/operations/cash/current', {}, token);
assert('consulta caja actual', currentCash.response.ok, currentCash.data.error);
let openedCashForSmoke = false;

try {
  if (!currentCash.data.item) {
    const opened = await call('/api/operations/cash/open', {
      method: 'POST',
      body: JSON.stringify({ openingCashCents: 10000, notes: 'Apertura temporal smoke POS completo' }),
    }, token);
    assert('abre caja temporal', opened.response.status === 201, opened.data.error);
    openedCashForSmoke = true;
  }
  if (!originalLayawaysState) {
    const enabled = await call('/api/operations/modules/layaways', { method: 'PATCH', body: JSON.stringify({ enabled: true }) }, token);
    assert('activa apartados durante smoke', enabled.response.ok, enabled.data.error);
  }

  const client = await call('/api/operations/clients', {
    method: 'POST',
    body: JSON.stringify({ name: `Cliente POS ${runId}`, phone: `961${String(runId).slice(-7)}`, email: null, notes: 'Smoke POS completo' }),
  }, token);
  assert('crea cliente', client.response.ok, client.data.error);

  const product = await call('/api/operations/products', {
    method: 'POST',
    body: JSON.stringify({ sku: `POS-${runId}`, name: `Producto POS ${runId}`, costCents: 3000, priceCents: 5000, stock: 5, minimumStock: 1, active: true }),
  }, token);
  assert('crea producto', product.response.ok, product.data.error);
  const productId = product.data.item.id;

  const sale = await call('/api/operations/sales', {
    method: 'POST',
    body: JSON.stringify({
      customerId: client.data.item.id,
      discountCents: 0,
      items: [{ productId, quantity: 2 }],
      payments: [{ method: 'cash', amountCents: 4000, receivedAmountCents: 4000 }, { method: 'card', amountCents: 6000 }],
    }),
  }, token);
  assert('venta con pago mixto', sale.response.status === 201 && sale.data.item.paymentMethod === 'mixed', sale.data.error);
  const saleId = sale.data.item.id;

  const saleDetail = await call(`/api/operations/sales/${saleId}`, {}, token);
  assert('detalle conserva dos pagos', saleDetail.response.ok && saleDetail.data.item.payments.length === 2, saleDetail.data.error);

  const saleReturn = await call(`/api/operations/sales/${saleId}/returns`, {
    method: 'POST',
    body: JSON.stringify({
      reason: 'Smoke devolución parcial',
      items: [{ saleItemId: saleDetail.data.item.items[0].id, quantity: 1 }],
      payments: [{ method: 'cash', amountCents: 5000 }],
    }),
  }, token);
  assert('devolución parcial', saleReturn.response.status === 201 && String(saleReturn.data.item.folio).startsWith('DEV-'), saleReturn.data.error);

  const layaway = await call('/api/operations/layaways', {
    method: 'POST',
    body: JSON.stringify({
      customerId: client.data.item.id,
      discountCents: 0,
      items: [{ productId, quantity: 1 }],
      initialPayment: { method: 'transfer', amountCents: 1000 },
    }),
  }, token);
  assert('crea apartado y reserva stock', layaway.response.status === 201 && String(layaway.data.item.folio).startsWith('APA-'), layaway.data.error);
  const layawayId = layaway.data.item.id;

  const payment = await call(`/api/operations/layaways/${layawayId}/payments`, {
    method: 'POST',
    body: JSON.stringify({ method: 'card', amountCents: 4000 }),
  }, token);
  assert('liquida apartado', payment.response.status === 201 && payment.data.item.layaway.status === 'paid', payment.data.error);

  const delivered = await call(`/api/operations/layaways/${layawayId}/deliver`, { method: 'POST' }, token);
  assert('entrega apartado liquidado', delivered.response.ok && delivered.data.item.status === 'delivered', delivered.data.error);
  console.log('Smoke POS completo aprobado. Datos conservados para trazabilidad.');
} finally {
  if (!originalLayawaysState) {
    await call('/api/operations/modules/layaways', { method: 'PATCH', body: JSON.stringify({ enabled: false }) }, token);
  }
  if (openedCashForSmoke) {
    const current = await call('/api/operations/cash/current', {}, token);
    if (current.response.ok && current.data.item) {
      await call('/api/operations/cash/close', {
        method: 'POST',
        body: JSON.stringify({ countedCashCents: Math.max(0, current.data.item.expectedCashCents), notes: 'Cierre temporal smoke POS completo' }),
      }, token);
    }
  }
}
