import { and, desc, eq, gte, ilike, isNull, lte, notInArray, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  businessSettings,
  clients,
  folioCounters,
  repairEvents,
  repairs,
  users,
  warrantyClaimEvents,
  warrantyClaims,
} from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups, type UserRole } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requireModule } from '../../middlewares/modules.js';

export const warrantiesRouter = Router();
warrantiesRouter.use(requireAuth, requireModule('warranties'));

const claimStatuses = ['opened', 'under_review', 'approved', 'rejected', 'in_progress', 'resolved', 'closed', 'cancelled'] as const;
type ClaimStatus = typeof claimStatuses[number];

const terminalStatuses: ClaimStatus[] = ['rejected', 'resolved', 'closed', 'cancelled'];
const managerStatuses: ClaimStatus[] = ['approved', 'rejected', 'closed', 'cancelled'];
const transitions: Record<ClaimStatus, ClaimStatus[]> = {
  opened: ['under_review', 'approved', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected', 'cancelled'],
  approved: ['in_progress', 'cancelled'],
  rejected: [],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['closed'],
  closed: [],
  cancelled: [],
};

const idInput = z.string().uuid();
const queryInput = z.object({
  search: z.string().trim().max(100).default(''),
  status: z.enum(claimStatuses).optional(),
  repairId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(150).default(80),
});
const createInput = z.object({
  repairId: z.string().uuid(),
  claimReason: z.string().trim().min(5).max(3000),
  intakeEvidence: z.string().trim().max(3000).nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  overrideExpired: z.boolean().default(false),
  overrideReason: z.string().trim().max(1000).nullable().optional(),
}).superRefine((value, context) => {
  if (value.overrideExpired && (!value.overrideReason || value.overrideReason.length < 5)) {
    context.addIssue({ code: 'custom', path: ['overrideReason'], message: 'Indica por qué se acepta la garantía fuera de vigencia.' });
  }
});
const assessmentInput = z.object({
  intakeEvidence: z.string().trim().max(3000).nullable().optional(),
  diagnosis: z.string().trim().max(3000).nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});
const statusInput = z.object({
  status: z.enum(claimStatuses),
  note: z.string().trim().max(1000).nullable().optional(),
  evidenceText: z.string().trim().max(3000).nullable().optional(),
  resolution: z.string().trim().max(3000).nullable().optional(),
  rejectionReason: z.string().trim().max(2000).nullable().optional(),
});

const isManager = (role: UserRole) => roleGroups.managers.includes(role as 'admin' | 'manager');

async function getBusiness(executor: typeof db | any = db) {
  const [business] = await executor.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'Configura el negocio antes de continuar.');
  return business;
}

async function assertAssignableUser(userId: string | null | undefined, executor: typeof db | any = db) {
  if (!userId) return;
  const [user] = await executor.select({ id: users.id }).from(users).where(and(eq(users.id, userId), eq(users.active, true))).limit(1);
  if (!user) throw new AppError(404, 'El usuario asignado no existe o está inactivo.');
}

warrantiesRouter.get('/eligible-repairs', asyncHandler(async (request, response) => {
  const search = z.string().trim().max(100).default('').parse(request.query.search);
  const now = new Date();
  const rows = await db.select({
    id: repairs.id,
    folio: repairs.folio,
    brand: repairs.brand,
    model: repairs.model,
    deliveredAt: repairs.deliveredAt,
    warrantyUntil: repairs.warrantyUntil,
    warrantyDays: repairs.warrantyDays,
    clientId: repairs.clientId,
    clientName: clients.name,
    clientPhone: clients.phone,
  }).from(repairs)
    .innerJoin(clients, eq(repairs.clientId, clients.id))
    .leftJoin(warrantyClaims, and(
      eq(warrantyClaims.repairId, repairs.id),
      notInArray(warrantyClaims.status, terminalStatuses),
    ))
    .where(and(
      isNull(repairs.deletedAt),
      eq(repairs.status, 'delivered'),
      gte(repairs.warrantyUntil, now),
      isNull(warrantyClaims.id),
      search ? or(
        ilike(repairs.folio, `%${search}%`),
        ilike(repairs.brand, `%${search}%`),
        ilike(repairs.model, `%${search}%`),
        ilike(clients.name, `%${search}%`),
        ilike(clients.phone, `%${search}%`),
      ) : undefined,
    ))
    .orderBy(desc(repairs.deliveredAt))
    .limit(80);
  response.json({ items: rows });
}));

