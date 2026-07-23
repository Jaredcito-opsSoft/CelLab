import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { cashRegisters, cashSessions, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { addManualCashMovement, closeCashSession, getBusiness, getOpenCashSession, loadCashSessionDetail, openCashSession, summarizeCashRange } from './cash.service.js';

export const cashRouter = Router();
cashRouter.use(requireAuth);

const idSchema = z.string().uuid();
const moneyInput = z.number().int().min(0).max(99_999_999);
const registerIdInput = z.string().uuid().optional();
const registerQuery = z.object({ cashRegisterId: registerIdInput });
const openInput = z.object({ cashRegisterId: registerIdInput, openingCashCents: moneyInput, notes: z.string().trim().max(1000).nullable().optional() });
const closeInput = z.object({ cashRegisterId: registerIdInput, countedCashCents: moneyInput, notes: z.string().trim().max(1000).nullable().optional() });
const manualInput = z.object({ cashRegisterId: registerIdInput, type: z.enum(['manual_in', 'manual_out']), method: z.enum(['cash', 'transfer', 'card', 'other']), amountCents: z.number().int().min(1).max(99_999_999), reason: z.string().trim().min(3).max(300), note: z.string().trim().max(1000).nullable().optional() });
const registerCreateInput = z.object({ code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()), name: z.string().trim().min(2).max(100) });
const registerUpdateInput = z.object({ name: z.string().trim().min(2).max(100).optional(), active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
const rangeQuery = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), cashRegisterId: registerIdInput, limit: z.coerce.number().int().min(1).max(100).default(50) });
const summaryQuery = z.object({ range: z.enum(['today', 'week', 'month']).default('today') });

function parseDateRange(query: unknown) {
  const parsed = rangeQuery.parse(query);
  const now = new Date();
  const from = parsed.from ? new Date(`${parsed.from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = parsed.to ? new Date(`${parsed.to}T23:59:59.999`) : now;
  return { ...parsed, from, to };
}

cashRouter.get('/registers', asyncHandler(async (_req, res) => {
  const business = await getBusiness();
  const [registers, openSessions] = await Promise.all([
    db.select().from(cashRegisters).where(eq(cashRegisters.businessId, business.id)).orderBy(desc(cashRegisters.isDefault), cashRegisters.name),
    db.select({ id: cashSessions.id, cashRegisterId: cashSessions.cashRegisterId, openedAt: cashSessions.openedAt, openedByUserId: cashSessions.openedByUserId }).from(cashSessions).where(and(eq(cashSessions.businessId, business.id), eq(cashSessions.status, 'open'))),
  ]);
  const openByRegister = new Map(openSessions.map((session) => [session.cashRegisterId, session]));
  res.json({ items: registers.map((register) => ({ ...register, openSession: openByRegister.get(register.id) ?? null })) });
}));

cashRouter.post('/registers', requireRole(...roleGroups.managers), asyncHandler(async (req, res) => {
  const input = registerCreateInput.parse(req.body);
  const item = await db.transaction(async (tx) => {
    const business = await getBusiness(tx);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`cash-register-catalog:${business.id}`}))`);
    const [total] = await tx.select({ value: count() }).from(cashRegisters).where(and(eq(cashRegisters.businessId, business.id), eq(cashRegisters.active, true)));
    if ((total?.value ?? 0) >= 10) throw new AppError(409, 'LocalPOS admite hasta 10 cajas físicas en esta fase.');
    const [created] = await tx.insert(cashRegisters).values({ businessId: business.id, ...input }).returning();
    return created;
  });
  if (!item) throw new AppError(500, 'No fue posible crear la caja física.');
  await recordAuditLog({ actor: req.auth!, action: 'cash_register.create', entityType: 'cash_register', entityId: item.id, summary: `Caja creada: ${item.name}`, metadata: { code: item.code } });
  res.status(201).json({ item });
}));

