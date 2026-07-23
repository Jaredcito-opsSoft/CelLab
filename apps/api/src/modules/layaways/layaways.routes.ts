import { and, desc, eq, gte, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, clients, folioCounters, inventoryMovements, layawayItems, layawayPayments, layaways, products, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { canAccessCosts, withoutSensitiveCosts } from '../../lib/cost-privacy.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups, type UserRole } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requireModule } from '../../middlewares/modules.js';
import { recordCashMovementIfOpen } from '../cash/cash.service.js';

export const layawaysRouter = Router();
layawaysRouter.use(requireAuth, requireModule('layaways'));

const id = z.string().uuid();
const payment = z.object({ method: z.enum(['cash', 'transfer', 'card']), amountCents: z.number().int().min(1).max(99_999_999), receivedAmountCents: z.number().int().min(1).max(99_999_999).nullable().optional() }).superRefine((value, context) => {
  if (value.method !== 'cash' && value.receivedAmountCents != null) context.addIssue({ code: z.ZodIssueCode.custom, message: 'El monto recibido solo aplica a efectivo.', path: ['receivedAmountCents'] });
  if (value.receivedAmountCents != null && value.receivedAmountCents < value.amountCents) context.addIssue({ code: z.ZodIssueCode.custom, message: 'El monto recibido es insuficiente.', path: ['receivedAmountCents'] });
});
const createInput = z.object({
  customerId: z.string().uuid(), discountCents: z.number().int().min(0).default(0),
  dueAt: z.string().datetime().nullable().optional(), notes: z.string().trim().max(1000).nullable().optional(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(999) })).min(1).max(100),
  initialPayment: payment.nullable().optional(),
}).superRefine((value, context) => {
  if (new Set(value.items.map((item) => item.productId)).size !== value.items.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Cada producto debe aparecer una sola vez.', path: ['items'] });
});
const listInput = z.object({ search: z.string().trim().max(100).default(''), status: z.enum(['open', 'paid', 'delivered', 'cancelled', 'expired']).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) });
const reasonInput = z.object({ reason: z.string().trim().min(3).max(500) });
const concreteMethod = (method: 'cash' | 'transfer' | 'card' | 'mixed') => {
  if (method === 'mixed') throw new AppError(409, 'Un abono individual no puede usar método mixto.');
  return method;
};

async function businessId(tx: typeof db | any) {
  const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
  return business.id as string;
}

async function detail(layawayId: string, role: UserRole, tx: typeof db | any = db) {
  const business = await businessId(tx);
  const [row] = await tx.select({
    id: layaways.id, businessId: layaways.businessId, folio: layaways.folio, customerId: layaways.customerId,
    customerName: clients.name, customerPhone: clients.phone, userName: users.name,
    subtotalCents: layaways.subtotalCents, discountCents: layaways.discountCents, totalCents: layaways.totalCents,
    paidCents: layaways.paidCents, balanceCents: layaways.balanceCents, status: layaways.status,
    dueAt: layaways.dueAt, notes: layaways.notes, createdAt: layaways.createdAt, updatedAt: layaways.updatedAt,
    deliveredAt: layaways.deliveredAt, cancelledAt: layaways.cancelledAt, cancelReason: layaways.cancelReason,
  }).from(layaways).innerJoin(clients, eq(layaways.customerId, clients.id)).innerJoin(users, eq(layaways.userId, users.id))
    .where(and(eq(layaways.id, layawayId), eq(layaways.businessId, business))).limit(1);
  if (!row) throw new AppError(404, 'Apartado no encontrado.');
  const items = await tx.select().from(layawayItems).where(eq(layawayItems.layawayId, row.id)).orderBy(layawayItems.createdAt);
  const payments = await tx.select().from(layawayPayments).where(eq(layawayPayments.layawayId, row.id)).orderBy(layawayPayments.createdAt);
  return { ...row, items: canAccessCosts(role) ? items : items.map(withoutSensitiveCosts), payments };
}