warrantiesRouter.get('/', asyncHandler(async (request, response) => {
  const query = queryInput.parse(request.query);
  const rows = await db.select({
    id: warrantyClaims.id,
    folio: warrantyClaims.folio,
    repairId: warrantyClaims.repairId,
    repairFolio: repairs.folio,
    clientId: warrantyClaims.clientId,
    clientName: clients.name,
    clientPhone: clients.phone,
    status: warrantyClaims.status,
    claimReason: warrantyClaims.claimReason,
    brand: repairs.brand,
    model: repairs.model,
    openedAt: warrantyClaims.openedAt,
    resolvedAt: warrantyClaims.resolvedAt,
    updatedAt: warrantyClaims.updatedAt,
  }).from(warrantyClaims)
    .innerJoin(repairs, eq(warrantyClaims.repairId, repairs.id))
    .innerJoin(clients, eq(warrantyClaims.clientId, clients.id))
    .where(and(
      query.status ? eq(warrantyClaims.status, query.status) : undefined,
      query.repairId ? eq(warrantyClaims.repairId, query.repairId) : undefined,
      query.from ? gte(warrantyClaims.createdAt, new Date(query.from)) : undefined,
      query.to ? lte(warrantyClaims.createdAt, new Date(query.to)) : undefined,
      query.search ? or(
        ilike(warrantyClaims.folio, `%${query.search}%`),
        ilike(repairs.folio, `%${query.search}%`),
        ilike(clients.name, `%${query.search}%`),
        ilike(clients.phone, `%${query.search}%`),
        ilike(repairs.brand, `%${query.search}%`),
        ilike(repairs.model, `%${query.search}%`),
      ) : undefined,
    ))
    .orderBy(desc(warrantyClaims.createdAt))
    .limit(query.limit);
  response.json({ items: rows });
}));

warrantiesRouter.get('/:id', asyncHandler(async (request, response) => {
  const claimId = idInput.parse(request.params.id);
  const [item] = await db.select({
    claim: warrantyClaims,
    repairFolio: repairs.folio,
    brand: repairs.brand,
    model: repairs.model,
    warrantyUntil: repairs.warrantyUntil,
    clientName: clients.name,
    clientPhone: clients.phone,
  }).from(warrantyClaims)
    .innerJoin(repairs, eq(warrantyClaims.repairId, repairs.id))
    .innerJoin(clients, eq(warrantyClaims.clientId, clients.id))
    .where(eq(warrantyClaims.id, claimId)).limit(1);
  if (!item) throw new AppError(404, 'Reclamo de garantía no encontrado.');

  const events = await db.select({
    id: warrantyClaimEvents.id,
    fromStatus: warrantyClaimEvents.fromStatus,
    toStatus: warrantyClaimEvents.toStatus,
    note: warrantyClaimEvents.note,
    evidenceText: warrantyClaimEvents.evidenceText,
    createdAt: warrantyClaimEvents.createdAt,
    userName: users.name,
  }).from(warrantyClaimEvents)
    .innerJoin(users, eq(warrantyClaimEvents.createdByUserId, users.id))
    .where(eq(warrantyClaimEvents.warrantyClaimId, claimId))
    .orderBy(desc(warrantyClaimEvents.createdAt));

  const userIds = [item.claim.receivedByUserId, item.claim.assignedToUserId, item.claim.resolvedByUserId].filter((value): value is string => Boolean(value));
  const people = userIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(or(...userIds.map((userId) => eq(users.id, userId))))
    : [];
  const names = new Map(people.map((person) => [person.id, person.name]));

  response.json({ item: {
    ...item.claim,
    repairFolio: item.repairFolio,
    brand: item.brand,
    model: item.model,
    warrantyUntil: item.warrantyUntil,
    clientName: item.clientName,
    clientPhone: item.clientPhone,
    receivedByName: names.get(item.claim.receivedByUserId) ?? null,
    assignedToName: item.claim.assignedToUserId ? names.get(item.claim.assignedToUserId) ?? null : null,
    resolvedByName: item.claim.resolvedByUserId ? names.get(item.claim.resolvedByUserId) ?? null : null,
    events,
  } });
}));

