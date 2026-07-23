import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Banknote, DoorOpen, MinusCircle, PlusCircle, Printer, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import '../../styles/responsive-operations.css';

type Role = 'admin' | 'manager' | 'staff' | 'technician' | 'viewer';
type Business = { businessName: string; logoUrl: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; currency: string; ticketMessage: string | null };
type CashSummary = { expectedCashCents: number; countedCashCents: number | null; differenceCents: number | null; cashInCents: number; transferInCents: number; cardInCents: number; otherInCents: number; totalCollectedCents: number; salesTotalCents: number; repairsTotalCents: number; manualOutTotalCents: number; cancellationsTotalCents: number; voidsTotalCents: number };
type CashMovement = { id: string; type: string; method: string; amountCents: number; direction: 'in' | 'out'; referenceFolio: string | null; reason: string | null; note: string | null; createdAt: string; userName: string };
type CashSession = { id: string; status: 'open' | 'closed'; openedAt: string; closedAt: string | null; openingCashCents: number; expectedCashCents: number; countedCashCents: number | null; differenceCents: number | null; notes: string | null; openedByName: string; closedByName: string | null; summary: CashSummary; movements: CashMovement[] };
type CashListItem = { id: string; status: 'open' | 'closed'; openedAt: string; closedAt: string | null; expectedCashCents: number; countedCashCents: number | null; differenceCents: number | null; openedByName: string };
type CashRangeSummary = { sessionsCount: number; summary: CashSummary };
type CashRegister = { id: string; code: string; name: string; active: boolean; isDefault: boolean; openSession: { id: string } | null };

