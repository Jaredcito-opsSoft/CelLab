import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { cashSessions, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { addManualCashMovement, closeCashSession, getBusiness, getOpenCashSession, loadCashSessionDetail, openCashSession, summarizeCashRange } from './cash.service.js';

export const cashRouter = Router();
cashRouter.use(requireAuth);

const idSchema = z.string().uuid();
const moneyInput = z.number().int().min(0).max(99_999_999);
const openInput = z.object({ openingCashCents: moneyInput, notes: z.string().trim().max(1000).nullable().optional() });
const closeInput = z.object({ countedCashCents: moneyInput, notes: z.string().trim().max(1000).nullable().optional() });
const manualInput = z.object({ type: z.enum(['manual_in', 'manual_out']), method: z.enum(['cash', 'transfer', 'card', 'other']), amountCents: z.number().int().min(1).max(99_999_999), reason: z.string().trim().min(3).max(300), note: z.string().trim().max(1000).nullable().optional() });
const rangeQuery = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) });
const summaryQuery = z.object({ range: z.enum(['today', 'week', 'month']).default('today') });

function parseDateRange(query: unknown) {
  const parsed = rangeQuery.parse(query);
  const now = new Date();
  const from = parsed.from ? new Date(`${parsed.from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = parsed.to ? new Date(`${parsed.to}T23:59:59.999`) : now;
  return { ...parsed, from, to };
}

cashRouter.get('/current', asyncHandler(async (_req, res) => {
  const business = await getBusiness();
  const session = await getOpenCashSession(db, business.id);
  if (!session) { res.json({ item: null }); return; }
  res.json({ item: await loadCashSessionDetail(session.id) });
}));

cashRouter.post('/open', requireRole('admin'), asyncHandler(async (req, res) => {
  const item = await openCashSession(openInput.parse(req.body), req.auth!.userId);
  res.status(201).json({ item });
}));

cashRouter.post('/manual-movement', requireRole('admin'), asyncHandler(async (req, res) => {
  const item = await addManualCashMovement(manualInput.parse(req.body), req.auth!.userId);
  res.status(201).json({ item });
}));

cashRouter.post('/close', requireRole('admin'), asyncHandler(async (req, res) => {
  const item = await closeCashSession(closeInput.parse(req.body), req.auth!.userId);
  res.json({ item });
}));

cashRouter.get('/summary', asyncHandler(async (req, res) => {
  const { range } = summaryQuery.parse(req.query);
  res.json({ item: await summarizeCashRange(range) });
}));

cashRouter.get('/sessions', asyncHandler(async (req, res) => {
  const { from, to, limit } = parseDateRange(req.query);
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
  }).from(cashSessions).innerJoin(users, eq(cashSessions.openedByUserId, users.id)).where(and(eq(cashSessions.businessId, business.id), gte(cashSessions.openedAt, from), lte(cashSessions.openedAt, to))).orderBy(desc(cashSessions.openedAt)).limit(limit);
  res.json({ items: rows });
}));

cashRouter.get('/sessions/:id', asyncHandler(async (req, res) => {
  const item = await loadCashSessionDetail(idSchema.parse(req.params.id));
  res.json({ item });
}));