layawaysRouter.get('/', asyncHandler(async (request, response) => {
  const query = listInput.parse(request.query);
  const business = await businessId(db);
  const rows = await db.select({ id: layaways.id, folio: layaways.folio, customerId: layaways.customerId, customerName: clients.name, totalCents: layaways.totalCents, paidCents: layaways.paidCents, balanceCents: layaways.balanceCents, status: layaways.status, dueAt: layaways.dueAt, createdAt: layaways.createdAt })
    .from(layaways).innerJoin(clients, eq(layaways.customerId, clients.id))
    .where(and(eq(layaways.businessId, business), query.status ? eq(layaways.status, query.status) : undefined, query.search ? or(ilike(layaways.folio, `%${query.search}%`), ilike(clients.name, `%${query.search}%`)) : undefined))
    .orderBy(desc(layaways.createdAt)).limit(query.limit);
  response.json({ items: rows });
}));

layawaysRouter.get('/:id', asyncHandler(async (request, response) => response.json({ item: await detail(id.parse(request.params.id), request.auth!.role) })));

layawaysRouter.post('/', requireRole(...roleGroups.staff), asyncHandler(async (request, response) => {
  const input = createInput.parse(request.body);
  const item = await db.transaction(async (tx) => {
    const business = await businessId(tx);
    const [customer] = await tx.select({ id: clients.id }).from(clients).where(and(eq(clients.id, input.customerId), isNull(clients.deletedAt))).limit(1);
    if (!customer) throw new AppError(400, 'Selecciona un cliente vigente.');
    const productIds = input.items.map((line) => line.productId);
    const catalog = await tx.select({ id: products.id, name: products.name, priceCents: products.priceCents, costCents: products.costCents }).from(products).where(and(inArray(products.id, productIds), eq(products.active, true), isNull(products.deletedAt)));
    if (catalog.length !== productIds.length) throw new AppError(409, 'Uno o más productos ya no están disponibles.');
    const byId = new Map(catalog.map((product) => [product.id, product]));
    const lines = input.items.map((requested) => { const product = byId.get(requested.productId)!; return { ...requested, name: product.name, priceCents: product.priceCents, costCents: product.costCents ?? 0, subtotalCents: product.priceCents * requested.quantity }; });
    const subtotalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);
    if (input.discountCents > subtotalCents) throw new AppError(400, 'El descuento no puede superar el subtotal.');
    const totalCents = subtotalCents - input.discountCents;
    const paidCents = input.initialPayment?.amountCents ?? 0;
    if (paidCents > totalCents) throw new AppError(400, 'El anticipo no puede superar el total del apartado.');
    const [counter] = await tx.insert(folioCounters).values({ scope: 'layaway', value: 1 }).onConflictDoUpdate({ target: folioCounters.scope, set: { value: sql`${folioCounters.value} + 1`, updatedAt: new Date() } }).returning({ value: folioCounters.value });
    const [created] = await tx.insert(layaways).values({ businessId: business, folio: `APA-${String(counter!.value).padStart(5, '0')}`, customerId: input.customerId, userId: request.auth!.userId, subtotalCents, discountCents: input.discountCents, totalCents, paidCents, balanceCents: totalCents - paidCents, status: totalCents === paidCents ? 'paid' : 'open', dueAt: input.dueAt ? new Date(input.dueAt) : null, notes: input.notes ?? null }).returning();
    if (!created) throw new AppError(500, 'No fue posible crear el apartado.');
    await tx.insert(layawayItems).values(lines.map((line) => ({ businessId: business, layawayId: created.id, productId: line.productId, productNameSnapshot: line.name, quantity: line.quantity, unitPriceCents: line.priceCents, subtotalCents: line.subtotalCents, costCentsSnapshot: line.costCents })));
    for (const line of [...lines].sort((left, right) => left.productId.localeCompare(right.productId))) {
      const [updated] = await tx.update(products).set({ stock: sql`${products.stock} - ${line.quantity}`, updatedAt: new Date() }).where(and(eq(products.id, line.productId), gte(products.stock, line.quantity), eq(products.active, true), isNull(products.deletedAt))).returning({ newStock: products.stock });
      if (!updated) throw new AppError(409, `Stock insuficiente para ${line.name}.`, 'INSUFFICIENT_STOCK');
      await tx.insert(inventoryMovements).values({ businessId: business, productId: line.productId, userId: request.auth!.userId, type: 'layaway_reserve', quantity: line.quantity, previousStock: updated.newStock + line.quantity, newStock: updated.newStock, referenceType: 'layaway', referenceId: created.id, notes: `Reserva ${created.folio}` });
    }
    let cashWarning: string | null = null;
    if (input.initialPayment) {
      await tx.insert(layawayPayments).values({ businessId: business, layawayId: created.id, method: input.initialPayment.method, amountCents: input.initialPayment.amountCents, receivedAmountCents: input.initialPayment.receivedAmountCents ?? null, createdByUserId: request.auth!.userId });
      const cash = await recordCashMovementIfOpen(tx, { businessId: business, type: 'layaway_payment', method: input.initialPayment.method, amountCents: input.initialPayment.amountCents, direction: 'in', referenceType: 'layaway', referenceId: created.id, referenceFolio: created.folio, reason: 'Anticipo de apartado', userId: request.auth!.userId });
      cashWarning = cash.cashWarning;
    }
    return { ...(await detail(created.id, request.auth!.role, tx)), cashWarning };
  });
  await recordAuditLog({ actor: request.auth!, action: 'layaways.create', entityType: 'layaway', entityId: item.id, summary: `Apartado ${item.folio}`, metadata: { totalCents: item.totalCents, paidCents: item.paidCents } });
  response.status(201).json({ item });
}));