const movementLabels: Record<string, string> = { opening_cash: 'Apertura de caja', sale_payment: 'Cobro de venta', repair_payment: 'Cobro de reparación', manual_in: 'Entrada manual', manual_out: 'Salida manual', sale_cancel: 'Cancelación de venta', repair_payment_void: 'Anulación de pago', adjustment: 'Ajuste administrativo' };
const methodLabels: Record<string, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', other: 'Otro' };
const money = (cents = 0, currency = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const cents = (value: FormDataEntryValue | null) => Math.round(Number(value || 0) * 100);
const CASH_REGISTER_KEY = 'localpos-cash-register-id';

export function CashView({ token, role, business }: { token: string; role: Role; business: Business | null }) {
  const currency = business?.currency ?? 'MXN';
  const canManageCash = role === 'admin' || role === 'manager';
  const [current, setCurrent] = useState<CashSession | null>(null);
  const [selected, setSelected] = useState<CashSession | null>(null);
  const [sessions, setSessions] = useState<CashListItem[]>([]);
  const [summaries, setSummaries] = useState<Record<string, CashRangeSummary | null>>({ today: null, week: null, month: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [cashRegisterId, setCashRegisterId] = useState(() => localStorage.getItem(CASH_REGISTER_KEY) ?? '');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const registerParam = cashRegisterId ? `cashRegisterId=${encodeURIComponent(cashRegisterId)}&` : '';
      const [currentRes, sessionsRes, today, week, month, registerRes] = await Promise.all([
        apiRequest<{ item: CashSession | null }>(`/api/operations/cash/current?${registerParam}`, {}, token),
        apiRequest<{ items: CashListItem[] }>(`/api/operations/cash/sessions?${registerParam}limit=30`, {}, token),
        apiRequest<{ item: CashRangeSummary }>('/api/operations/cash/summary?range=today', {}, token),
        apiRequest<{ item: CashRangeSummary }>('/api/operations/cash/summary?range=week', {}, token),
        apiRequest<{ item: CashRangeSummary }>('/api/operations/cash/summary?range=month', {}, token),
        apiRequest<{ items: CashRegister[] }>('/api/operations/cash/registers', {}, token),
      ]);
      setCurrent(currentRes.item);
      setSessions(sessionsRes.items);
      setSummaries({ today: today.item, week: week.item, month: month.item });
      setSelected((prev) => prev ?? currentRes.item);
      setRegisters(registerRes.items);
      if (!cashRegisterId) {
        const initial = registerRes.items.find((register) => register.isDefault && register.active) ?? registerRes.items.find((register) => register.active);
        if (initial) setCashRegisterId(initial.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible cargar caja.');
    } finally {
      setBusy(false);
    }
  }, [token, cashRegisterId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (cashRegisterId) localStorage.setItem(CASH_REGISTER_KEY, cashRegisterId); }, [cashRegisterId]);

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const res = await apiRequest<{ item: CashSession }>('/api/operations/cash/open', { method: 'POST', body: JSON.stringify({ cashRegisterId, openingCashCents: cents(form.get('openingCash')), notes: form.get('notes') || null }) }, token);
      setCurrent(res.item); setSelected(res.item); setMessage('Caja abierta.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible abrir caja.'); } finally { setBusy(false); }
  }

  async function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest('/api/operations/cash/manual-movement', { method: 'POST', body: JSON.stringify({ cashRegisterId, type: form.get('type'), method: form.get('method'), amountCents: cents(form.get('amount')), reason: form.get('reason'), note: form.get('note') || null }) }, token);
      event.currentTarget.reset(); setMessage('Movimiento registrado.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible registrar el movimiento.'); } finally { setBusy(false); }
  }

  async function close(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const res = await apiRequest<{ item: CashSession }>('/api/operations/cash/close', { method: 'POST', body: JSON.stringify({ cashRegisterId, countedCashCents: cents(form.get('countedCash')), notes: form.get('notes') || null }) }, token);
      setCurrent(null); setSelected(res.item); setMessage('Caja cerrada.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible cerrar caja.'); } finally { setBusy(false); }
  }

  async function openDetail(id: string) {
    try { const res = await apiRequest<{ item: CashSession }>(`/api/operations/cash/sessions/${id}`, {}, token); setSelected(res.item); }
    catch (e) { setError(e instanceof Error ? e.message : 'No fue posible cargar el corte.'); }
  }

  async function createRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ item: CashRegister }>('/api/operations/cash/registers', { method: 'POST', body: JSON.stringify({ code: form.get('code'), name: form.get('name') }) }, token);
      setCashRegisterId(result.item.id);
      event.currentTarget.reset();
      setMessage('Caja física creada. Ya puedes abrir su turno.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible crear la caja física.'); }
    finally { setBusy(false); }
  }

  const printable = selected ?? current;

  return (
    <div className="cash-workbench">
      <section className="cash-hero"><div><p className="panel-eyebrow">Núcleo LocalPOS</p><h2>Caja y cortes</h2><p>Controla efectivo, transferencias, tarjeta, entradas, salidas y diferencia al cierre.</p></div><button className="text-action" onClick={() => void load()} disabled={busy}><RefreshCw />Actualizar</button></section><section className="cash-register-bar"><label>Caja física<select value={cashRegisterId} onChange={(event) => { setSelected(null); setCashRegisterId(event.target.value); }}>{registers.filter((register) => register.active).map((register) => <option value={register.id} key={register.id}>{register.name} · {register.code}{register.openSession ? ' · abierta' : ' · cerrada'}</option>)}</select></label>{canManageCash && registers.length < 10 && <form onSubmit={createRegister}><input name="code" placeholder="CAJA-02" required /><input name="name" placeholder="Caja terraza" required /><button disabled={busy}>Agregar caja</button></form>}</section>
      {error && <p className="panel-alert">{error}</p>}{message && <p className="settings-message">{message}</p>}

      {!current && <section className="cash-open-card"><div><DoorOpen /><h3>No hay caja abierta</h3><p>Abre caja para empezar el turno operativo.</p></div>{canManageCash ? <form className="ops-form compact-form" onSubmit={open}><label>Efectivo inicial<input name="openingCash" type="number" min="0" step=".01" defaultValue="500" required /></label><label>Nota<input name="notes" placeholder="Inicio de turno" /></label><button className="panel-primary" disabled={busy}>Abrir caja</button></form> : <p className="cash-readonly">Solo admin o manager pueden abrir caja.</p>}</section>}

      {current && <section className="cash-current"><div className="cash-status-card"><span>Caja abierta</span><h3>{date(current.openedAt)}</h3><p>Abrió: {current.openedByName}</p><small>Efectivo inicial {money(current.openingCashCents, currency)}</small></div><Kpis summary={current.summary} currency={currency} /><div className="cash-actions-grid"><form className="ops-form compact-form" onSubmit={manual}><h3><PlusCircle />Entrada / salida</h3><label>Tipo<select name="type" defaultValue="manual_in"><option value="manual_in">Entrada</option><option value="manual_out">Salida</option></select></label><label>Método<select name="method" defaultValue="cash"><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option><option value="other">Otro</option></select></label><label>Monto<input name="amount" type="number" min=".01" step=".01" required /></label><label>Motivo<input name="reason" required /></label><label>Nota<input name="note" /></label><button disabled={busy || !canManageCash}>{canManageCash ? 'Registrar movimiento' : 'Solo admin/manager'}</button></form>{canManageCash && <form className="ops-form compact-form close-form" onSubmit={close}><h3><MinusCircle />Cerrar caja</h3><p>Efectivo esperado: <b>{money(current.summary.expectedCashCents, currency)}</b></p><label>Efectivo contado<input name="countedCash" type="number" min="0" step=".01" required /></label><label>Nota de cierre<input name="notes" /></label><button className="panel-primary" disabled={busy}>Cerrar caja</button></form>}</div><MovementList movements={current.movements} currency={currency} /></section>}

      <section className="cash-summary-ranges"><RangeCard title="Hoy" data={summaries.today} currency={currency} /><RangeCard title="Semana" data={summaries.week} currency={currency} /><RangeCard title="Mes" data={summaries.month} currency={currency} /></section>
      <section className="cash-history"><div className="pos-section-head"><div><p className="panel-eyebrow">Historial</p><h2>Cortes anteriores</h2></div>{printable && <button className="panel-primary compact-action" onClick={() => window.print()}><Printer />Imprimir corte</button>}</div><div className="sales-list"><div className="cash-session-head"><span>Fecha</span><span>Abrió</span><span>Esperado</span><span>Contado</span><span>Diferencia</span><span>Estado</span></div>{sessions.map((session) => <button className="cash-session-row" key={session.id} onClick={() => void openDetail(session.id)}><span>{date(session.openedAt)}</span><span>{session.openedByName}</span><strong>{money(session.expectedCashCents, currency)}</strong><strong>{session.countedCashCents === null ? '—' : money(session.countedCashCents, currency)}</strong><em>{session.differenceCents === null ? 'Abierta' : money(session.differenceCents, currency)}</em><b>{session.status === 'open' ? 'Abierta' : 'Cerrada'}</b></button>)}</div></section>
      {printable && <PrintCashCut session={printable} business={business} currency={currency} />}
    </div>
  );
}

