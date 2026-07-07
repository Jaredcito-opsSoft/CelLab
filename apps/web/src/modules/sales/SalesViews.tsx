import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, Printer, Search, ShoppingBag, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';

type Product = { id: string; sku: string; name: string; priceCents: number; stock: number; active: boolean };
type Client = { id: string; name: string; phone: string };
type Business = { businessName: string; businessType: string; logoUrl: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; ticketMessage: string | null; warrantyMessage: string | null; currency: string; primaryColor: string; requireOpenCashForMoneyOperations: boolean };
type Sale = { id: string; folio: string; customerId: string | null; customerName: string | null; customerPhone: string | null; userName: string; subtotalCents: number; discountCents: number; totalCents: number; paymentMethod: 'cash' | 'transfer' | 'card'; status: 'completed' | 'cancelled'; notes: string | null; createdAt: string };
type SaleItem = { id: string; productId: string; productNameSnapshot: string; quantity: number; unitPriceCents: number; subtotalCents: number };
type SaleDetail = Sale & { items: SaleItem[]; business: Business };
type CartItem = Product & { quantity: number };

const paymentLabels: Record<string, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' };
const money = (cents: number, currency: string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function QuickSaleView({ token, business, onOpenSale, onOpenHistory }: { token: string; business: Business; onOpenSale: (id: string) => void; onOpenHistory: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cashStatus, setCashStatus] = useState<'open' | 'closed' | 'unknown'>('unknown');
  const [successSale, setSuccessSale] = useState<{ id: string; folio: string; totalCents: number; paymentMethod: string; cashWarning: string | null } | null>(null);

  useEffect(() => {
    void Promise.all([
      apiRequest<{ items: Product[] }>('/api/operations/products?limit=100', {}, token),
      apiRequest<{ items: Client[] }>('/api/operations/clients?limit=100', {}, token),
    ]).then(([p, c]) => { setProducts(p.items.filter((x) => x.active)); setClients(c.items); }).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar catálogo.'));
    void apiRequest<{ item: unknown | null }>('/api/operations/cash/current', {}, token).then((res) => setCashStatus(res.item ? 'open' : 'closed')).catch(() => setCashStatus('unknown'));
  }, [token]);

  const visible = useMemo(() => products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const discountCents = Math.round(Number(discount || 0) * 100);
  const total = Math.max(0, subtotal - discountCents);
  const amountPaidCents = Math.round(Number(amountPaid || 0) * 100);
  const changeCents = paymentMethod === 'cash' ? Math.max(0, amountPaidCents - total) : 0;
  const missingCents = paymentMethod === 'cash' && amountPaid.trim() ? Math.max(0, total - amountPaidCents) : 0;

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
    const product = products.find((item) => item.active && (item.sku.toLowerCase() === query || item.id.toLowerCase() === query)) ?? products.find((item) => item.active && `${item.name} ${item.sku}`.toLowerCase().includes(query));
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
    event.preventDefault(); if (!cart.length) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ item: { id: string; folio: string; totalCents: number; paymentMethod: string; cashWarning: string | null } }>('/api/operations/sales', { method: 'POST', body: JSON.stringify({ customerId: form.get('customerId') || null, paymentMethod, discountCents, notes: form.get('notes') || null, items: cart.map((x) => ({ productId: x.id, quantity: x.quantity })) }) }, token);
      setCart([]); setDiscount('0'); setAmountPaid(''); setSuccessSale(result.item);
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible confirmar la venta.'); } finally { setBusy(false); }
  }

  if (successSale) return <div className="pos-success-screen"><ShoppingBag size={42} /><h2>Venta registrada con éxito</h2><p>Folio {successSale.folio} · {money(successSale.totalCents, business.currency)} · {paymentLabels[successSale.paymentMethod] ?? successSale.paymentMethod}</p>{successSale.cashWarning && <p className="panel-alert">{successSale.cashWarning}</p>}<div className="form-actions"><button className="panel-primary" onClick={() => onOpenSale(successSale.id)}><Printer />Ver nota / imprimir</button><button onClick={() => setSuccessSale(null)}>Nueva venta</button><button onClick={() => { setSuccessSale(null); onOpenHistory(); }}>Historial</button></div></div>;

  const policyActive = business.requireOpenCashForMoneyOperations;
  const disableConfirm = !cart.length || busy || (cashStatus === 'closed' && policyActive) || missingCents > 0;
  const cashAlert = cashStatus === 'closed' ? (policyActive ? 'Caja cerrada: abre caja antes de vender.' : 'Aviso: no hay caja abierta; la venta quedará fuera del corte actual.') : cashStatus === 'open' ? 'Caja abierta: la venta se vinculará al corte activo.' : null;

  return <div className="pos-shell"><section className="product-shelf"><div className="pos-section-head"><div><p className="panel-eyebrow">Mostrador rápido</p><h2>Busca, agrega y cobra</h2></div><button className="text-action" onClick={onOpenHistory}>Ver historial</button></div><form className="quick-scan-bar" onSubmit={quickAdd}><label>SKU / ID / producto<input value={quickCode} onChange={(e) => setQuickCode(e.target.value)} placeholder="Escanea o escribe" autoComplete="off" /></label><label className="quick-scan-qty">Cant.<input value={quickQty} onChange={(e) => setQuickQty(e.target.value)} type="number" min="1" step="1" /></label><button className="panel-primary" type="submit">Agregar</button></form><label className="pos-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar catálogo por nombre o SKU" /></label><div className="product-pick-grid">{visible.map((product) => <button className="product-pick" key={product.id} disabled={product.stock === 0} onClick={() => add(product)}><span>{product.sku}</span><b>{product.name}</b><strong>{money(product.priceCents, business.currency)}</strong><small className={product.stock <= 3 ? 'is-low' : ''}>{product.stock ? `${product.stock} disponibles` : 'Sin stock'}</small><Plus /></button>)}</div>{!visible.length && <p className="empty-state">No hay productos que coincidan con la búsqueda.</p>}</section><aside className="cart-receipt"><div className="receipt-heading"><span>Venta en curso</span><b>{String(cart.reduce((n, x) => n + x.quantity, 0)).padStart(2, '0')} artículos</b></div><div className="cart-lines">{cart.map((item) => <article key={item.id}><div><b>{item.name}</b><small>{money(item.priceCents, business.currency)} c/u</small></div><div className="quantity-control"><button type="button" onClick={() => quantity(item.id, item.quantity - 1)}><Minus /></button><input aria-label={`Cantidad ${item.name}`} type="number" min="1" max={item.stock} step="1" value={item.quantity} onChange={(e) => quantity(item.id, Number(e.target.value || 1))} /><button type="button" onClick={() => quantity(item.id, item.quantity + 1)}><Plus /></button></div><strong>{money(item.priceCents * item.quantity, business.currency)}</strong><button type="button" className="remove-line" onClick={() => setCart((current) => current.filter((x) => x.id !== item.id))}><X /></button></article>)}</div>{!cart.length && <div className="cart-empty"><ShoppingBag /><p>Agrega un producto para iniciar la venta.</p></div>}<form className="checkout-form" onSubmit={confirmSale}>{cashAlert && <p className="panel-alert">{cashAlert}</p>}<label>Cliente opcional<select name="customerId"><option value="">Venta de mostrador</option>{clients.map((c) => <option value={c.id} key={c.id}>{c.name} · {c.phone}</option>)}</select></label><div className="checkout-fields"><label>Método<select name="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer' | 'card')}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option></select></label><label>Descuento<input name="discount" type="number" min="0" max={subtotal / 100} step=".01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label></div>{paymentMethod === 'cash' && <section className="cash-change-box"><label>Cliente paga<input value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} type="number" min="0" step=".01" placeholder="0.00" /></label><div className="change-readout"><span>Cambio</span><b>{money(changeCents, business.currency)}</b>{missingCents > 0 && <small>Faltan {money(missingCents, business.currency)}</small>}</div><div className="cash-quick-buttons"><button type="button" onClick={() => setAmountPaid(String((total / 100).toFixed(2)))}>Exacto</button><button type="button" onClick={() => setAmountPaid(String(((total + 5000) / 100).toFixed(2)))}>+50</button><button type="button" onClick={() => setAmountPaid(String(((total + 10000) / 100).toFixed(2)))}>+100</button></div></section>}<label>Nota<input name="notes" placeholder="Opcional" /></label>{error && <p className="form-error">{error}</p>}<div className="cart-total"><span>Total</span><b>{money(total, business.currency)}</b></div><button className="panel-primary confirm-sale" disabled={disableConfirm}>{busy ? 'Procesando…' : 'Confirmar venta'}</button></form></aside></div>;
}

