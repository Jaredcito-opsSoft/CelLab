import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, Printer, Search, ShoppingBag, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import '../../styles/responsive-operations.css';

type Product = { id: string; sku: string; barcode?: string | null; name: string; priceCents: number; stock: number; active: boolean };
type Client = { id: string; name: string; phone: string };
type Business = { businessName: string; businessType: string; logoUrl: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; ticketMessage: string | null; warrantyMessage: string | null; currency: string; primaryColor: string; requireOpenCashForMoneyOperations: boolean };
type PaymentMethod = 'cash' | 'transfer' | 'card';
type SalePayment = { id: string; method: PaymentMethod; amountCents: number; receivedAmountCents: number | null };
type SaleReturn = { id: string; folio: string; reason: string; totalCents: number; createdAt: string; items: Array<{ saleItemId: string; productNameSnapshot: string; quantity: number; totalCents: number }>; payments: Array<{ method: PaymentMethod; amountCents: number }> };
type Sale = { id: string; folio: string; customerId: string | null; customerName: string | null; customerPhone: string | null; userName: string; subtotalCents: number; discountCents: number; totalCents: number; paymentMethod: PaymentMethod | 'mixed'; status: 'completed' | 'partially_refunded' | 'refunded' | 'cancelled'; notes: string | null; createdAt: string };
type SaleItem = { id: string; productId: string; productNameSnapshot: string; quantity: number; unitPriceCents: number; subtotalCents: number };
type SaleDetail = Sale & { items: SaleItem[]; payments: SalePayment[]; returns: SaleReturn[]; business: Business };
type CartItem = Product & { quantity: number };
type CashRegister = { id: string; code: string; name: string; active: boolean; isDefault: boolean; openSession: { id: string } | null };

