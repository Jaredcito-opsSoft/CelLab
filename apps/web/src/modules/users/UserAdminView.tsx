import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api';

export type UserRole = 'admin' | 'manager' | 'staff' | 'technician' | 'viewer';

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditItem = {
  id: string;
  actorEmail: string | null;
  actorRole: UserRole | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Encargado',
  staff: 'Mostrador',
  technician: 'Técnico',
  viewer: 'Consulta',
};

const roles: UserRole[] = ['admin', 'manager', 'staff', 'technician', 'viewer'];
const date = (value: string | null) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin acceso';

export function UserAdminView({ token, role }: { token: string; role: UserRole }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [resetting, setResetting] = useState<UserItem | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = role === 'admin';
  const activeCount = useMemo(() => users.filter((user) => user.active).length, [users]);

  async function load() {
    if (!isAdmin) return;
    setBusy(true);
    setError('');
    try {
      const [userResponse, auditResponse] = await Promise.all([
        apiRequest<{ items: UserItem[] }>(`/api/operations/users?search=${encodeURIComponent(search)}`, {}, token),
        apiRequest<{ items: AuditItem[] }>('/api/operations/audit-logs?limit=12', {}, token),
      ]);
      setUsers(userResponse.items);
      setAuditLogs(auditResponse.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar usuarios y auditoría.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, [isAdmin, token]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      role: String(form.get('role') ?? 'staff') as UserRole,
      active: form.get('active') === 'on',
      ...(editing ? {} : { password: String(form.get('password') ?? '') }),
    };
    try {
      await apiRequest(editing ? `/api/operations/users/${editing.id}` : '/api/operations/users', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) }, token);
      event.currentTarget.reset();
      setEditing(null);
      setMessage(editing ? 'Acceso al negocio actualizado.' : 'Usuario y acceso creados.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el usuario.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetting) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/api/operations/users/${resetting.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: String(form.get('password') ?? '') }) }, token);
      setResetting(null);
      setMessage(`Contraseña reiniciada para ${resetting.email}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible reiniciar la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: UserItem) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/api/operations/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ active: !user.active }) }, token);
      setMessage(!user.active ? 'Acceso al negocio activado.' : 'Acceso al negocio desactivado.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cambiar el estado del usuario.');
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <section className="users-admin-card users-admin-card--readonly">
        <p className="panel-eyebrow">Usuarios y auditoría</p>
        <h3>Solo administradores</h3>
        <p>Tu rol puede operar el panel, pero la gestión de usuarios, roles y auditoría queda reservada para admin.</p>
      </section>
    );
  }

  return (
    <section className="users-admin-card">
      <header className="users-admin-head">
        <div>
          <p className="panel-eyebrow">Usuarios y auditoría</p>
          <h3>Accesos del equipo</h3>
          <p>{activeCount} accesos activos de {users.length} membresías del negocio.</p>
        </div>
        <form className="user-search" onSubmit={(event) => { event.preventDefault(); void load(); }}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario o correo" />
          <button disabled={busy}>Buscar</button>
        </form>
      </header>

      {(message || error) && <p className={error ? 'form-error' : 'settings-message'}>{error || message}</p>}

      <div className="users-admin-grid">
        <form className="ops-form users-admin-form" onSubmit={save} key={editing?.id ?? 'new'}>
          <h4>{editing ? 'Editar usuario' : 'Crear usuario'}</h4>
          <label>Nombre<input name="name" defaultValue={editing?.name ?? ''} required /></label>
          <label>Correo<input name="email" type="email" defaultValue={editing?.email ?? ''} required /></label>
          {!editing && <label>Contraseña inicial<input name="password" type="password" minLength={8} required /></label>}
          <label>Rol<select name="role" defaultValue={editing?.role ?? 'staff'}>{roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label>
          <label className="check-line user-active-toggle"><input name="active" type="checkbox" defaultChecked={editing?.active ?? true} /><span aria-hidden="true" /> Acceso al negocio activo</label>
          <div className="form-actions">
            {editing && <button type="button" onClick={() => setEditing(null)}>Cancelar</button>}
            <button className="panel-primary" disabled={busy}>{editing ? 'Guardar cambios' : 'Crear usuario'}</button>
          </div>
        </form>

        <div className="users-list">
          {users.length === 0 ? <p className="empty-state">Sin usuarios registrados.</p> : users.map((user) => (
            <article key={user.id} className={!user.active ? 'is-disabled' : ''}>
              <div>
                <b>{user.name}</b>
                <span>{user.email}</span>
                <small>{roleLabels[user.role]} · {date(user.lastLoginAt)}</small>
              </div>
              <div className="user-row-actions">
                <button type="button" onClick={() => setEditing(user)}>Editar</button>
                <button type="button" onClick={() => setResetting(user)}>Reset</button>
                <button type="button" onClick={() => void toggleActive(user)}>{user.active ? 'Desactivar' : 'Activar'}</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {resetting && (
        <form className="reset-password-panel" onSubmit={resetPassword}>
          <span>Reset de contraseña global para <b>{resetting.email}</b></span>
          <input name="password" type="password" minLength={8} placeholder="Nueva contraseña" required />
          <button className="panel-primary" disabled={busy}>Actualizar</button>
          <button type="button" onClick={() => setResetting(null)}>Cancelar</button>
        </form>
      )}

      <aside className="audit-log-panel">
        <h4>Auditoría reciente</h4>
        {auditLogs.length === 0 ? <p className="empty-state">Sin eventos recientes.</p> : auditLogs.map((log) => (
          <article key={log.id}>
            <b>{log.summary ?? log.action}</b>
            <span>{log.actorEmail ?? 'Sistema'} · {log.actorRole ? roleLabels[log.actorRole] : 'Sin rol'}</span>
            <small>{log.action} · {log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''} · {date(log.createdAt)}</small>
          </article>
        ))}
      </aside>
    </section>
  );
}