cashRouter.patch('/registers/:id', requireRole(...roleGroups.managers), asyncHandler(async (req, res) => {
  const registerId = idSchema.parse(req.params.id);
  const input = registerUpdateInput.parse(req.body);
  const business = await getBusiness();
  const [current] = await db.select().from(cashRegisters).where(and(eq(cashRegisters.id, registerId), eq(cashRegisters.businessId, business.id))).limit(1);
  if (!current) throw new AppError(404, 'Caja física no encontrada.');
  if (input.active === false) {
    if (current.isDefault) throw new AppError(409, 'La caja principal no se puede desactivar.');
    const session = await getOpenCashSession(db, business.id, current.id);
    if (session) throw new AppError(409, 'Cierra el turno antes de desactivar esta caja.');
  }
  const [item] = await db.update(cashRegisters).set({ ...input, updatedAt: new Date() }).where(eq(cashRegisters.id, current.id)).returning();
  await recordAuditLog({ actor: req.auth!, action: 'cash_register.update', entityType: 'cash_register', entityId: current.id, summary: `Caja actualizada: ${current.name}`, metadata: input });
  res.json({ item });
}));

cashRouter.get('/current', asyncHandler(async (req, res) => {
  const business = await getBusiness();
  const { cashRegisterId } = registerQuery.parse(req.query);
  const session = await getOpenCashSession(db, business.id, cashRegisterId);
  if (!session) { res.json({ item: null }); return; }
  res.json({ item: await loadCashSessionDetail(session.id) });
}));

cashRouter.post('/open', requireRole(...roleGroups.cash), asyncHandler(async (req, res) => {
  const item = await openCashSession(openInput.parse(req.body), req.auth!.userId);
  await recordAuditLog({ actor: req.auth!, action: 'cash.open', entityType: 'cash_session', entityId: item.id, summary: 'Caja abierta', metadata: { openingCashCents: item.openingCashCents } });
  res.status(201).json({ item });
}));

cashRouter.post('/manual-movement', requireRole(...roleGroups.cash), asyncHandler(async (req, res) => {
  const input = manualInput.parse(req.body);
  const item = await addManualCashMovement(input, req.auth!.userId);
  if (!item) throw new AppError(500, 'No fue posible registrar el movimiento de caja.');
  await recordAuditLog({ actor: req.auth!, action: 'cash.manual_movement', entityType: 'cash_movement', entityId: item.id, summary: input.reason, metadata: { type: input.type, method: input.method, amountCents: input.amountCents } });
  res.status(201).json({ item });
}));

cashRouter.post('/close', requireRole(...roleGroups.cash), asyncHandler(async (req, res) => {
  const item = await closeCashSession(closeInput.parse(req.body), req.auth!.userId);
  await recordAuditLog({ actor: req.auth!, action: 'cash.close', entityType: 'cash_session', entityId: item.id, summary: 'Caja cerrada', metadata: { countedCashCents: item.countedCashCents, differenceCents: item.differenceCents } });
  res.json({ item });
}));

cashRouter.get('/summary', asyncHandler(async (req, res) => {
  const { range } = summaryQuery.parse(req.query);
  res.json({ item: await summarizeCashRange(range) });
}));

cashRouter.get('/sessions', asyncHandler(async (req, res) => {
  const { from, to, limit, cashRegisterId } = parseDateRange(req.query);
  const business = await getBusiness();
  const rows = await db.select({
    id: cashSessions.id,
    status: cashSessions.status,
    openedAt: cashSessions.openedAt,
    closedAt: cashSessions.closedAt,
    openingCashCents: cashSessions.openingCashCents,
    expectedCashCents: cashSessions.expectedCashCents,
    countedCashCents: cashSessions.countedCashCents,
    differenceCents: cashSessions.differenceCents,
    notes: cashSessions.notes,
    openedByName: users.name,
    registerName: cashRegisters.name,
    registerCode: cashRegisters.code,
  }).from(cashSessions).innerJoin(users, eq(cashSessions.openedByUserId, users.id)).innerJoin(cashRegisters, eq(cashSessions.cashRegisterId, cashRegisters.id)).where(and(eq(cashSessions.businessId, business.id), cashRegisterId ? eq(cashSessions.cashRegisterId, cashRegisterId) : undefined, gte(cashSessions.openedAt, from), lte(cashSessions.openedAt, to))).orderBy(desc(cashSessions.openedAt)).limit(limit);
  res.json({ items: rows });
}));

cashRouter.get('/sessions/:id', asyncHandler(async (req, res) => {
  const item = await loadCashSessionDetail(idSchema.parse(req.params.id));
  res.json({ item });
}));