warrantiesRouter.post('/', requireRole(...roleGroups.workshop), asyncHandler(async (request, response) => {
  const input = createInput.parse(request.body);
  if (input.overrideExpired && !isManager(request.auth!.role)) throw new AppError(403, 'Solo un administrador o encargado puede aceptar una garantía fuera de vigencia.');

  const item = await db.transaction(async (tx) => {
    const business = await getBusiness(tx);
    const [repair] = await tx.select().from(repairs).where(and(eq(repairs.id, input.repairId), isNull(repairs.deletedAt))).limit(1);
    if (!repair) throw new AppError(404, 'Reparación no encontrada.');
    if (repair.status !== 'delivered' || !repair.deliveredAt) throw new AppError(409, 'La reparación debe estar entregada antes de registrar una garantía.');
    const expired = !repair.warrantyUntil || repair.warrantyUntil.getTime() < Date.now();
    if (expired && !input.overrideExpired) throw new AppError(409, 'La garantía de esta reparación no está vigente.');
    await assertAssignableUser(input.assignedToUserId, tx);

    const [active] = await tx.select({ id: warrantyClaims.id }).from(warrantyClaims).where(and(
      eq(warrantyClaims.repairId, repair.id),
      notInArray(warrantyClaims.status, terminalStatuses),
    )).limit(1);
    if (active) throw new AppError(409, 'Esta reparación ya tiene un reclamo de garantía activo.');

    const [counter] = await tx.insert(folioCounters).values({ scope: 'warranty_claim', value: 1 })
      .onConflictDoUpdate({ target: folioCounters.scope, set: { value: sql`${folioCounters.value}+1`, updatedAt: new Date() } })
      .returning({ value: folioCounters.value });
    if (!counter) throw new AppError(500, 'No fue posible generar el folio de garantía.');
    const [created] = await tx.insert(warrantyClaims).values({
      businessId: business.id,
      folio: `GAR-${String(counter.value).padStart(5, '0')}`,
      repairId: repair.id,
      clientId: repair.clientId,
      claimReason: input.claimReason,
      intakeEvidence: input.intakeEvidence ?? null,
      receivedByUserId: request.auth!.userId,
      assignedToUserId: input.assignedToUserId ?? null,
    }).returning();
    if (!created) throw new AppError(500, 'No fue posible registrar el reclamo de garantía.');

    await tx.insert(warrantyClaimEvents).values({
      warrantyClaimId: created.id,
      toStatus: 'opened',
      note: input.overrideExpired ? `Reclamo abierto fuera de vigencia: ${input.overrideReason}` : 'Reclamo de garantía recibido.',
      evidenceText: input.intakeEvidence ?? null,
      createdByUserId: request.auth!.userId,
    });
    await tx.insert(repairEvents).values({
      repairId: repair.id,
      toStatus: repair.status,
      note: `Reclamo de garantía ${created.folio} abierto.`,
      createdById: request.auth!.userId,
    });
    await recordAuditLog({
      actor: request.auth!, action: 'warranty.claim_created', entityType: 'warranty_claim', entityId: created.id,
      summary: `Reclamo de garantía creado: ${created.folio}`,
      metadata: { repairId: repair.id, status: created.status, expiredOverride: expired && input.overrideExpired },
    });
    return created;
  });
  response.status(201).json({ item });
}));

