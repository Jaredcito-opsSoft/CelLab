import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { UserRole } from '../users/UserAdminView';

type ClaimStatus = 'opened' | 'under_review' | 'approved' | 'rejected' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
type WarrantyListItem = {
  id: string; folio: string; repairId: string; repairFolio: string; clientName: string; clientPhone: string;
  status: ClaimStatus; claimReason: string; brand: string; model: string; openedAt: string; resolvedAt: string | null; updatedAt: string;
};
type EligibleRepair = {
  id: string; folio: string; brand: string; model: string; warrantyUntil: string; clientName: string; clientPhone: string;
};
type WarrantyEvent = {
  id: string; fromStatus: ClaimStatus | null; toStatus: ClaimStatus; note: string | null; evidenceText: string | null; createdAt: string; userName: string;
};
type WarrantyDetail = WarrantyListItem & {
  intakeEvidence: string | null; diagnosis: string | null; resolution: string | null; rejectionReason: string | null;
  warrantyUntil: string | null; receivedByName: string | null; assignedToName: string | null; resolvedByName: string | null; events: WarrantyEvent[];
};

const statusLabels: Record<ClaimStatus, string> = {
  opened: 'Recibido', under_review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado', in_progress: 'En proceso',
  resolved: 'Resuelto', closed: 'Cerrado', cancelled: 'Cancelado',
};
const nextStatuses: Record<ClaimStatus, ClaimStatus[]> = {
  opened: ['under_review', 'approved', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected', 'cancelled'], approved: ['in_progress', 'cancelled'], rejected: [],
  in_progress: ['resolved', 'cancelled'], resolved: ['closed'], closed: [], cancelled: [],
};
const managerOnly = new Set<ClaimStatus>(['approved', 'rejected', 'closed', 'cancelled']);
const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function WarrantyViews({ token, role }: { token: string; role: UserRole }) {
  const [items, setItems] = useState<WarrantyListItem[]>([]);
  const [eligible, setEligible] = useState<EligibleRepair[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<WarrantyDetail | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canOperate = role !== 'viewer';
  const canManage = role === 'admin' || role === 'manager';

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const [claims, repairs] = await Promise.all([
        apiRequest<{ items: WarrantyListItem[] }>(`/api/operations/warranties?${params}`, {}, token),
        canOperate ? apiRequest<{ items: EligibleRepair[] }>('/api/operations/warranties/eligible-repairs', {}, token) : Promise.resolve({ items: [] }),
      ]);
      setItems(claims.items); setEligible(repairs.items);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar las garantías.'); }
    finally { setBusy(false); }
  }, [canOperate, search, status, token]);

  const loadDetail = useCallback(async (claimId: string) => {
    setBusy(true); setError('');
    try { const response = await apiRequest<{ item: WarrantyDetail }>(`/api/operations/warranties/${claimId}`, {}, token); setDetail(response.item); setSelectedId(claimId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar el reclamo.'); }
    finally { setBusy(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function createClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiRequest<{ item: WarrantyListItem }>('/api/operations/warranties', { method: 'POST', body: JSON.stringify({
        repairId: form.get('repairId'), claimReason: form.get('claimReason'), intakeEvidence: form.get('intakeEvidence') || null,
      }) }, token);
      event.currentTarget.reset(); setMessage(`Reclamo ${response.item.folio} registrado.`); await load(); await loadDetail(response.item.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible registrar el reclamo.'); }
    finally { setBusy(false); }
  }

  async function saveAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      await apiRequest(`/api/operations/warranties/${detail.id}/assessment`, { method: 'PATCH', body: JSON.stringify({
        intakeEvidence: form.get('intakeEvidence') || null, diagnosis: form.get('diagnosis') || null, note: form.get('note') || null,
      }) }, token);
      setMessage('Evaluación actualizada.'); await loadDetail(detail.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la evaluación.'); }
    finally { setBusy(false); }
  }

  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return;
    const form = new FormData(event.currentTarget); const next = String(form.get('status')) as ClaimStatus; setBusy(true); setError('');
    try {
      await apiRequest(`/api/operations/warranties/${detail.id}/status`, { method: 'POST', body: JSON.stringify({
        status: next, note: form.get('note') || null, evidenceText: form.get('evidenceText') || null,
        resolution: next === 'resolved' ? form.get('resolution') : null,
        rejectionReason: next === 'rejected' ? form.get('rejectionReason') : null,
      }) }, token);
      event.currentTarget.reset(); setMessage(`Estado actualizado a ${statusLabels[next]}.`); await load(); await loadDetail(detail.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cambiar el estado.'); }
    finally { setBusy(false); }
  }

  const availableStatuses = useMemo(() => detail ? nextStatuses[detail.status].filter((value) => canManage || !managerOnly.has(value)) : [], [canManage, detail]);

  if (selectedId && detail) return (
    <section className="module-layout warranty-detail">
      <div className="module-heading">
        <button className="text-action" type="button" onClick={() => { setSelectedId(''); setDetail(null); }}><ArrowLeft /> Garantías</button>
        <div><p className="panel-eyebrow">Reclamo profesional</p><h2>{detail.folio}</h2><p>{detail.repairFolio} · {detail.brand} {detail.model} · {detail.clientName}</p></div>
        <span className={`status-dot status-${detail.status}`}>{statusLabels[detail.status]}</span>
      </div>
      {message && <p className="settings-message">{message}</p>}{error && <p className="form-error">{error}</p>}
      <div className="repair-detail-grid">
        <article className="utility-panel">
          <h3>Reclamo</h3><p>{detail.claimReason}</p>
          <dl><dt>Vigencia original</dt><dd>{detail.warrantyUntil ? date(detail.warrantyUntil) : 'Sin vigencia'}</dd><dt>Recibió</dt><dd>{detail.receivedByName ?? 'Sin registro'}</dd><dt>Asignado a</dt><dd>{detail.assignedToName ?? 'Sin asignar'}</dd></dl>
          {detail.resolution && <><h4>Resolución</h4><p>{detail.resolution}</p></>}{detail.rejectionReason && <><h4>Motivo de rechazo</h4><p>{detail.rejectionReason}</p></>}
        </article>
        {canOperate && !['rejected', 'resolved', 'closed', 'cancelled'].includes(detail.status) && <form className="ops-form" onSubmit={saveAssessment}>
          <h3>Evaluación técnica</h3><label className="wide">Evidencia textual<textarea name="intakeEvidence" defaultValue={detail.intakeEvidence ?? ''} /></label><label className="wide">Diagnóstico<textarea name="diagnosis" defaultValue={detail.diagnosis ?? ''} /></label><label className="wide">Nota del evento<textarea name="note" /></label><button className="panel-primary" disabled={busy}>Guardar evaluación</button>
        </form>}
        {canOperate && availableStatuses.length > 0 && <form className="ops-form" onSubmit={changeStatus}>
          <h3>Cambiar estado</h3><label>Nuevo estado<select name="status" required>{availableStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label><label className="wide">Nota<textarea name="note" /></label><label className="wide">Evidencia adicional<textarea name="evidenceText" /></label><label className="wide">Resolución (obligatoria al resolver)<textarea name="resolution" /></label><label className="wide">Motivo de rechazo (obligatorio al rechazar)<textarea name="rejectionReason" /></label><button className="panel-primary" disabled={busy}>Confirmar estado</button>
        </form>}
        <article className="utility-panel wide"><h3>Historial</h3>{detail.events.length === 0 ? <p className="empty-state">Sin eventos.</p> : detail.events.map((item) => <div className="activity-row" key={item.id}><span><b>{statusLabels[item.toStatus]}</b><small>{item.userName} · {date(item.createdAt)}</small>{item.note && <p>{item.note}</p>}{item.evidenceText && <p>Evidencia: {item.evidenceText}</p>}</span></div>)}</article>
      </div>
    </section>
  );

  return (
    <section className="module-layout warranties-workbench">
      <div className="module-heading"><div><p className="panel-eyebrow">Taller profesional</p><h2>Garantías</h2><p>Registra, evalúa y resuelve reclamos sin perder el historial.</p></div><button className="text-action" type="button" onClick={() => void load()} disabled={busy}><RefreshCw /> Actualizar</button></div>
      {message && <p className="settings-message">{message}</p>}{error && <p className="form-error">{error}</p>}
      <div className="panel-toolbar"><label>Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="GAR, REP, cliente o equipo" /></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {canOperate && <form className="ops-form" onSubmit={createClaim}>
        <h3><ClipboardCheck /> Abrir reclamo</h3><label className="wide">Reparación con garantía vigente<select name="repairId" required defaultValue=""><option value="" disabled>Selecciona una reparación</option>{eligible.map((repair) => <option key={repair.id} value={repair.id}>{repair.folio} · {repair.clientName} · {repair.brand} {repair.model}</option>)}</select></label><label className="wide">Motivo del reclamo<textarea name="claimReason" required minLength={5} /></label><label className="wide">Condición y evidencia al recibir<textarea name="intakeEvidence" /></label><button className="panel-primary" disabled={busy || eligible.length === 0}>Registrar garantía</button>{eligible.length === 0 && <small>No hay reparaciones entregadas con garantía vigente disponibles.</small>}
      </form>}
      {!canOperate && <p className="panel-alert"><ShieldCheck /> Tu rol puede consultar reclamos, pero no modificarlos.</p>}
      <div className="data-table">{items.length === 0 && !busy ? <p className="empty-state">No hay reclamos para los filtros seleccionados.</p> : items.map((item) => <article className="repair-ticket" key={item.id}><div className="ticket-folio"><small>Garantía</small><b>{item.folio}</b></div><div><b>{item.brand} {item.model}</b><span>{item.clientName} · {item.repairFolio}</span><p>{item.claimReason}</p></div><span className={`status-dot status-${item.status}`}>{statusLabels[item.status]}</span><button className="text-action" type="button" onClick={() => void loadDetail(item.id)}>Ver detalle</button></article>)}</div>
    </section>
  );
}
