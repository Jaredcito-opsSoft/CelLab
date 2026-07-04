import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Boxes, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api';

type Role = 'admin' | 'technician';
type Product = { id: string; sku: string; name: string; costCents: number; priceCents: number; stock: number; minimumStock: number; active: boolean };
type Movement = { id: string; productId: string; productName: string; userName: string; type: string; quantity: number; previousStock: number; newStock: number; referenceType: string; referenceId: string | null; notes: string | null; createdAt: string };

const money = (cents: number, currency: string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const typeLabels: Record<string, string> = { sale: 'Venta POS', sale_cancel: 'Cancelación de venta', stock_entry: 'Entrada de stock', manual_adjustment: 'Ajuste manual', service_usage: 'Uso en reparación', service_usage_void: 'Anulación de uso en reparación' };
const refTypeLabels: Record<string, string> = { sale: 'Venta', product: 'Producto', repair: 'Reparación', manual: 'Manual' };

export function InventoryMovementsView({ token, role, currency }: { token: string; role: Role; currency: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [productData, movementData] = await Promise.all([
        apiRequest<{ items: Product[] }>('/api/operations/products?limit=100', {}, token),
        apiRequest<{ items: Movement[] }>('/api/operations/inventory?limit=200', {}, token),
      ]);
      setProducts(productData.items.filter((product) => product.active));
      setMovements(movementData.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible cargar inventario.');
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== 'admin') return;
    setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const action = String(form.get('action'));
    const productId = String(form.get('productId'));
    const quantity = Number(form.get('quantity') || 0);
    const note = String(form.get('note') ?? '').trim() || null;
    const reason = String(form.get('reason') ?? '').trim() || 'Ajuste operativo';
    const unitCost = String(form.get('unitCost') ?? '').trim();
    try {
      if (action === 'entry') {
        await apiRequest('/api/operations/inventory/stock-entry', { method: 'POST', body: JSON.stringify({ productId, quantity, unitCostCents: unitCost ? Math.round(Number(unitCost) * 100) : undefined, note }) }, token);
      } else if (action === 'exit') {
        await apiRequest('/api/operations/inventory/stock-exit', { method: 'POST', body: JSON.stringify({ productId, quantity, reason, note }) }, token);
      } else {
        await apiRequest('/api/operations/inventory/adjust', { method: 'POST', body: JSON.stringify({ productId, type: action.replace('adjust-', ''), quantity, reason, note }) }, token);
      }
      event.currentTarget.reset();
      setMessage('Movimiento registrado y stock actualizado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible registrar el movimiento.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inventory-view">
      <section className="inventory-control-card">
        <div className="repair-card-heading"><Boxes /><div><p className="panel-eyebrow">Inventario LocalPOS</p><h2>Movimientos controlados de stock</h2></div></div>
        {role === 'admin' ? <form className="ops-form inventory-action-form" onSubmit={submit}><label className="wide">Producto<select name="productId" required><option value="">Selecciona producto…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.stock} · costo {money(product.costCents, currency)}</option>)}</select></label><label>Operación<select name="action" defaultValue="entry"><option value="entry">Entrada de stock</option><option value="exit">Salida de stock</option><option value="adjust-increase">Ajuste: aumentar</option><option value="adjust-decrease">Ajuste: disminuir</option><option value="adjust-set">Ajuste: fijar existencia</option></select></label><label>Cantidad<input name="quantity" type="number" min="0" defaultValue="1" required /></label><label>Costo unitario<input name="unitCost" type="number" min="0" step=".01" placeholder="Solo entradas" /></label><label>Motivo<input name="reason" placeholder="Compra, merma, conteo físico…" /></label><label className="wide">Nota<input name="note" placeholder="Detalle opcional" /></label><div className="form-actions"><button className="panel-primary" disabled={busy}><RefreshCw />Registrar movimiento</button></div></form> : <p className="inventory-readonly">Tu rol puede consultar movimientos, pero solo admin puede modificar existencias.</p>}
        {message && <p className="settings-message">{message}</p>}{error && <p className="form-error">{error}</p>}
      </section>

      <section className="records-panel inventory-movement-panel">
        <div className="data-head movement-row"><span>Movimiento</span><span>Stock</span><span>Referencia</span><span>Usuario</span></div>
        {movements.length === 0 && <p className="empty-state">Aún no hay movimientos registrados.</p>}
        {movements.map((movement) => {
          const isIncrease = movement.newStock > movement.previousStock;
          const product = productMap.get(movement.productId);
          return <article className="data-row movement-row" key={movement.id}><div><b>{isIncrease ? <ArrowUpCircle /> : <ArrowDownCircle />}{typeLabels[movement.type] ?? movement.type}</b><span>{movement.productName}{product?.sku ? ` · ${product.sku}` : ''}</span><small>{movement.notes}</small></div><div><b>{movement.previousStock} → {movement.newStock}</b><span>{movement.quantity} pzas.</span></div><div><span>{refTypeLabels[movement.referenceType] ?? movement.referenceType}</span><small>{date(movement.createdAt)}</small></div><span>{movement.userName}</span></article>;
        })}
      </section>
    </div>
  );
}
