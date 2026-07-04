import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { businessSettings, cashMovements, cashSessions, users } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';

type Tx = typeof db | any;
type CashMethod = 'cash' | 'transfer' | 'card' | 'other';
type CashMovementType = 'opening_cash' | 'sale_payment' | 'repair_payment' | 'manual_in' | 'manual_out' | 'sale_cancel' | 'repair_payment_void' | 'adjustment';
type Direction = 'in' | 'out';

type MovementRow = typeof cashMovements.$inferSelect & { userName?: string | null };
type SessionRow = typeof cashSessions.$inferSelect;

type BusinessContext = {
  id: string;
  requireOpenCashForMoneyOperations: boolean;
  timezone: string;
};

export const CASH_WITHOUT_OPEN_SESSION_WARNING = 'No hay caja abierta. La operación se registró, pero no quedó asociada a un corte de caja.';
const DEFAULT_TIMEZONE = 'America/Mexico_City';

export async function getBusiness(tx: Tx = db): Promise<BusinessContext> {
  const [business] = await tx.select({
    id: businessSettings.id,
    requireOpenCashForMoneyOperations: businessSettings.requireOpenCashForMoneyOperations,
    timezone: businessSettings.timezone,
  }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
  return { ...business, timezone: business.timezone || DEFAULT_TIMEZONE };
}

export async function getOpenCashSession(tx: Tx, businessId: string) {
  const [session] = await tx.select().from(cashSessions).where(and(eq(cashSessions.businessId, businessId), eq(cashSessions.status, 'open'))).limit(1);
  return session ?? null;
}

export function summarizeCash(session: SessionRow | null, movements: MovementRow[]) {
  const active = movements.filter((movement) => !movement.voidedAt);
  const signed = (movement: MovementRow) => movement.direction === 'in' ? movement.amountCents : -movement.amountCents;
  const expectedCashCents = active.filter((movement) => movement.method === 'cash').reduce((sum, movement) => sum + signed(movement), 0);
  const collectedByMethod = (method: CashMethod) => active.filter((movement) => movement.method === method && movement.direction === 'in' && movement.type !== 'opening_cash').reduce((sum, movement) => sum + movement.amountCents, 0);
  const outByMethod = (method: CashMethod) => active.filter((movement) => movement.method === method && movement.direction === 'out').reduce((sum, movement) => sum + movement.amountCents, 0);
  const typeIn = (type: CashMovementType) => active.filter((movement) => movement.type === type && movement.direction === 'in').reduce((sum, movement) => sum + movement.amountCents, 0);
  const typeOut = (type: CashMovementType) => active.filter((movement) => movement.type === type && movement.direction === 'out').reduce((sum, movement) => sum + movement.amountCents, 0);
  const cashInCents = collectedByMethod('cash');
  const transferInCents = collectedByMethod('transfer');
  const cardInCents = collectedByMethod('card');
  const otherInCents = collectedByMethod('other');
  const cashOutCents = outByMethod('cash');
  const totalCollectedCents = cashInCents + transferInCents + cardInCents + otherInCents;
  const countedCashCents = session?.countedCashCents ?? null;
  const differenceCents = countedCashCents === null ? null : countedCashCents - expectedCashCents;
  return {
    expectedCashCents,
    countedCashCents,
    differenceCents,
    cashInCents,
    transferInCents,
    cardInCents,
    otherInCents,
    cashOutCents,
    totalCollectedCents,
    salesTotalCents: typeIn('sale_payment'),
    repairsTotalCents: typeIn('repair_payment'),
    manualInTotalCents: typeIn('manual_in'),
    manualOutTotalCents: typeOut('manual_out'),
    cancellationsTotalCents: typeOut('sale_cancel'),
    voidsTotalCents: typeOut('repair_payment_void'),
    movementsCount: active.length,
  };
}

export async function loadCashSessionDetail(sessionId: string, tx: Tx = db) {
  const [sessionRow] = await tx.select({
    session: cashSessions,
    openedByName: users.name,
  }).from(cashSessions).innerJoin(users, eq(cashSessions.openedByUserId, users.id)).where(eq(cashSessions.id, sessionId)).limit(1);
  if (!sessionRow) throw new AppError(404, 'Corte de caja no encontrado.');
  const [closedBy] = sessionRow.session.closedByUserId ? await tx.select({ name: users.name }).from(users).where(eq(users.id, sessionRow.session.closedByUserId)).limit(1) : [null];
  const movementRows = await tx.select({
    id: cashMovements.id,
    businessId: cashMovements.businessId,
    cashSessionId: cashMovements.cashSessionId,
    type: cashMovements.type,
    method: cashMovements.method,
    amountCents: cashMovements.amountCents,
    direction: cashMovements.direction,
    referenceType: cashMovements.referenceType,
    referenceId: cashMovements.referenceId,
    referenceFolio: cashMovements.referenceFolio,
    reason: cashMovements.reason,
    note: cashMovements.note,
    createdByUserId: cashMovements.createdByUserId,
    createdAt: cashMovements.createdAt,
    voidedAt: cashMovements.voidedAt,
    voidedByUserId: cashMovements.voidedByUserId,
    voidReason: cashMovements.voidReason,
    userName: users.name,
  }).from(cashMovements).innerJoin(users, eq(cashMovements.createdByUserId, users.id)).where(eq(cashMovements.cashSessionId, sessionId)).orderBy(desc(cashMovements.createdAt));
  const summary = summarizeCash(sessionRow.session, movementRows);
  return { ...sessionRow.session, openedByName: sessionRow.openedByName, closedByName: closedBy?.name ?? null, summary, movements: movementRows };
}

export async function openCashSession(input: { openingCashCents: number; notes?: string | null }, userId: string) {
  return db.transaction(async (tx) => {
    const business = await getBusiness(tx);
    const current = await getOpenCashSession(tx, business.id);
    if (current) throw new AppError(409, 'Ya hay una caja abierta. Ciérrala antes de abrir otra.');
    const [session] = await tx.insert(cashSessions).values({
      businessId: business.id,
      openedByUserId: userId,
      openingCashCents: input.openingCashCents,
      expectedCashCents: input.openingCashCents,
      notes: input.notes ?? null,
    }).returning();
    if (!session) throw new AppError(500, 'No fue posible abrir caja.');
    if (input.openingCashCents > 0) await tx.insert(cashMovements).values({
      businessId: business.id,
      cashSessionId: session.id,
      type: 'opening_cash',
      method: 'cash',
      amountCents: input.openingCashCents,
      direction: 'in',
      reason: 'Apertura de caja',
      note: input.notes ?? null,
      createdByUserId: userId,
    });
    return loadCashSessionDetail(session.id, tx);
  });
}

export async function addManualCashMovement(input: { type: 'manual_in' | 'manual_out'; method: CashMethod; amountCents: number; reason: string; note?: string | null }, userId: string) {
  return db.transaction(async (tx) => {
    const business = await getBusiness(tx);
    const session = await getOpenCashSession(tx, business.id);
    if (!session) throw new AppError(409, 'Abre caja antes de registrar movimientos.');
    const [movement] = await tx.insert(cashMovements).values({
      businessId: business.id,
      cashSessionId: session.id,
      type: input.type,
      method: input.method,
      amountCents: input.amountCents,
      direction: input.type === 'manual_in' ? 'in' : 'out',
      reason: input.reason,
      note: input.note ?? null,
      createdByUserId: userId,
    }).returning();
    return movement;
  });
}

export async function closeCashSession(input: { countedCashCents: number; notes?: string | null }, userId: string) {
  return db.transaction(async (tx) => {
    const business = await getBusiness(tx);
    const session = await getOpenCashSession(tx, business.id);
    if (!session) throw new AppError(409, 'No hay caja abierta para cerrar.');
    const movements = await tx.select().from(cashMovements).where(eq(cashMovements.cashSessionId, session.id));
    const summary = summarizeCash(session, movements);
    const differenceCents = input.countedCashCents - summary.expectedCashCents;
    const [closed] = await tx.update(cashSessions).set({
      status: 'closed',
      closedByUserId: userId,
      closedAt: new Date(),
      countedCashCents: input.countedCashCents,
      expectedCashCents: summary.expectedCashCents,
      differenceCents,
      notes: input.notes ?? session.notes,
      updatedAt: new Date(),
    }).where(and(eq(cashSessions.id, session.id), eq(cashSessions.status, 'open'))).returning();
    if (!closed) throw new AppError(409, 'La caja ya no está abierta.');
    return loadCashSessionDetail(closed.id, tx);
  });
}

export async function recordCashMovementIfOpen(tx: Tx, input: { businessId: string; type: CashMovementType; method: Exclude<CashMethod, 'other'> | CashMethod; amountCents: number; direction: Direction; referenceType: 'sale' | 'repair' | 'manual'; referenceId: string; referenceFolio: string; reason?: string | null; note?: string | null; userId: string }) {
  const session = await getOpenCashSession(tx, input.businessId);
  if (!session) {
    const [policy] = await tx.select({ requireOpenCashForMoneyOperations: businessSettings.requireOpenCashForMoneyOperations }).from(businessSettings).where(eq(businessSettings.id, input.businessId)).limit(1);
    if (policy?.requireOpenCashForMoneyOperations) throw new AppError(409, 'Abre caja antes de registrar operaciones con dinero.');
    return { movement: null, cashWarning: CASH_WITHOUT_OPEN_SESSION_WARNING };
  }
  const [movement] = await tx.insert(cashMovements).values({
    businessId: input.businessId,
    cashSessionId: session.id,
    type: input.type,
    method: input.method,
    amountCents: input.amountCents,
    direction: input.direction,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    referenceFolio: input.referenceFolio,
    reason: input.reason ?? null,
    note: input.note ?? null,
    createdByUserId: input.userId,
  }).returning();
  return { movement: movement ?? null, cashWarning: null };
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = value('hour');
  return { year: value('year'), month: value('month'), day: value('day'), hour: hour === 24 ? 0 : hour, minute: value('minute'), second: value('second') };
}

function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number, timeZone: string) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const guessParts = zonedParts(utcGuess, timeZone);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const guessAsUtc = Date.UTC(guessParts.year, guessParts.month - 1, guessParts.day, guessParts.hour, guessParts.minute, guessParts.second, millisecond);
  return new Date(utcGuess.getTime() + targetUtc - guessAsUtc);
}

function addLocalDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0, 0));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function localDateRange(fromDate: string, toDate: string, timeZone = DEFAULT_TIMEZONE) {
  const fromMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromDate);
  const toMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toDate);
  if (!fromMatch || !toMatch) throw new AppError(400, 'Rango de fechas inválido.');
  const from = zonedTimeToUtc(Number(fromMatch[1]), Number(fromMatch[2]), Number(fromMatch[3]), 0, 0, 0, 0, timeZone);
  const to = zonedTimeToUtc(Number(toMatch[1]), Number(toMatch[2]), Number(toMatch[3]), 23, 59, 59, 999, timeZone);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new AppError(400, 'Rango de fechas inválido.');
  return { from, to };
}

export function rangeBounds(range: 'today' | 'week' | 'month', timeZone = DEFAULT_TIMEZONE) {
  const nowParts = zonedParts(new Date(), timeZone);
  let start = { year: nowParts.year, month: nowParts.month, day: nowParts.day };
  if (range === 'week') {
    const midday = zonedTimeToUtc(nowParts.year, nowParts.month, nowParts.day, 12, 0, 0, 0, timeZone);
    const day = Number(new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(midday) === 'Sun' ? 7 : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(midday) === 'Mon' ? 1 : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(midday) === 'Tue' ? 2 : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(midday) === 'Wed' ? 3 : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(midday) === 'Thu' ? 4 : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(midday) === 'Fri' ? 5 : 6);
    start = addLocalDays(start, -day + 1);
  }
  if (range === 'month') start = { year: nowParts.year, month: nowParts.month, day: 1 };
  return localDateRange(`${String(start.year).padStart(4, '0')}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`, `${String(nowParts.year).padStart(4, '0')}-${String(nowParts.month).padStart(2, '0')}-${String(nowParts.day).padStart(2, '0')}`, timeZone);
}

export async function summarizeCashRange(range: 'today' | 'week' | 'month') {
  const business = await getBusiness();
  const { from, to } = rangeBounds(range, business.timezone);
  const movements = await db.select().from(cashMovements).where(and(eq(cashMovements.businessId, business.id), isNull(cashMovements.voidedAt), gte(cashMovements.createdAt, from), lte(cashMovements.createdAt, to)));
  const [sessionsCount] = await db.select({ value: sql<number>`count(*)::int` }).from(cashSessions).where(and(eq(cashSessions.businessId, business.id), gte(cashSessions.openedAt, from), lte(cashSessions.openedAt, to)));
  return { range, timezone: business.timezone, from, to, sessionsCount: sessionsCount?.value ?? 0, summary: summarizeCash(null, movements) };
}
