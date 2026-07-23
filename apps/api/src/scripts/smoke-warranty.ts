import { env } from '../config/env.js';
import { assertIsolatedSmokeEnvironment } from './smoke-isolation.js';

assertIsolatedSmokeEnvironment();

const API_URL = process.env.API_URL!;
const runId = Date.now();
const password = `Smoke-${runId}`;

type ApiResult = { response: Response; data: any };

async function call(path: string, options: RequestInit = {}, token?: string): Promise<ApiResult> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  return { response, data: await response.json().catch(() => ({})) };
}

function assert(label: string, condition: boolean, detail?: unknown) {
  if (!condition) throw new Error(`${label}: ${String(detail ?? 'falló')}`);
  console.log(`ok ${label}`);
}

async function login(email: string, loginPassword: string) {
  const result = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: loginPassword }) });
  assert(`login ${email}`, result.response.ok, result.data.error ?? result.response.status);
  return result.data.token as string;
}

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD.');
const adminToken = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);

const moduleList = await call('/api/operations/modules', {}, adminToken);
assert('consulta módulos', moduleList.response.ok, moduleList.data.error);
const originalWarrantyState = Boolean(moduleList.data.items.find((item: any) => item.key === 'warranties')?.enabled);

try {
  if (!originalWarrantyState) {
    const enabled = await call('/api/operations/modules/warranties', { method: 'PATCH', body: JSON.stringify({ enabled: true }) }, adminToken);
    assert('activa garantías para el smoke', enabled.response.ok, enabled.data.error);
  }

  const technicianEmail = `smoke-warranty-tech-${runId}@example.com`;
  const technicianUser = await call('/api/operations/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'Técnico smoke garantía', email: technicianEmail, password, role: 'technician', active: true }),
  }, adminToken);
  assert('crea técnico', technicianUser.response.status === 201, technicianUser.data.error);
  const technicianToken = await login(technicianEmail, password);

  const phone = `961${String(runId).slice(-7)}`;
  const client = await call('/api/operations/clients', {
    method: 'POST',
    body: JSON.stringify({ name: `Cliente garantía ${runId}`, phone }),
  }, adminToken);
  assert('crea cliente', client.response.status === 201, client.data.error);

  const repair = await call('/api/operations/repairs', {
    method: 'POST',
    body: JSON.stringify({
      clientId: client.data.item.id,
      assignedToId: technicianUser.data.item.id,
      brand: 'LocalPOS',
      model: 'Warranty Smoke',
      reportedIssue: 'Validación controlada de garantía',
      physicalCondition: 'Equipo de prueba aislado',
      publicNotes: 'Garantía en validación.',
      trackingEnabled: true,
      warrantyDays: 30,
      depositCents: 0,
    }),
  }, adminToken);
  assert('crea reparación', repair.response.status === 201, repair.data.error);
  const repairId = repair.data.item.id as string;

  const invalidJump = await call(`/api/operations/repairs/${repairId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'delivered', note: 'Salto que debe bloquearse', warrantyDays: 30 }),
  }, adminToken);
  assert('bloquea received → delivered', invalidJump.response.status === 409 && invalidJump.data.code === 'INVALID_REPAIR_TRANSITION', invalidJump.data.error);

  for (const status of ['diagnosis', 'in_repair', 'testing', 'ready', 'delivered']) {
    const transition = await call(`/api/operations/repairs/${repairId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note: `Smoke: ${status}`, warrantyDays: 30 }),
    }, adminToken);
    assert(`transición reparación ${status}`, transition.response.ok, transition.data.error);
  }

  const eligible = await call(`/api/operations/warranties/eligible-repairs?search=${encodeURIComponent(repair.data.item.folio)}`, {}, technicianToken);
  assert('reparación vigente elegible', eligible.response.ok && eligible.data.items.some((item: any) => item.id === repairId && item.warrantyUntil), eligible.data.error);

  const claim = await call('/api/operations/warranties', {
    method: 'POST',
    body: JSON.stringify({
      repairId,
      claimReason: 'La falla reapareció durante la vigencia',
      intakeEvidence: 'Equipo recibido sin golpes nuevos',
      assignedToUserId: technicianUser.data.item.id,
    }),
  }, technicianToken);
  assert('crea reclamo GAR-*', claim.response.status === 201 && /^GAR-\d{5,}$/.test(claim.data.item.folio), claim.data.error);
  const claimId = claim.data.item.id as string;

  const forbiddenApproval = await call(`/api/operations/warranties/${claimId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'approved', note: 'Técnico no debe aprobar' }),
  }, technicianToken);
  assert('técnico no aprueba garantía', forbiddenApproval.response.status === 403, forbiddenApproval.data.error);

  const steps: Array<{ token: string; status: string; resolution?: string }> = [
    { token: adminToken, status: 'approved' },
    { token: technicianToken, status: 'in_progress' },
    { token: technicianToken, status: 'resolved', resolution: 'Se corrigió el componente cubierto por garantía.' },
    { token: adminToken, status: 'closed' },
  ];
  for (const step of steps) {
    const result = await call(`/api/operations/warranties/${claimId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: step.status, note: `Smoke: ${step.status}`, ...(step.resolution ? { resolution: step.resolution } : {}) }),
    }, step.token);
    assert(`garantía pasa a ${step.status}`, result.response.ok && result.data.item.status === step.status, result.data.error);
  }

  const detail = await call(`/api/operations/warranties/${claimId}`, {}, technicianToken);
  assert('historial de eventos trazable', detail.response.ok && detail.data.item.events.length >= 5 && detail.data.item.status === 'closed', detail.data.error);

  const tracking = await call('/api/public/repairs/track', {
    method: 'POST',
    body: JSON.stringify({ folio: repair.data.item.folio, phone }),
  });
  const forbiddenPublicFields = ['internalNotes', 'costCents', 'costCentsSnapshot', 'grossProfitCents', 'payments', 'clientPhone'];
  assert('rastreo público sin datos sensibles', tracking.response.ok && tracking.data.found === true && forbiddenPublicFields.every((field) => !(field in tracking.data)), tracking.data.error);

  console.log('Smoke de garantías aprobado. Datos conservados para trazabilidad en la base aislada.');
} finally {
  if (!originalWarrantyState) {
    await call('/api/operations/modules/warranties', { method: 'PATCH', body: JSON.stringify({ enabled: false }) }, adminToken);
  }
}