warrantiesRouter.patch('/:id/assessment', requireRole(...roleGroups.workshop), asyncHandler(async (request, response) => {
  const claimId = idInput.parse(request.params.id);
  const input = assessmentInput.parse(request.body);
  const item = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(warrantyClaims).where(eq(warrantyClaims.id, claimId)).limit(1);
    if (!current) throw new AppError(404, 'Reclamo de garantía no encontrado.');
    if (terminalStatuses.includes(current.status)) throw new AppError(409, 'Un reclamo terminado ya no puede modificarse.');
    await assertAssignableUser(input.assignedToUserId, tx);
    const [updated] = await tx.update(warrantyClaims).set({
      intakeEvidence: input.intakeEvidence === undefined ? current.intakeEvidence : input.intakeEvidence,
      diagnosis: input.diagnosis === undefined ? current.diagnosis : input.diagnosis,
      assignedToUserId: input.assignedToUserId === undefined ? current.assignedToUserId : input.assignedToUserId,
      updatedAt: new Date(),
    }).where(eq(warrantyClaims.id, claimId)).returning();
    if (!updated) throw new AppError(500, 'No fue posible actualizar la evaluación.');
    await tx.insert(warrantyClaimEvents).values({
      warrantyClaimId: claimId,
      fromStatus: current.status,
      toStatus: current.status,
      note: input.note ?? 'Evaluación de garantía actualizada.',
      evidenceText: input.intakeEvidence ?? null,
      createdByUserId: request.auth!.userId,
    });
    await recordAuditLog({
      actor: request.auth!, action: 'warranty.assessment_updated', entityType: 'warranty_claim', entityId: claimId,
      summary: `Evaluación actualizada: ${current.folio}`,
      metadata: { assignedToUserId: updated.assignedToUserId, hasDiagnosis: Boolean(updated.diagnosis), hasEvidence: Boolean(updated.intakeEvidence) },
    }, tx);
    return updated;
  });
  response.json({ item });
}));

warrantiesRouter.post('/:id/status', requireRole(...roleGroups.workshop), asyncHandler(async (request, response) => {
  const claimId = idInput.parse(request.params.id);
  const input = statusInput.parse(request.body);
  if (managerStatuses.includes(input.status) && !isManager(request.auth!.role)) throw new AppError(403, 'Solo un administrador o encargado puede aplicar este estado.');
  if (input.status === 'resolved' && (!input.resolution || input.resolution.length < 5)) throw new AppError(400, 'Describe la resolución de la garantía.');
  if (input.status === 'rejected' && (!input.rejectionReason || input.rejectionReason.length < 5)) throw new AppError(400, 'Indica el motivo del rechazo.');

  const item = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(warrantyClaims).where(eq(warrantyClaims.id, claimId)).limit(1);
    if (!current) throw new AppError(404, 'Reclamo de garantía no encontrado.');
    if (!transitions[current.status].includes(input.status)) throw new AppError(409, `No se puede cambiar de ${current.status} a ${input.status}.`);
    const now = new Date();
    const resolution = input.status === 'resolved' ? input.resolution! : current.resolution;
    const [updated] = await tx.update(warrantyClaims).set({
      status: input.status,
      resolution,
      rejectionReason: input.status === 'rejected' ? input.rejectionReason! : current.rejectionReason,
      resolvedAt: input.status === 'resolved' ? now : current.resolvedAt,
      resolvedByUserId: input.status === 'resolved' ? request.auth!.userId : current.resolvedByUserId,
      closedAt: input.status === 'closed' ? now : current.closedAt,
      updatedAt: now,
    }).where(eq(warrantyClaims.id, claimId)).returning();
    if (!updated) throw new AppError(500, 'No fue posible cambiar el estado del reclamo.');
    await tx.insert(warrantyClaimEvents).values({
      warrantyClaimId: claimId,
      fromStatus: current.status,
      toStatus: input.status,
      note: input.note ?? (input.status === 'rejected' ? input.rejectionReason : input.resolution) ?? null,
      evidenceText: input.evidenceText ?? null,
      createdByUserId: request.auth!.userId,
    });
    if (['resolved', 'rejected', 'cancelled'].includes(input.status)) {
      const [repair] = await tx.select({ status: repairs.status }).from(repairs).where(eq(repairs.id, current.repairId)).limit(1);
      if (repair) await tx.insert(repairEvents).values({
        repairId: current.repairId,
        toStatus: repair.status,
        note: `Reclamo de garantía ${current.folio}: ${input.status}.`,
        createdById: request.auth!.userId,
      });
    }
    await recordAuditLog({
      actor: request.auth!, action: 'warranty.status_changed', entityType: 'warranty_claim', entityId: claimId,
      summary: `Garantía ${current.folio}: ${current.status} → ${input.status}`,
      metadata: { fromStatus: current.status, toStatus: input.status, repairId: current.repairId },
    }, tx);
    return updated;
  });
  response.json({ item });
}));