layawaysRouter.post('/:id/payments', requireRole(...roleGroups.staff), asyncHandler(async (request, response) => {
  const input = payment.parse(request.body);
  const layawayId = id.parse(request.params.id);
  const item = await db.transaction(async (tx) => {
    const business = await businessId(tx);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${layawayId}))`);
    const [current] = await tx.select().from(layaways).where(and(eq(layaways.id, layawayId), eq(layaways.businessId, business))).limit(1);
    if (!current || current.status !== 'open') throw new AppError(409, 'El apartado no admite más abonos.');
    if (input.amountCents > current.balanceCents) throw new AppError(400, 'El abono supera el saldo pendiente.');
    const [paymentRow] = await tx.insert(layawayPayments).values({ businessId: business, layawayId, method: input.method, amountCents: input.amountCents, receivedAmountCents: input.receivedAmountCents ?? null, createdByUserId: request.auth!.userId }).returning();
    const balanceCents = current.balanceCents - input.amountCents;
    await tx.update(layaways).set({ paidCents: current.paidCents + input.amountCents, balanceCents, status: balanceCents === 0 ? 'paid' : 'open', updatedAt: new Date() }).where(eq(layaways.id, layawayId));
    const cash = await recordCashMovementIfOpen(tx, { businessId: business, type: 'layaway_payment', method: input.method, amountCents: input.amountCents, direction: 'in', referenceType: 'layaway', referenceId: layawayId, referenceFolio: current.folio, reason: 'Abono de apartado', userId: request.auth!.userId });
    return { payment: paymentRow, layaway: await detail(layawayId, request.auth!.role, tx), cashWarning: cash.cashWarning };
  });
  await recordAuditLog({ actor: request.auth!, action: 'layaways.payment', entityType: 'layaway', entityId: layawayId, summary: `Abono a ${item.layaway.folio}`, metadata: { amountCents: input.amountCents, method: input.method } });
  response.status(201).json({ item });
}));

layawaysRouter.post('/:id/payments/:paymentId/void', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const input = reasonInput.parse(request.body); const layawayId = id.parse(request.params.id); const paymentId = id.parse(request.params.paymentId);
  const item = await db.transaction(async (tx) => {
    const business = await businessId(tx); await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${layawayId}))`);
    const [current] = await tx.select().from(layaways).where(and(eq(layaways.id, layawayId), eq(layaways.businessId, business))).limit(1);
    if (!current || !['open', 'paid'].includes(current.status)) throw new AppError(409, 'El apartado no permite anular abonos.');
    const [voided] = await tx.update(layawayPayments).set({ voidedAt: new Date(), voidedByUserId: request.auth!.userId, voidReason: input.reason }).where(and(eq(layawayPayments.id, paymentId), eq(layawayPayments.layawayId, layawayId), isNull(layawayPayments.voidedAt))).returning();
    if (!voided) throw new AppError(409, 'El abono no existe o ya fue anulado.');
    await tx.update(layaways).set({ paidCents: current.paidCents - voided.amountCents, balanceCents: current.balanceCents + voided.amountCents, status: 'open', updatedAt: new Date() }).where(eq(layaways.id, layawayId));
    const cash = await recordCashMovementIfOpen(tx, { businessId: business, type: 'layaway_payment_void', method: concreteMethod(voided.method), amountCents: voided.amountCents, direction: 'out', referenceType: 'layaway', referenceId: layawayId, referenceFolio: current.folio, reason: input.reason, userId: request.auth!.userId });
    return { layaway: await detail(layawayId, request.auth!.role, tx), cashWarning: cash.cashWarning };
  });
  await recordAuditLog({ actor: request.auth!, action: 'layaways.payment_void', entityType: 'layaway', entityId: layawayId, summary: `Abono anulado en ${item.layaway.folio}`, metadata: { paymentId, reason: input.reason } });
  response.json({ item });
}));

