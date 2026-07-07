import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, clients, saleItems, sales, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { cancelSale, createSale } from './sales.service.js';

export const salesRouter = Router();
salesRouter.use(requireAuth);
const idSchema = z.string().uuid();
const listSchema = z.object({ search: z.string().trim().max(100).default(''), limit: z.coerce.number().int().min(1).max(100).default(50) });
const createSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'card']),
  discountCents: z.number().int().min(0).default(0),
  notes: z.string().trim().max(1000).nullable().optional(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(999) })).min(1).max(100),
}).superRefine((value, context) => {
  const ids = value.items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Cada producto debe aparecer una sola vez.', path: ['items'] });
});
const cancelSchema = z.object({ reason: z.string().trim().min(3).max(500) });

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
  response.json({ item: { ...sale, items, business } });
}));

salesRouter.post('/', requireRole(...roleGroups.staff), asyncHandler(async (request, response) => {
  const input = createSchema.parse(request.body);
  const sale = await createSale(input, request.auth!.userId);
  await recordAuditLog({ actor: request.auth!, action: 'sales.create', entityType: 'sale', entityId: sale.id, summary: `Venta ${sale.folio}`, metadata: { totalCents: sale.totalCents, paymentMethod: sale.paymentMethod, itemsCount: input.items.length } });
  response.status(201).json({ item: sale });
}));

salesRouter.post('/:id/cancel', requireRole(...roleGroups.adminOnly), asyncHandler(async (request, response) => {
  const input = cancelSchema.parse(request.body);
  const sale = await cancelSale(idSchema.parse(request.params.id), input.reason, request.auth!.userId);
  await recordAuditLog({ actor: request.auth!, action: 'sales.cancel', entityType: 'sale', entityId: sale.id, summary: `Venta cancelada: ${sale.folio}`, metadata: { reason: input.reason, totalCents: sale.totalCents } });
  response.json({ item: sale });
}));
