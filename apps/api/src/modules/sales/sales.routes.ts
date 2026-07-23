import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, clients, saleItems, salePayments, saleReturnItems, saleReturnPayments, saleReturns, sales, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { canAccessCosts, withoutSensitiveCosts } from '../../lib/cost-privacy.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { cancelSale, createSale, createSaleReturn } from './sales.service.js';

export const salesRouter = Router();
salesRouter.use(requireAuth);
const idSchema = z.string().uuid();
const listSchema = z.object({ search: z.string().trim().max(100).default(''), limit: z.coerce.number().int().min(1).max(100).default(50) });
const createSchema = z.object({
  cashRegisterId: z.string().uuid().optional(),
  customerId: z.string().uuid().nullable().optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'card']).optional(),
  payments: z.array(z.object({
    method: z.enum(['cash', 'transfer', 'card']),
    amountCents: z.number().int().min(1).max(99_999_999),
    receivedAmountCents: z.number().int().min(1).max(99_999_999).nullable().optional(),
  })).min(1).max(3).optional(),
  discountCents: z.number().int().min(0).default(0),
  notes: z.string().trim().max(1000).nullable().optional(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(999) })).min(1).max(100),
}).superRefine((value, context) => {
  const ids = value.items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Cada producto debe aparecer una sola vez.', path: ['items'] });
  if (!value.paymentMethod && !value.payments?.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Registra al menos un método de pago.', path: ['payments'] });
  const methods = value.payments?.map((payment) => payment.method) ?? [];
  if (new Set(methods).size !== methods.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Agrupa cada método de pago en una sola línea.', path: ['payments'] });
  value.payments?.forEach((payment, index) => {
    if (payment.method !== 'cash' && payment.receivedAmountCents != null) context.addIssue({ code: z.ZodIssueCode.custom, message: 'El monto recibido solo aplica a efectivo.', path: ['payments', index, 'receivedAmountCents'] });
    if (payment.receivedAmountCents != null && payment.receivedAmountCents < payment.amountCents) context.addIssue({ code: z.ZodIssueCode.custom, message: 'El efectivo recibido no puede ser menor al importe aplicado.', path: ['payments', index, 'receivedAmountCents'] });
  });
});
const cancelSchema = z.object({ cashRegisterId: z.string().uuid().optional(), reason: z.string().trim().min(3).max(500) });
const returnSchema = z.object({
  cashRegisterId: z.string().uuid().optional(),
  reason: z.string().trim().min(3).max(500),
  items: z.array(z.object({ saleItemId: z.string().uuid(), quantity: z.number().int().min(1).max(999) })).min(1).max(100),
  payments: z.array(z.object({ method: z.enum(['cash', 'transfer', 'card']), amountCents: z.number().int().min(1).max(99_999_999) })).min(1).max(3),
}).superRefine((value, context) => {
  if (new Set(value.items.map((item) => item.saleItemId)).size !== value.items.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Cada artículo debe aparecer una sola vez.', path: ['items'] });
  if (new Set(value.payments.map((payment) => payment.method)).size !== value.payments.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Agrupa cada método de reembolso.', path: ['payments'] });
});

salesRouter.get('/', asyncHandler(async (request, response) => {
  const { search, limit } = listSchema.parse(request.query);
  const [business] = await db.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
  const rows = await db.select({
    id: sales.id, folio: sales.folio, customerId: sales.customerId, customerName: clients.name,
    userName: users.name, subtotalCents: sales.subtotalCents, discountCents: sales.discountCents,
    totalCents: sales.totalCents, paymentMethod: sales.paymentMethod, status: sales.status,
    notes: sales.notes, createdAt: sales.createdAt, updatedAt: sales.updatedAt,
  }).from(sales)
    .leftJoin(clients, eq(sales.customerId, clients.id))
    .innerJoin(users, eq(sales.userId, users.id))
    .where(and(eq(sales.businessId, business.id), isNull(sales.deletedAt), search ? or(ilike(sales.folio, `%${search}%`), ilike(clients.name, `%${search}%`)) : undefined))
    .orderBy(desc(sales.createdAt)).limit(limit);
  response.json({ items: rows });
}));

salesRouter.get('/:id', asyncHandler(async (request, response) => {
  const saleId = idSchema.parse(request.params.id);
  const [business] = await db.select().from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
  const [sale] = await db.select({
    id: sales.id, businessId: sales.businessId, folio: sales.folio, customerId: sales.customerId,
    customerName: clients.name, customerPhone: clients.phone, userName: users.name,
    subtotalCents: sales.subtotalCents, discountCents: sales.discountCents, totalCents: sales.totalCents,
    paymentMethod: sales.paymentMethod, status: sales.status, notes: sales.notes, createdAt: sales.createdAt,
  }).from(sales).leftJoin(clients, eq(sales.customerId, clients.id)).innerJoin(users, eq(sales.userId, users.id))
    .where(and(eq(sales.id, saleId), eq(sales.businessId, business.id), isNull(sales.deletedAt))).limit(1);
  if (!sale) throw new AppError(404, 'Venta no encontrada.');
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id)).orderBy(saleItems.createdAt);
  const payments = await db.select().from(salePayments).where(and(eq(salePayments.saleId, sale.id), isNull(salePayments.voidedAt))).orderBy(salePayments.createdAt);
  const returns = await db.select().from(saleReturns).where(eq(saleReturns.saleId, sale.id)).orderBy(saleReturns.createdAt);
  const returnDetails = await Promise.all(returns.map(async (saleReturn) => ({
    ...saleReturn,
    items: (await db.select().from(saleReturnItems).where(eq(saleReturnItems.saleReturnId, saleReturn.id))),
    payments: await db.select().from(saleReturnPayments).where(and(eq(saleReturnPayments.saleReturnId, saleReturn.id), isNull(saleReturnPayments.voidedAt))),
  })));
  const canViewCosts = canAccessCosts(request.auth!.role);
  response.json({
    item: {
      ...sale,
      items: canViewCosts ? items : items.map(withoutSensitiveCosts),
      payments,
      returns: canViewCosts ? returnDetails : returnDetails.map((saleReturn) => ({
        ...saleReturn,
        items: saleReturn.items.map(withoutSensitiveCosts),
      })),
      business,
    },
  });
}));

salesRouter.post('/', requireRole(...roleGroups.staff), asyncHandler(async (request, response) => {
  const input = createSchema.parse(request.body);
  const sale = await createSale(input, request.auth!.userId);
  await recordAuditLog({ actor: request.auth!, action: 'sales.create', entityType: 'sale', entityId: sale.id, summary: `Venta ${sale.folio}`, metadata: { totalCents: sale.totalCents, paymentMethod: sale.paymentMethod, itemsCount: input.items.length } });
  response.status(201).json({ item: sale });
}));

salesRouter.post('/:id/cancel', requireRole(...roleGroups.adminOnly), asyncHandler(async (request, response) => {
  const input = cancelSchema.parse(request.body);
  const sale = await cancelSale(idSchema.parse(request.params.id), input.reason, request.auth!.userId, input.cashRegisterId);
  await recordAuditLog({ actor: request.auth!, action: 'sales.cancel', entityType: 'sale', entityId: sale.id, summary: `Venta cancelada: ${sale.folio}`, metadata: { reason: input.reason, totalCents: sale.totalCents } });
  response.json({ item: sale });
}));

salesRouter.post('/:id/returns', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const input = returnSchema.parse(request.body);
  const item = await createSaleReturn(idSchema.parse(request.params.id), input, request.auth!.userId);
  await recordAuditLog({ actor: request.auth!, action: 'sales.return', entityType: 'sale_return', entityId: item.id, summary: `Devolución ${item.folio}`, metadata: { saleId: request.params.id, reason: input.reason, totalCents: item.totalCents } });
  response.status(201).json({ item });
}));