layawaysRouter.post('/:id/cancel', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const input = reasonInput.parse(request.body); const layawayId = id.parse(request.params.id);
  const item = await db.transaction(async (tx) => {
    const business = await businessId(tx); await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${layawayId}))`);
    const [current] = await tx.update(layaways).set({ status: 'cancelled', cancelledAt: new Date(), cancelledByUserId: request.auth!.userId, cancelReason: input.reason, updatedAt: new Date() }).where(and(eq(layaways.id, layawayId), eq(layaways.businessId, business), inArray(layaways.status, ['open', 'paid']))).returning();
    if (!current) throw new AppError(409, 'El apartado ya no puede cancelarse.');
    const items = await tx.select().from(layawayItems).where(eq(layawayItems.layawayId, layawayId));
    for (const line of [...items].sort((left, right) => left.productId.localeCompare(right.productId))) {
      const [updated] = await tx.update(products).set({ stock: sql`${products.stock} + ${line.quantity}`, updatedAt: new Date() }).where(eq(products.id, line.productId)).returning({ newStock: products.stock });
      if (!updated) throw new AppError(409, `No fue posible liberar ${line.productNameSnapshot}.`);
      await tx.insert(inventoryMovements).values({ businessId: business, productId: line.productId, userId: request.auth!.userId, type: 'layaway_release', quantity: line.quantity, previousStock: updated.newStock - line.quantity, newStock: updated.newStock, referenceType: 'layaway', referenceId: layawayId, notes: input.reason });
    }
    const payments = await tx.select().from(layawayPayments).where(and(eq(layawayPayments.layawayId, layawayId), isNull(layawayPayments.voidedAt)));
    let cashWarning: string | null = null;
    for (const row of payments) {
      await tx.update(layawayPayments).set({ voidedAt: new Date(), voidedByUserId: request.auth!.userId, voidReason: input.reason }).where(eq(layawayPayments.id, row.id));
      const cash = await recordCashMovementIfOpen(tx, { businessId: business, type: 'layaway_payment_void', method: concreteMethod(row.method), amountCents: row.amountCents, direction: 'out', referenceType: 'layaway', referenceId: layawayId, referenceFolio: current.folio, reason: input.reason, userId: request.auth!.userId });
      cashWarning ||= cash.cashWarning;
    }
    return { ...(await detail(layawayId, request.auth!.role, tx)), cashWarning };
  });
  await recordAuditLog({ actor: request.auth!, action: 'layaways.cancel', entityType: 'layaway', entityId: layawayId, summary: `Apartado cancelado: ${item.folio}`, metadata: { reason: input.reason } });
  response.json({ item });
}));

layawaysRouter.post('/:id/deliver', requireRole(...roleGroups.staff), asyncHandler(async (request, response) => {
  const layawayId = id.parse(request.params.id);
  const updated = await db.transaction(async (tx) => {
    const business = await businessId(tx);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${layawayId}))`);
    const [item] = await tx.update(layaways).set({ status: 'delivered', deliveredAt: new Date(), updatedAt: new Date() }).where(and(eq(layaways.id, layawayId), eq(layaways.businessId, business), eq(layaways.status, 'paid'))).returning();
    if (!item) throw new AppError(409, 'Solo un apartado liquidado puede entregarse.');
    return item;
  });
  await recordAuditLog({ actor: request.auth!, action: 'layaways.deliver', entityType: 'layaway', entityId: layawayId, summary: `Apartado entregado: ${updated.folio}` });
  response.json({ item: await detail(layawayId, request.auth!.role) });
}));