const paymentLabels: Record<string, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', mixed: 'Pago mixto' };
const money = (cents: number, currency: string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const CASH_REGISTER_KEY = 'localpos-cash-register-id';

export function QuickSaleView({ token, business, advancedPosEnabled, onOpenSale, onOpenHistory }: { token: string; business: Business; advancedPosEnabled: boolean; onOpenSale: (id: string) => void; onOpenHistory: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'mixed'>('cash');
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod>('card');
  const [mixedPrimary, setMixedPrimary] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cashStatus, setCashStatus] = useState<'open' | 'closed' | 'unknown'>('unknown');
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashRegisterId, setCashRegisterId] = useState(() => localStorage.getItem(CASH_REGISTER_KEY) ?? '');
  const [successSale, setSuccessSale] = useState<{ id: string; folio: string; totalCents: number; paymentMethod: string; cashWarning: string | null } | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiRequest<{ items: Product[] }>('/api/operations/products?limit=100', {}, token),
      apiRequest<{ items: Client[] }>('/api/operations/clients?limit=100', {}, token),
    ]).then(([p, c]) => { setProducts(p.items.filter((x) => x.active)); setClients(c.items); }).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar catálogo.'));
  }, [token]);

  useEffect(() => {
    void apiRequest<{ items: CashRegister[] }>('/api/operations/cash/registers', {}, token).then((result) => {
      const available = result.items.filter((register) => register.active);
      setCashRegisters(available);
      const selected = available.some((register) => register.id === cashRegisterId) ? cashRegisterId : (available.find((register) => register.isDefault)?.id ?? available[0]?.id ?? '');
      if (selected !== cashRegisterId) setCashRegisterId(selected);
    }).catch(() => setCashStatus('unknown'));
  }, [token, cashRegisterId]);

  useEffect(() => {
    if (!cashRegisterId) return;
    localStorage.setItem(CASH_REGISTER_KEY, cashRegisterId);
    void apiRequest<{ item: unknown | null }>(`/api/operations/cash/current?cashRegisterId=${encodeURIComponent(cashRegisterId)}`, {}, token).then((res) => setCashStatus(res.item ? 'open' : 'closed')).catch(() => setCashStatus('unknown'));
  }, [cashRegisterId, token]);

  const visible = useMemo(() => products.filter((p) => `${p.name} ${p.sku} ${p.barcode ?? ''}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const discountCents = Math.round(Number(discount || 0) * 100);
  const total = Math.max(0, subtotal - discountCents);
  const amountPaidCents = Math.round(Number(amountPaid || 0) * 100);
  const changeCents = paymentMethod === 'cash' ? Math.max(0, amountPaidCents - total) : 0;
  const missingCents = paymentMethod === 'cash' && amountPaid.trim() ? Math.max(0, total - amountPaidCents) : 0;
  const mixedPrimaryCents = Math.round(Number(mixedPrimary || 0) * 100);
  const mixedInvalid = paymentMethod === 'mixed' && (mixedPrimaryCents <= 0 || mixedPrimaryCents >= total || secondaryMethod === 'cash');

  function add(product: Product, amount = 1) {
    if (product.stock <= 0) return;
    const nextAmount = Math.max(1, Math.floor(amount || 1));
    setCart((current) => {
      const found = current.find((x) => x.id === product.id);
      if (found) return current.map((x) => x.id === product.id ? { ...x, quantity: Math.min(x.quantity + nextAmount, x.stock) } : x);
      return [...current, { ...product, quantity: Math.min(nextAmount, product.stock) }];
    });
  }
  function quantity(id: string, next: number) { setCart((current) => current.map((x) => x.id === id ? { ...x, quantity: Math.max(1, Math.min(next, x.stock)) } : x)); }
  function quickAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = quickCode.trim().toLowerCase();
    if (!query) return;
    const product = products.find((item) => item.active && (item.sku.toLowerCase() === query || item.barcode?.toLowerCase() === query || item.id.toLowerCase() === query)) ?? products.find((item) => item.active && `${item.name} ${item.sku} ${item.barcode ?? ''}`.toLowerCase().includes(query));
    if (!product) {
      setError('No encontramos ese producto o SKU.');
      return;
    }
    setError('');
    add(product, Number(quickQty || 1));
    setQuickCode('');
    setQuickQty('1');
    setSearch('');
  }

  async function confirmSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!cart.length || busy) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const payments = paymentMethod === 'mixed'
        ? [{ method: 'cash', amountCents: mixedPrimaryCents, receivedAmountCents: mixedPrimaryCents }, { method: secondaryMethod, amountCents: total - mixedPrimaryCents }]
        : [{ method: paymentMethod, amountCents: total, receivedAmountCents: paymentMethod === 'cash' && amountPaidCents >= total ? amountPaidCents : null }];
      const result = await apiRequest<{ item: { id: string; folio: string; totalCents: number; paymentMethod: string; cashWarning: string | null } }>('/api/operations/sales', { method: 'POST', body: JSON.stringify({ cashRegisterId: cashRegisterId || undefined, customerId: form.get('customerId') || null, paymentMethod, payments, discountCents, notes: form.get('notes') || null, items: cart.map((x) => ({ productId: x.id, quantity: x.quantity })) }) }, token);
      setCart([]); setDiscount('0'); setAmountPaid(''); setMobileCartOpen(false); setSuccessSale(result.item);
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible confirmar la venta.'); } finally { setBusy(false); }
  }

  if (successSale) return <div className="pos-success-screen"><ShoppingBag size={42} /><h2>Venta registrada con éxito</h2><p>Folio {successSale.folio} · {money(successSale.totalCents, business.currency)} · {paymentLabels[successSale.paymentMethod] ?? successSale.paymentMethod}</p>{successSale.cashWarning && <p className="panel-alert">{successSale.cashWarning}</p>}<div className="form-actions"><button className="panel-primary" onClick={() => onOpenSale(successSale.id)}><Printer />Ver nota / imprimir</button><button onClick={() => setSuccessSale(null)}>Nueva venta</button><button onClick={() => { setSuccessSale(null); onOpenHistory(); }}>Historial</button></div></div>;

  const policyActive = business.requireOpenCashForMoneyOperations;
  const disableConfirm = !cart.length || busy || (cashStatus === 'closed' && policyActive) || missingCents > 0 || mixedInvalid;
  const cashAlert = cashStatus === 'closed' ? (policyActive ? 'Caja cerrada: abre caja antes de vender.' : 'Aviso: no hay caja abierta; la venta quedará fuera del corte actual.') : cashStatus === 'open' ? 'Caja abierta: la venta se vinculará al corte activo.' : null;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return <div className={`pos-shell${mobileCartOpen ? ' pos-shell--cart-open' : ''}`}><section className="product-shelf"><div className="pos-section-head"><div><p className="panel-eyebrow">Mostrador rápido</p><h2>Busca, agrega y cobra</h2></div><button className="text-action" onClick={onOpenHistory}>Ver historial</button></div><form className="quick-scan-bar" onSubmit={quickAdd}><label>SKU / ID / producto<input value={quickCode} onChange={(e) => setQuickCode(e.target.value)} placeholder="Escanea o escribe" autoComplete="off" /></label><label className="quick-scan-qty">Cant.<input value={quickQty} onChange={(e) => setQuickQty(e.target.value)} type="number" inputMode="numeric" min="1" step="1" /></label><button className="panel-primary" type="submit">Agregar</button></form><label className="pos-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar catálogo por nombre o SKU" /></label><div className="product-pick-grid">{visible.map((product) => <button className="product-pick" key={product.id} disabled={product.stock === 0} onClick={() => add(product)}><span>{product.sku}</span><b>{product.name}</b><strong>{money(product.priceCents, business.currency)}</strong><small>{product.stock ? `${product.stock} disponibles` : 'Sin stock'}</small><Plus /></button>)}</div></section><button type="button" className="mobile-cart-launch" disabled={!cart.length} aria-expanded={mobileCartOpen} onClick={() => setMobileCartOpen(true)}><ShoppingBag /><span><b>{cart.length ? `${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}` : 'Carrito vacío'}</b><small>{cart.length ? 'Revisar y cobrar' : 'Agrega un producto para comenzar'}</small></span><strong>{money(total, business.currency)}</strong></button><aside className="cart-receipt" aria-label="Carrito de venta"><button type="button" className="mobile-cart-close" aria-label="Volver al catálogo" onClick={() => setMobileCartOpen(false)}><ArrowLeft />Seguir agregando</button><div className="receipt-heading"><span>Venta en curso</span><b>{cart.length} partidas</b></div><div className="cart-lines">{cart.map((item) => <article key={item.id}><div><b>{item.name}</b><small>{money(item.priceCents, business.currency)} c/u</small></div><div className="quantity-control"><button type="button" aria-label={`Restar una unidad de ${item.name}`} onClick={() => quantity(item.id, item.quantity - 1)}><Minus /></button><input aria-label={`Cantidad ${item.name}`} type="number" inputMode="numeric" min="1" max={item.stock} value={item.quantity} onChange={(e) => quantity(item.id, Number(e.target.value || 1))} /><button type="button" aria-label={`Agregar una unidad de ${item.name}`} onClick={() => quantity(item.id, item.quantity + 1)}><Plus /></button></div><strong>{money(item.priceCents * item.quantity, business.currency)}</strong><button type="button" aria-label={`Quitar ${item.name} de la venta`} className="remove-line" onClick={() => setCart((current) => current.filter((x) => x.id !== item.id))}><X /></button></article>)}</div><form className="checkout-form" onSubmit={confirmSale}><label>Caja física<select value={cashRegisterId} onChange={(event) => setCashRegisterId(event.target.value)} required>{cashRegisters.map((register) => <option value={register.id} key={register.id}>{register.name} · {register.openSession ? 'turno abierto' : 'cerrada'}</option>)}</select></label>{cashAlert && <p className="panel-alert">{cashAlert}</p>}<label>Cliente opcional<select name="customerId"><option value="">Venta de mostrador</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name} · {client.phone}</option>)}</select></label><div className="checkout-fields"><label>Método<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod | 'mixed')}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option>{advancedPosEnabled && <option value="mixed">Pago mixto</option>}</select></label><label>Descuento<input type="number" inputMode="decimal" min="0" max={subtotal / 100} step=".01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label></div>{paymentMethod === 'cash' && <section className="cash-change-box"><label>Cliente paga<input value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} type="number" inputMode="decimal" min="0" step=".01" /></label><div className="change-readout"><span>Cambio</span><b>{money(changeCents, business.currency)}</b>{missingCents > 0 && <small>Faltan {money(missingCents, business.currency)}</small>}</div></section>}{advancedPosEnabled && paymentMethod === 'mixed' && <section className="cash-change-box"><label>Importe en efectivo<input value={mixedPrimary} onChange={(event) => setMixedPrimary(event.target.value)} type="number" inputMode="decimal" min=".01" max={Math.max(0, total - 1) / 100} step=".01" /></label><label>Segundo método<select value={secondaryMethod} onChange={(event) => setSecondaryMethod(event.target.value as PaymentMethod)}><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select></label><div className="change-readout"><span>Segundo importe</span><b>{money(Math.max(0, total - mixedPrimaryCents), business.currency)}</b></div></section>}<label>Nota<input name="notes" placeholder="Opcional" /></label>{error && <p className="form-error">{error}</p>}<div className="checkout-submit-bar"><div className="cart-total"><span>Total</span><b>{money(total, business.currency)}</b></div><button className="panel-primary confirm-sale" disabled={disableConfirm}>{busy ? 'Procesando…' : 'Confirmar venta'}</button></div></form></aside></div>;
}

export function SalesHistoryView({ token, business, onOpenSale, onNewSale }: { token: string; business: Business; onOpenSale: (id: string) => void; onNewSale: () => void }) {
  const [items, setItems] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { void apiRequest<{ items: Sale[] }>(`/api/operations/sales?search=${encodeURIComponent(search)}`, {}, token).then((x) => setItems(x.items)).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar las ventas.')); }, [token, search]);
  const statusLabels: Record<Sale['status'], string> = { completed: 'Completada', partially_refunded: 'Devolución parcial', refunded: 'Devuelta', cancelled: 'Cancelada' };
  return <section className="sales-history"><div className="pos-section-head"><div><p className="panel-eyebrow">Registro inmutable</p><h2>Historial de ventas</h2></div><button className="panel-primary compact-action" onClick={onNewSale}>Nueva venta</button></div><label className="pos-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Folio o cliente" /></label>{error && <p className="panel-alert">{error}</p>}<div className="sales-list"><div className="sale-history-head"><span>Folio / fecha</span><span>Cliente</span><span>Pago</span><span>Total</span><span>Estado</span></div>{items.map((sale) => <button className="sale-history-row" key={sale.id} onClick={() => onOpenSale(sale.id)}><div><b>{sale.folio}</b><small>{date(sale.createdAt)}</small></div><span>{sale.customerName ?? 'Mostrador'}</span><span>{paymentLabels[sale.paymentMethod]}</span><strong>{money(sale.totalCents, business.currency)}</strong><em className={sale.status === 'cancelled' ? 'sale-cancelled' : 'sale-completed'}>{statusLabels[sale.status]}</em></button>)}</div>{!items.length && !error && <p className="empty-state">Aún no hay ventas registradas.</p>}</section>;
}

export function SaleDetailView({ token, saleId, role, advancedPosEnabled, onBack }: { token: string; saleId: string; role: 'admin' | 'manager' | 'staff' | 'technician' | 'viewer'; advancedPosEnabled: boolean; onBack: () => void }) {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const load = () => apiRequest<{ item: SaleDetail }>(`/api/operations/sales/${saleId}`, {}, token).then((x) => setDetail(x.item)).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar la venta.'));
  useEffect(() => { void load(); }, [saleId, token]);
  async function cancel(event: FormEvent) { event.preventDefault(); if (reason.trim().length < 3) return; setCancelling(true); setError(''); setMessage(''); try { const result = await apiRequest<{ item: { cashWarning: string | null } }>(`/api/operations/sales/${saleId}/cancel`, { method: 'POST', body: JSON.stringify({ reason, cashRegisterId: localStorage.getItem(CASH_REGISTER_KEY) || undefined }) }, token); setMessage(result.item.cashWarning ?? 'Venta cancelada y stock restaurado.'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible cancelar la venta.'); } finally { setCancelling(false); } }
  if (error && !detail) return <div className="panel-alert">{error}<button onClick={onBack}>Volver</button></div>;
  if (!detail) return <div className="panel-loading">Preparando nota…</div>;
  const b = detail.business;
  return <div className="sale-detail-layout"><div className="sale-actions-panel"><button className="text-action back-action" onClick={onBack}><ArrowLeft />Historial</button><h2>{detail.folio}</h2><span className={detail.status === 'cancelled' ? 'sale-cancelled' : 'sale-completed'}>{detail.status === 'cancelled' ? 'Venta cancelada' : detail.status === 'refunded' ? 'Venta devuelta' : detail.status === 'partially_refunded' ? 'Devolución parcial' : 'Venta completada'}</span><button className="panel-primary print-action" onClick={() => window.print()}><Printer />Imprimir nota</button>{advancedPosEnabled && ['admin', 'manager'].includes(role) && ['completed', 'partially_refunded'].includes(detail.status) && <SaleReturnForm token={token} sale={detail} onDone={async (text) => { setMessage(text); await load(); }} onError={setError} />}{role === 'admin' && detail.status === 'completed' && !detail.returns.length && <form className="cancel-sale-form" onSubmit={cancel}><label>Motivo de cancelación<textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} /></label><button disabled={cancelling}>{cancelling ? 'Cancelando…' : 'Cancelar venta completa'}</button></form>}{detail.returns.map((saleReturn) => <p key={saleReturn.id}><b>{saleReturn.folio}</b> · {money(saleReturn.totalCents, b.currency)} · {saleReturn.reason}</p>)}{message && <p className="panel-alert">{message}</p>}{error && <p className="form-error">{error}</p>}</div><article className="print-ticket"><header>{b.logoUrl && <img src={b.logoUrl} alt="" />}<h1>{b.businessName}</h1><p>{b.businessType}</p><address>{[b.address, b.city, b.state].filter(Boolean).join(' · ')}</address><b>{b.phone}</b></header><div className="ticket-meta"><span>Folio <b>{detail.folio}</b></span><span>{date(detail.createdAt)}</span><span>Atendió: {detail.userName}</span><span>Cliente: {detail.customerName ?? 'Mostrador'}</span></div><div className="ticket-items">{detail.items.map((item) => <div key={item.id}><span><b>{item.quantity} ×</b> {item.productNameSnapshot}<small>{money(item.unitPriceCents, b.currency)} c/u</small></span><strong>{money(item.subtotalCents, b.currency)}</strong></div>)}</div><div className="ticket-totals"><span>Subtotal <b>{money(detail.subtotalCents, b.currency)}</b></span>{detail.discountCents > 0 && <span>Descuento <b>-{money(detail.discountCents, b.currency)}</b></span>}<strong>Total <b>{money(detail.totalCents, b.currency)}</b></strong>{detail.payments.length ? detail.payments.map((payment) => <span key={payment.id}>{paymentLabels[payment.method]} <b>{money(payment.amountCents, b.currency)}</b></span>) : <span>Pago <b>{paymentLabels[detail.paymentMethod]}</b></span>}</div>{detail.notes && <p className="ticket-notes">{detail.notes}</p>}<footer><p>{b.ticketMessage}</p>{b.warrantyMessage && <small>{b.warrantyMessage}</small>}<em>Generado con LocalPOS</em></footer>{detail.status === 'cancelled' && <div className="ticket-void">CANCELADA</div>}</article></div>;
}

function SaleReturnForm({ token, sale, onDone, onError }: { token: string; sale: SaleDetail; onDone: (message: string) => Promise<void>; onError: (message: string) => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({}); const [busy, setBusy] = useState(false);
  const returned = new Map<string, number>(); sale.returns.forEach((row) => row.items.forEach((line) => returned.set(line.saleItemId, (returned.get(line.saleItemId) ?? 0) + line.quantity)));
  const selected = sale.items.filter((item) => (quantities[item.id] ?? 0) > 0); const grossReturnCents = selected.reduce((sum, item) => sum + item.unitPriceCents * (quantities[item.id] ?? 0), 0); const refundableCents = sale.totalCents - sale.returns.reduce((sum, row) => sum + row.totalCents, 0); const refundCents = Math.min(grossReturnCents, refundableCents);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected.length) return; const form = new FormData(event.currentTarget); setBusy(true); onError(''); try { const result = await apiRequest<{ item: { folio: string; cashWarning: string | null } }>(`/api/operations/sales/${sale.id}/returns`, { method: 'POST', body: JSON.stringify({ cashRegisterId: localStorage.getItem(CASH_REGISTER_KEY) || undefined, reason: form.get('reason'), items: selected.map((item) => ({ saleItemId: item.id, quantity: quantities[item.id] })), payments: [{ method: form.get('method'), amountCents: refundCents }] }) }, token); setQuantities({}); await onDone(result.item.cashWarning ?? `Devolución ${result.item.folio} registrada.`); } catch (reason) { onError(reason instanceof Error ? reason.message : 'No fue posible registrar la devolución.'); } finally { setBusy(false); } }
  return <form className="cancel-sale-form" onSubmit={submit}><b>Devolución parcial</b>{sale.items.map((item) => { const max = item.quantity - (returned.get(item.id) ?? 0); return max > 0 && <label key={item.id}>{item.productNameSnapshot}<input type="number" min="0" max={max} value={quantities[item.id] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))} /></label>; })}<label>Método de reembolso<select name="method"><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option></select></label><label>Motivo<textarea name="reason" minLength={3} required /></label><span>Reembolso estimado: {money(refundCents, sale.business.currency)}</span><button disabled={busy || !selected.length}>{busy ? 'Procesando…' : 'Registrar devolución'}</button></form>;
}