function Kpis({ summary, currency }: { summary: CashSummary; currency: string }) { return <div className="cash-kpi-grid"><article><span>Efectivo esperado</span><b>{money(summary.expectedCashCents, currency)}</b></article><article><span>Total cobrado</span><b>{money(summary.totalCollectedCents, currency)}</b></article><article><span>Transferencia</span><b>{money(summary.transferInCents, currency)}</b></article><article><span>Tarjeta</span><b>{money(summary.cardInCents, currency)}</b></article><article><span>Salidas</span><b>{money(summary.manualOutTotalCents + summary.cancellationsTotalCents + summary.voidsTotalCents, currency)}</b></article></div>; }
function MovementList({ movements, currency }: { movements: CashMovement[]; currency: string }) { return <article className="recent-panel cash-movements"><h3>Movimientos del turno</h3>{movements.length ? movements.map((m) => <div className="activity-row cash-movement-row" key={m.id}><span><b>{movementLabels[m.type] ?? m.type}</b><small>{date(m.createdAt)} · {m.userName} · {m.referenceFolio ?? m.reason ?? 'Sin referencia'}</small></span><em>{methodLabels[m.method] ?? m.method}</em><strong>{m.direction === 'in' ? '+' : '-'}{money(m.amountCents, currency)}</strong></div>) : <p className="empty-state">Sin movimientos todavía.</p>}</article>; }
function RangeCard({ title, data, currency }: { title: string; data: CashRangeSummary | null; currency: string }) { const s = data?.summary; return <article className="cash-range-card"><span>{title}</span><b>{money(s?.totalCollectedCents ?? 0, currency)}</b><small>{data?.sessionsCount ?? 0} cortes · ventas {money(s?.salesTotalCents ?? 0, currency)} · reparaciones {money(s?.repairsTotalCents ?? 0, currency)}</small></article>; }
function PrintCashCut({ session, business, currency }: { session: CashSession; business: Business | null; currency: string }) { const s = session.summary; return <article className="cash-print"><header>{business?.logoUrl && <img src={business.logoUrl} alt="" />}<h1>{business?.businessName ?? 'LocalPOS'}</h1><p>Corte de caja</p><address>{[business?.address, business?.city, business?.state].filter(Boolean).join(' · ')}</address></header><section><h2>Turno</h2><p>Apertura: {date(session.openedAt)} · {session.openedByName}</p><p>Cierre: {session.closedAt ? date(session.closedAt) : 'Caja abierta'} · {session.closedByName ?? '—'}</p></section><section><h2>Resumen</h2><p>Inicial: {money(session.openingCashCents, currency)} · Esperado: {money(s.expectedCashCents, currency)} · Contado: {s.countedCashCents === null ? '—' : money(s.countedCashCents, currency)}</p><p>Diferencia: {s.differenceCents === null ? '—' : money(s.differenceCents, currency)}</p></section><footer><p>{business?.ticketMessage}</p></footer></article>; }