export function SalesHistoryView({ token, business, onOpenSale, onNewSale }: { token: string; business: Business; onOpenSale: (id: string) => void; onNewSale: () => void }) {
  const [items, setItems] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { void apiRequest<{ items: Sale[] }>(`/api/operations/sales?search=${encodeURIComponent(search)}`, {}, token).then((x) => setItems(x.items)).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar las ventas.')); }, [token, search]);
  return <section className="sales-history"><div className="pos-section-head"><div><p className="panel-eyebrow">Registro inmutable</p><h2>Historial de ventas</h2></div><button className="panel-primary compact-action" onClick={onNewSale}>Nueva venta</button></div><label className="pos-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Folio o cliente" /></label>{error && <p className="panel-alert">{error}</p>}<div className="sales-list"><div className="sale-history-head"><span>Folio / fecha</span><span>Cliente</span><span>Pago</span><span>Total</span><span>Estado</span></div>{items.map((sale) => <button className="sale-history-row" key={sale.id} onClick={() => onOpenSale(sale.id)}><div><b>{sale.folio}</b><small>{date(sale.createdAt)}</small></div><span>{sale.customerName ?? 'Mostrador'}</span><span>{paymentLabels[sale.paymentMethod]}</span><strong>{money(sale.totalCents, business.currency)}</strong><em className={sale.status === 'cancelled' ? 'sale-cancelled' : 'sale-completed'}>{sale.status === 'cancelled' ? 'Cancelada' : 'Completada'}</em></button>)}</div>{!items.length && !error && <p className="empty-state">Aún no hay ventas registradas.</p>}</section>;
}

export function SaleDetailView({ token, saleId, role, onBack }: { token: string; saleId: string; role: 'admin' | 'manager' | 'staff' | 'technician' | 'viewer'; onBack: () => void }) {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const load = () => apiRequest<{ item: SaleDetail }>(`/api/operations/sales/${saleId}`, {}, token).then((x) => setDetail(x.item)).catch((e) => setError(e instanceof Error ? e.message : 'No fue posible cargar la venta.'));
  useEffect(() => { void load(); }, [saleId, token]);
  async function cancel(event: FormEvent) { event.preventDefault(); if (reason.trim().length < 3) return; setCancelling(true); setError(''); setMessage(''); try { const result = await apiRequest<{ item: { cashWarning: string | null } }>(`/api/operations/sales/${saleId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }, token); setMessage(result.item.cashWarning ?? 'Venta cancelada y stock restaurado.'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible cancelar la venta.'); } finally { setCancelling(false); } }
  if (error && !detail) return <div className="panel-alert">{error}<button onClick={onBack}>Volver</button></div>;
  if (!detail) return <div className="panel-loading">Preparando nota…</div>;
  const b = detail.business;
  return <div className="sale-detail-layout"><div className="sale-actions-panel"><button className="text-action back-action" onClick={onBack}><ArrowLeft />Historial</button><h2>{detail.folio}</h2><span className={detail.status === 'cancelled' ? 'sale-cancelled' : 'sale-completed'}>{detail.status === 'cancelled' ? 'Venta cancelada' : 'Venta completada'}</span><button className="panel-primary print-action" onClick={() => window.print()}><Printer />Imprimir nota</button>{role === 'admin' && detail.status === 'completed' && <form className="cancel-sale-form" onSubmit={cancel}><label>Motivo de cancelación<textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} /></label><button disabled={cancelling}>{cancelling ? 'Cancelando…' : 'Cancelar y regresar stock'}</button></form>}{message && <p className="panel-alert">{message}</p>}{error && <p className="form-error">{error}</p>}</div><article className="print-ticket"><header>{b.logoUrl && <img src={b.logoUrl} alt="" />}<h1>{b.businessName}</h1><p>{b.businessType}</p><address>{[b.address, b.city, b.state].filter(Boolean).join(' · ')}</address><b>{b.phone}</b></header><div className="ticket-meta"><span>Folio <b>{detail.folio}</b></span><span>{date(detail.createdAt)}</span><span>Atendió: {detail.userName}</span><span>Cliente: {detail.customerName ?? 'Mostrador'}</span></div><div className="ticket-items">{detail.items.map((item) => <div key={item.id}><span><b>{item.quantity} ×</b> {item.productNameSnapshot}<small>{money(item.unitPriceCents, b.currency)} c/u</small></span><strong>{money(item.subtotalCents, b.currency)}</strong></div>)}</div><div className="ticket-totals"><span>Subtotal <b>{money(detail.subtotalCents, b.currency)}</b></span>{detail.discountCents > 0 && <span>Descuento <b>-{money(detail.discountCents, b.currency)}</b></span>}<strong>Total <b>{money(detail.totalCents, b.currency)}</b></strong><span>Pago <b>{paymentLabels[detail.paymentMethod]}</b></span></div>{detail.notes && <p className="ticket-notes">{detail.notes}</p>}<footer><p>{b.ticketMessage}</p>{b.warrantyMessage && <small>{b.warrantyMessage}</small>}<em>Generado con LocalPOS</em></footer>{detail.status === 'cancelled' && <div className="ticket-void">CANCELADA</div>}</article></div>;
}
