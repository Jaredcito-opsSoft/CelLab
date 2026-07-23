import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { env } from '../config/env.js';
import { db, queryClient } from '../db/client.js';
import {
  businessMemberships,
  businessModules,
  businesses,
  businessSettings,
  users,
} from '../db/schema.js';

const API_URL = process.env.API_URL ?? '';
const runId = Date.now();
const password = `Tenant-${runId}`;
const secret = new TextEncoder().encode(env.JWT_SECRET);

function assertIsolatedTenantEnvironment() {
  const api = new URL(API_URL);
  const database = new URL(env.DATABASE_URL);
  const databaseName = decodeURIComponent(database.pathname.replace(/^\//, '')).toLowerCase();
  const localApi = api.protocol === 'http:'
    && api.hostname === '127.0.0.1'
    && Boolean(api.port);
  const localDatabase = ['127.0.0.1', 'localhost'].includes(database.hostname)
    && !database.hostname.includes('supabase');
  const isolatedName = databaseName.includes('tenant') || databaseName.includes('test');

  if (!localApi || !localDatabase || !isolatedName || env.NODE_ENV === 'production') {
    throw new Error(
      'Smoke tenant bloqueado: usa una API HTTP en 127.0.0.1 con puerto explícito, PostgreSQL local y una base cuyo nombre contenga "tenant" o "test".',
    );
  }
}

type ApiResult = {
  response: Response;
  data: any;
};

async function call(path: string, options: RequestInit = {}, token?: string): Promise<ApiResult> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return { response, data: await response.json().catch(() => ({})) };
}

function ok(label: string, condition: unknown, detail?: unknown) {
  assert.ok(condition, `${label}: ${String(detail ?? 'falló')}`);
  console.log(`ok ${label}`);
}

async function login(email: string, loginPassword: string): Promise<ApiResult> {
  return call('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: loginPassword }),
  });
}

async function createIdentity(input: {
  email: string;
  role?: 'admin' | 'manager' | 'staff' | 'technician' | 'viewer';
  active?: boolean;
}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      name: `Tenant smoke ${input.email}`,
      email: input.email,
      passwordHash,
      role: input.role ?? 'staff',
      active: input.active ?? true,
    })
    .returning({ id: users.id });
  assert.ok(user);
  return user.id;
}

async function createMembership(input: {
  userId: string;
  businessId: string;
  role?: 'admin' | 'manager' | 'staff' | 'technician' | 'viewer';
  active?: boolean;
}) {
  const [membership] = await db
    .insert(businessMemberships)
    .values({
      userId: input.userId,
      businessId: input.businessId,
      role: input.role ?? 'staff',
      active: input.active ?? true,
    })
    .returning({ id: businessMemberships.id });
  assert.ok(membership);
  return membership.id;
}

async function createBusiness(input: { status?: 'active' | 'inactive'; withSettings?: boolean }) {
  const id = randomUUID();
  const name = `Tenant smoke ${runId} ${id.slice(0, 6)}`;
  await db.insert(businesses).values({
    id,
    name,
    slug: `tenant-smoke-${runId}-${id.slice(0, 8)}`,
    status: input.status ?? 'active',
  });
  if (input.withSettings) {
    await db.insert(businessSettings).values({
      id,
      businessName: name,
      businessType: 'Prueba aislada',
      currency: 'MXN',
      primaryColor: '#185A70',
      timezone: 'America/Mexico_City',
      requireOpenCashForMoneyOperations: false,
    });
  }
  return id;
}

assertIsolatedTenantEnvironment();
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD para el smoke tenant.');
}

