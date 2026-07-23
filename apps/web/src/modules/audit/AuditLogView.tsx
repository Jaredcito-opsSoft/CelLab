import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Activity, Filter, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { UserRole } from '../users/UserAdminView';

type AuditLogItem = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: UserRole | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AuditFilters = {
  search: string;
  action: string;
  entityType: string;
  from: string;
  to: string;
};

const emptyFilters: AuditFilters = { search: '', action: '', entityType: '', from: '', to: '' };

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Encargado',
  staff: 'Mostrador',
  technician: 'Técnico',
  viewer: 'Consulta',
};

const entityLabels: Record<string, string> = {
  business_settings: 'Configuración',
  business_modules: 'Módulos',
  users: 'Usuarios',
  suppliers: 'Proveedores',
  purchases: 'Compras',
  products: 'Inventario',
  inventory_movements: 'Movimientos de stock',
  sales: 'Ventas',
  repairs: 'Reparaciones',
  cash_sessions: 'Caja',
};

const actionLabels: Record<string, string> = {
  'settings.update': 'Configuración actualizada',
  'module.enabled': 'Módulo activado',
  'module.disabled': 'Módulo desactivado',
  'users.create': 'Usuario creado',
  'users.update': 'Usuario actualizado',
  'users.reset_password': 'Contraseña reiniciada',
  'supplier.created': 'Proveedor creado',
  'supplier.updated': 'Proveedor actualizado',
  'supplier.archived': 'Proveedor archivado',
  'purchase.created': 'Compra creada',
  'purchase.updated': 'Compra actualizada',
  'purchase.item_added': 'Producto agregado a compra',
  'purchase.item_updated': 'Partida de compra actualizada',
  'purchase.received': 'Compra recibida',
  'purchase.cancelled': 'Compra cancelada',
  'inventory.purchase_receipt': 'Inventario recibido por compra',
  'repair.part_received': 'Pieza recibida para reparación',
};

const date = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const dayStartIso = (value: string) => new Date(`${value}T00:00:00`).toISOString();
const dayEndIso = (value: string) => new Date(`${value}T23:59:59.999`).toISOString();

function compactMeta(metadata: Record<string, unknown> | null) {
  if (!metadata) return 'Sin datos adicionales.';
  const entries = Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined);
  if (!entries.length) return 'Sin datos adicionales.';
  return entries
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' · ');
}

export function AuditLogView({ token, role }: { token: string; role: UserRole }) {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(emptyFilters);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setBusy(true);
    setError('');
    const params = new URLSearchParams({ limit: '120' });
    if (appliedFilters.search.trim()) params.set('search', appliedFilters.search.trim());
    if (appliedFilters.action) params.set('action', appliedFilters.action);
    if (appliedFilters.entityType) params.set('entityType', appliedFilters.entityType);
    if (appliedFilters.from) params.set('from', dayStartIso(appliedFilters.from));
    if (appliedFilters.to) params.set('to', dayEndIso(appliedFilters.to));
    try {
      const data = await apiRequest<{ items: AuditLogItem[] }>(`/api/operations/audit-logs?${params.toString()}`, {}, token);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar la auditoría.');
    } finally {
      setBusy(false);
    }
  }, [appliedFilters, isAdmin, token]);

  useEffect(() => { void load(); }, [load]);

  function updateFilter<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    setError('');
    setAppliedFilters({ ...draftFilters });
  }

  function clearFilters() {
    setError('');
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  if (!isAdmin) {
    return (
      <section className="utility-panel audit-locked">
        <div>
          <p className="panel-eyebrow">Auditoría</p>
          <h2>Solo administradores</h2>
          <p>La bitácora contiene eventos sensibles del negocio. Tu rol puede operar el sistema, pero no consultar auditoría.</p>
        </div>
        <ShieldCheck />
      </section>
    );
  }

  return (
    <section className="audit-workbench">
      <div className="audit-hero">
        <div>
          <p className="panel-eyebrow">Auditoría operativa</p>
          <h2>Bitácora de cambios sensibles</h2>
          <p>Consulta quién hizo cambios en usuarios, módulos, compras, inventario, caja y configuración. La vista es de solo lectura.</p>
        </div>
        <button className="focus-toggle audit-refresh" type="button" onClick={() => void load()} disabled={busy}>
          <RefreshCw />
          <span>{busy ? 'Actualizando' : 'Actualizar'}</span>
          <small>Últimos 120 eventos</small>
        </button>
      </div>

      <form className="audit-filters" onSubmit={applyFilters}>
        <label className="audit-search">
          <span>Buscar</span>
          <Filter />
          <input value={draftFilters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Acción, actor, resumen o entidad" />
        </label>
        <label>Acción<select value={draftFilters.action} onChange={(event) => updateFilter('action', event.target.value)}><option value="">Todas</option>{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Entidad<select value={draftFilters.entityType} onChange={(event) => updateFilter('entityType', event.target.value)}><option value="">Todas</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Desde<input type="date" value={draftFilters.from} onChange={(event) => updateFilter('from', event.target.value)} /></label>
        <label>Hasta<input type="date" value={draftFilters.to} onChange={(event) => updateFilter('to', event.target.value)} /></label>
        <div className="audit-filter-actions">
          <button className="panel-primary" disabled={busy}>Filtrar</button>
          <button type="button" className="audit-clear" onClick={clearFilters} disabled={busy} aria-label="Limpiar filtros" title="Limpiar filtros"><RotateCcw /></button>
        </div>
      </form>

      {error && <p className="panel-alert">{error}</p>}

      <div className="audit-results-head" aria-live="polite">
        <b>{items.length} {items.length === 1 ? 'evento encontrado' : 'eventos encontrados'}</b>
        <span>Ordenados del más reciente al más antiguo</span>
      </div>

      <div className="audit-list" aria-busy={busy}>
        {items.length === 0 && !busy ? <p className="empty-state">Sin eventos para los filtros seleccionados.</p> : items.map((item) => (
          <article className="audit-event" key={item.id}>
            <span className="audit-event__icon"><Activity /></span>
            <div className="audit-event__main">
              <b>{item.summary ?? actionLabels[item.action] ?? item.action}</b>
              <span>{item.actorEmail ?? 'Sistema'} · {item.actorRole ? roleLabels[item.actorRole] : 'Sin rol'} · {date(item.createdAt)}</span>
              <small title={compactMeta(item.metadata)}>{compactMeta(item.metadata)}</small>
            </div>
            <div className="audit-event__meta">
              <span>{actionLabels[item.action] ?? item.action}</span>
              <small>{entityLabels[item.entityType] ?? item.entityType}{item.entityId ? ` · ${item.entityId.slice(0, 8)}` : ''}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
