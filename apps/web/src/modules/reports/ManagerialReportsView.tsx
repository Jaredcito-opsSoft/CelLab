import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, PackageSearch, RefreshCw, TrendingUp, WalletCards } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import '../../styles/reports.css';

type Report = {
  range: { from: string; to: string; timezone: string };
  sales: { completedCount: number; grossSubtotalCents: number; discountsCents: number; grossSalesCents: number; returnsCount: number; returnedSalesCents: number; netSalesCents: number; grossCostCents: number; returnedCostCents: number; netCostCents: number; grossProfitCents: number; grossMarginBps: number; cancellationsCount: number; cancellationsCents: number };
  payments: { method: string; collectedCents: number; refundedCents: number; netCents: number }[];
  topProducts: { productId: string; name: string; grossQuantity: number; returnedQuantity: number; netQuantity: number; netRevenueCents: number }[];
  inventory: { productsCount: number; lowStockCount: number; unitsOnHand: number; costValueCents: number; retailValueCents: number; productsWithoutSales: { productId: string; name: string; sku: string; stock: number; lastSaleAt?: string | null }[] };
  repairs: { openCount: number; deliveredCount: number; billedCents: number; costCents: number; grossProfitCents: number; grossMarginBps: number };
  layaways: { activeCount: number; overdueCount: number; activeBalanceCents: number };
  cash: { closedSessionsCount: number; differenceCents: number; absoluteDifferenceCents: number };
};

const iso = (date: Date) => date.toISOString().slice(0, 10);
const paymentLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };

export function ManagerialReportsView({ token, currency }: { token: string; currency: string }) {
  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const [from, setFrom] = useState(iso(monthStart));
  const [to, setTo] = useState(iso(now));
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const money = useCallback((cents: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100), [currency]);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setReport(await apiRequest<Report>(`/api/operations/reports/managerial?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {}, token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible preparar el reporte.');
    } finally {
      setBusy(false);
    }
  }, [from, to, token]);

  useEffect(() => { void load(); }, [load]);

  function submit(event: FormEvent) { event.preventDefault(); void load(); }
  async function exportCsv() {
    setError('');
    try {
      const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const response = await fetch(`${base}/api/operations/reports/managerial.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('No fue posible exportar el reporte.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `localpos-reporte-${from}-${to}.csv`; anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible exportar el reporte.'); }
  }

  return <section className="managerial-reports">
    <header className="managerial-reports__command">
      <div><p className="panel-eyebrow">Control gerencial</p><h2>Qué vendimos, cuánto dejó y qué requiere atención</h2><p>Indicadores construidos con ventas, devoluciones, costos históricos, caja e inventario.</p></div>
      <form className="managerial-reports__filter" onSubmit={submit}>
        <label>Desde<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>Hasta<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
        <button className="panel-primary" disabled={busy}>{busy ? <RefreshCw className="spin" /> : <BarChart3 />}{busy ? 'Calculando' : 'Actualizar'}</button>
        <button type="button" className="managerial-reports__export" onClick={exportCsv} disabled={!report}><Download />CSV</button>
      </form>
    </header>
    {error && <p className="panel-alert" role="alert">{error}</p>}
    {!report && busy && <div className="managerial-reports__loading">Consolidando operación…</div>}
    {report && <>
      <div className="managerial-kpis">
        <article className="managerial-kpi managerial-kpi--primary"><span>Venta neta</span><strong>{money(report.sales.netSalesCents)}</strong><small>{report.sales.completedCount} ventas · después de devoluciones</small></article>
        <article><span>Utilidad bruta</span><strong>{money(report.sales.grossProfitCents)}</strong><small>Margen {(report.sales.grossMarginBps / 100).toFixed(1)}%</small></article>
        <article><span>Devoluciones</span><strong>{money(report.sales.returnedSalesCents)}</strong><small>{report.sales.returnsCount} devoluciones · {report.sales.cancellationsCount} cancelaciones</small></article>
        <article><span>Inventario a costo</span><strong>{money(report.inventory.costValueCents)}</strong><small>{report.inventory.lowStockCount} productos en nivel bajo</small></article>
      </div>
      <div className="managerial-grid">
        <article className="managerial-card"><header><WalletCards /><div><h3>Cobros por método</h3><p>Ingreso neto después de reembolsos</p></div></header><div className="managerial-payment-list">{report.payments.length ? report.payments.map((item) => <div key={item.method}><span>{paymentLabel[item.method] ?? item.method}</span><strong>{money(item.netCents)}</strong></div>) : <p>Sin cobros en el rango.</p>}</div></article>
        <article className="managerial-card"><header><TrendingUp /><div><h3>Productos líderes</h3><p>Unidades netas y venta neta</p></div></header><div className="managerial-ranking">{report.topProducts.length ? report.topProducts.map((item, index) => <div key={item.productId}><b>{index + 1}</b><span><strong>{item.name}</strong><small>{item.netQuantity} unidades netas{item.returnedQuantity ? ` · ${item.returnedQuantity} devueltas` : ''}</small></span><em>{money(item.netRevenueCents)}</em></div>) : <p>Sin productos vendidos en el rango.</p>}</div></article>
        <article className="managerial-card managerial-card--attention"><header><PackageSearch /><div><h3>Atención operativa</h3><p>Dinero inmovilizado y compromisos</p></div></header><dl><div><dt>Apartados activos</dt><dd>{report.layaways.activeCount}</dd></div><div><dt>Saldo por cobrar</dt><dd>{money(report.layaways.activeBalanceCents)}</dd></div><div><dt>Reparaciones abiertas</dt><dd>{report.repairs.openCount}</dd></div><div><dt>Diferencias de caja</dt><dd>{money(report.cash.differenceCents)}</dd></div></dl></article>
      </div>
      <article className="managerial-card managerial-slow"><header><PackageSearch /><div><h3>Inventario sin salida</h3><p>Productos con existencia y sin venta durante el periodo</p></div></header>{report.inventory.productsWithoutSales.length ? <div className="managerial-slow__table"><div className="managerial-slow__head"><span>Producto</span><span>Existencia</span><span>Última venta</span></div>{report.inventory.productsWithoutSales.map((item) => <div key={item.productId}><span><strong>{item.name}</strong><small>{item.sku}</small></span><b>{item.stock}</b><time>{item.lastSaleAt ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(item.lastSaleAt)) : 'Sin ventas en el rango'}</time></div>)}</div> : <p className="empty-state">No hay inventario inmóvil para este rango.</p>}</article>
    </>}
  </section>;
}