try {
  const health = await call('/health/ready');
  ok('API local y PostgreSQL aislado están listos', health.response.ok, health.data);

  const adminLogin = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
  ok(
    '1. usuario, membresía y negocio activos inician sesión',
    adminLogin.response.ok && adminLogin.data.token,
    adminLogin.data,
  );
  const adminToken = adminLogin.data.token as string;
  const currentBusinessId = adminLogin.data.business.id as string;
  const adminUserId = adminLogin.data.user.id as string;
  const adminMembershipId = adminLogin.data.membership.id as string;

  const noMembershipEmail = `tenant-no-membership-${runId}@example.test`;
  await createIdentity({ email: noMembershipEmail });
  const noMembershipLogin = await login(noMembershipEmail, password);
  ok(
    '2. usuario sin membresía no obtiene token',
    noMembershipLogin.response.status === 403
      && noMembershipLogin.data.code === 'NO_ACTIVE_BUSINESS_MEMBERSHIP'
      && !noMembershipLogin.data.token,
    noMembershipLogin.data,
  );

  const inactiveMembershipEmail = `tenant-inactive-membership-${runId}@example.test`;
  const inactiveMembershipUserId = await createIdentity({ email: inactiveMembershipEmail });
  await createMembership({
    userId: inactiveMembershipUserId,
    businessId: currentBusinessId,
    active: false,
  });
  const inactiveMembershipLogin = await login(inactiveMembershipEmail, password);
  ok(
    '3. membresía inactiva no obtiene token',
    inactiveMembershipLogin.response.status === 403
      && inactiveMembershipLogin.data.code === 'NO_ACTIVE_BUSINESS_MEMBERSHIP'
      && !inactiveMembershipLogin.data.token,
    inactiveMembershipLogin.data,
  );

  const inactiveIdentityEmail = `tenant-inactive-identity-${runId}@example.test`;
  const inactiveIdentityUserId = await createIdentity({
    email: inactiveIdentityEmail,
    active: false,
  });
  await createMembership({
    userId: inactiveIdentityUserId,
    businessId: currentBusinessId,
  });
  const inactiveIdentityLogin = await login(inactiveIdentityEmail, password);
  ok(
    '4. identidad global inactiva no obtiene token',
    inactiveIdentityLogin.response.status === 401 && !inactiveIdentityLogin.data.token,
    inactiveIdentityLogin.data,
  );

  const inactiveBusinessId = await createBusiness({ status: 'inactive' });
  const inactiveBusinessEmail = `tenant-inactive-business-${runId}@example.test`;
  const inactiveBusinessUserId = await createIdentity({ email: inactiveBusinessEmail });
  await createMembership({
    userId: inactiveBusinessUserId,
    businessId: inactiveBusinessId,
  });
  const inactiveBusinessLogin = await login(inactiveBusinessEmail, password);
  ok(
    '5. negocio inactivo bloquea login',
    inactiveBusinessLogin.response.status === 403
      && inactiveBusinessLogin.data.code === 'NO_ACTIVE_BUSINESS_MEMBERSHIP',
    inactiveBusinessLogin.data,
  );

  const commonLegacyClaims = {
    role: 'admin',
    email: env.ADMIN_EMAIL,
    name: 'Administrador',
  };
  const withoutBusinessId = await new SignJWT({
    ...commonLegacyClaims,
    membershipId: adminMembershipId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminUserId)
    .setIssuer('cellab-api')
    .setAudience('cellab-panel')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret);
  const missingBusiness = await call('/api/auth/session', {}, withoutBusinessId);
  ok(
    '6. JWT sin businessId es rechazado',
    missingBusiness.response.status === 401
      && missingBusiness.data.code === 'TENANT_CONTEXT_REQUIRED',
    missingBusiness.data,
  );

  const withoutMembershipId = await new SignJWT({
    ...commonLegacyClaims,
    businessId: currentBusinessId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminUserId)
    .setIssuer('cellab-api')
    .setAudience('cellab-panel')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret);
  const missingMembership = await call('/api/auth/session', {}, withoutMembershipId);
  ok(
    '7. JWT sin membershipId es rechazado',
    missingMembership.response.status === 401
      && missingMembership.data.code === 'TENANT_CONTEXT_REQUIRED',
    missingMembership.data,
  );

  const mutableMembershipEmail = `tenant-mutable-membership-${runId}@example.test`;
  const mutableMembershipUserId = await createIdentity({ email: mutableMembershipEmail });
  const mutableMembershipId = await createMembership({
    userId: mutableMembershipUserId,
    businessId: currentBusinessId,
  });
  const mutableMembershipLogin = await login(mutableMembershipEmail, password);
  ok('precondición login para revocar membresía', mutableMembershipLogin.response.ok);
  await db
    .update(businessMemberships)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(businessMemberships.id, mutableMembershipId));
  const revokedMembershipSession = await call(
    '/api/auth/session',
    {},
    mutableMembershipLogin.data.token,
  );
  ok(
    '8. desactivar membresía invalida la siguiente petición',
    revokedMembershipSession.response.status === 401,
    revokedMembershipSession.data,
  );

  const mutableBusinessId = await createBusiness({ status: 'active' });
  const mutableBusinessEmail = `tenant-mutable-business-${runId}@example.test`;
  const mutableBusinessUserId = await createIdentity({ email: mutableBusinessEmail });
  await createMembership({
    userId: mutableBusinessUserId,
    businessId: mutableBusinessId,
  });
  const mutableBusinessLogin = await login(mutableBusinessEmail, password);
  ok('precondición login para suspender negocio', mutableBusinessLogin.response.ok);
  await db
    .update(businesses)
    .set({ status: 'inactive', updatedAt: new Date() })
    .where(eq(businesses.id, mutableBusinessId));
  const suspendedBusinessSession = await call(
    '/api/auth/session',
    {},
    mutableBusinessLogin.data.token,
  );
  ok(
    '9. suspender negocio invalida la siguiente petición',
    suspendedBusinessSession.response.status === 401,
    suspendedBusinessSession.data,
  );

  const roleChangeEmail = `tenant-role-change-${runId}@example.test`;
  const roleChangeUserId = await createIdentity({ email: roleChangeEmail, role: 'manager' });
  const roleChangeMembershipId = await createMembership({
    userId: roleChangeUserId,
    businessId: currentBusinessId,
    role: 'manager',
  });
  const roleChangeLogin = await login(roleChangeEmail, password);
  ok('precondición login para cambio de rol', roleChangeLogin.response.ok);
  await db
    .update(businessMemberships)
    .set({ role: 'viewer', updatedAt: new Date() })
    .where(eq(businessMemberships.id, roleChangeMembershipId));
  const changedRoleSession = await call('/api/auth/session', {}, roleChangeLogin.data.token);
  const changedRoleAdminRoute = await call(
    '/api/operations/users',
    {},
    roleChangeLogin.data.token,
  );
  ok(
    '10. cambio de rol se aplica sin volver a iniciar sesión',
    changedRoleSession.response.ok
      && changedRoleSession.data.user.role === 'viewer'
      && changedRoleAdminRoute.response.status === 403,
    changedRoleSession.data,
  );

  const foreignBusinessId = await createBusiness({ status: 'active', withSettings: true });
  const browserBusinessEmail = `tenant-browser-business-${runId}@example.test`;
  const browserBusinessCreate = await call(
    '/api/operations/users',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Tenant Browser Authority',
        email: browserBusinessEmail,
        password,
        role: 'staff',
        active: true,
        businessId: foreignBusinessId,
      }),
    },
    adminToken,
  );
  ok('precondición CRUD crea usuario tenant', browserBusinessCreate.response.status === 201);
  const browserBusinessUserId = browserBusinessCreate.data.item.id as string;
  const browserMemberships = await db
    .select({ businessId: businessMemberships.businessId })
    .from(businessMemberships)
    .where(eq(businessMemberships.userId, browserBusinessUserId));
  ok(
    '11. businessId del body no sustituye al negocio de sesión',
    browserMemberships.length === 1
      && browserMemberships[0]?.businessId === currentBusinessId,
    browserMemberships,
  );

  const multipleEmail = `tenant-multiple-${runId}@example.test`;
  const multipleUserId = await createIdentity({ email: multipleEmail });
  await createMembership({ userId: multipleUserId, businessId: currentBusinessId });
  await createMembership({ userId: multipleUserId, businessId: foreignBusinessId });
  const multipleLogin = await login(multipleEmail, password);
  ok(
    '12. dos membresías activas no se resuelven arbitrariamente',
    multipleLogin.response.status === 409
      && multipleLogin.data.code === 'MULTIPLE_BUSINESSES_NOT_SUPPORTED'
      && !multipleLogin.data.token,
    multipleLogin.data,
  );

  const session = await call('/api/auth/session', {}, adminToken);
  ok(
    '13. session devuelve usuario, membresía y negocio actuales',
    session.response.ok
      && session.data.user.id === adminUserId
      && session.data.membership.id === adminMembershipId
      && session.data.business.id === currentBusinessId,
    session.data,
  );

  const settings = await call('/api/operations/business-settings', {}, adminToken);
  ok(
    '14. configuración usa el negocio de sesión',
    settings.response.ok && settings.data.item.id === currentBusinessId,
    settings.data,
  );

  await db
    .insert(businessModules)
    .values({
      businessId: foreignBusinessId,
      moduleKey: 'core_pos',
      enabled: false,
    })
    .onConflictDoUpdate({
      target: [businessModules.businessId, businessModules.moduleKey],
      set: { enabled: false, updatedAt: new Date() },
    });
  const modules = await call('/api/operations/modules', {}, adminToken);
  ok(
    '15. módulos usan el negocio de sesión',
    modules.response.ok
      && modules.data.items.length > 0
      && modules.data.items.every((item: { businessId: string }) => (
        item.businessId === currentBusinessId
      )),
    modules.data,
  );

  const foreignOnlyEmail = `tenant-foreign-only-${runId}@example.test`;
  const foreignOnlyUserId = await createIdentity({ email: foreignOnlyEmail });
  await createMembership({ userId: foreignOnlyUserId, businessId: foreignBusinessId });
  const scopedUsers = await call(
    `/api/operations/users?search=${encodeURIComponent(foreignOnlyEmail)}`,
    {},
    adminToken,
  );
  ok(
    '16. CRUD lista solo membresías del negocio actual',
    scopedUsers.response.ok && scopedUsers.data.items.length === 0,
    scopedUsers.data,
  );

  const selfDeactivate = await call(
    `/api/operations/users/${adminUserId}`,
    { method: 'PATCH', body: JSON.stringify({ active: false }) },
    adminToken,
  );
  const selfDemote = await call(
    `/api/operations/users/${adminUserId}`,
    { method: 'PATCH', body: JSON.stringify({ role: 'manager' }) },
    adminToken,
  );
  const [adminMembership] = await db
    .select({ role: businessMemberships.role, active: businessMemberships.active })
    .from(businessMemberships)
    .where(and(
      eq(businessMemberships.id, adminMembershipId),
      eq(businessMemberships.businessId, currentBusinessId),
    ));
  ok(
    '17. no se puede dejar al negocio sin administrador activo',
    selfDeactivate.response.status === 400
      && selfDemote.response.status === 400
      && adminMembership?.active === true
      && adminMembership.role === 'admin',
    { deactivate: selfDeactivate.data, demote: selfDemote.data, adminMembership },
  );

  console.log('Smoke tenant foundation aprobado: 17 escenarios validados.');
} finally {
  await queryClient.end({ timeout: 5 });
}
