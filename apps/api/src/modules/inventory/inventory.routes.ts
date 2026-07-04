import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, inventoryMovements, products, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { AppError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

const movementTypes = ['sale','sale_cancel','stock_entry','manual_adjustment','service_usage','service_usage_void'] as const;
const querySchema = z.object({ productId: z.string().uuid().optional(), type: z.enum(movementTypes).optional(), limit: z.coerce.number().int().min(1).max(200).default(100) });
const productIdInput = z.object({ productId: z.string().uuid(), note: z.string().trim().max(1000).nullable().optional() });
const stockEntryInput = productIdInput.extend({ quantity: z.number().int().min(1).max(99999), unitCostCents: z.number().int().min(0).optional() });
const stockExitInput = productIdInput.extend({ quantity: z.number().int().min(1).max(99999), reason: z.string().trim().min(3).max(160) });
const adjustInput = productIdInput.extend({ type: z.enum(['increase','decrease','set']), quantity: z.number().int().min(0).max(99999), reason: z.string().trim().min(3).max(160) });

async function getBusiness() {
  const [business] = await db.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
  return business;
}

inventoryRouter.get('/', asyncHandler(async (request, response) => {
  const query = querySchema.parse(request.query);
  const business = await getBusiness();
  const items = await db.select({
    id: inventoryMovements.id, productId: inventoryMovements.productId, productName: products.name,
    userId: inventoryMovements.userId, userName: users.name, type: inventoryMovements.type,
    quantity: inventoryMovements.quantity, previousStock: inventoryMovements.previousStock,
    newStock: inventoryMovements.newStock, referenceType: inventoryMovements.referenceType,
    referenceId: inventoryMovements.referenceId, notes: inventoryMovements.notes, createdAt: inventoryMovements.createdAt,
  }).from(inventoryMovements)
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .innerJoin(users, eq(inventoryMovements.userId, users.id))
    .where(and(eq(inventoryMovements.businessId, business.id), query.productId ? eq(inventoryMovements.productId, query.productId) : undefined, query.type ? eq(inventoryMovements.type, query.type) : undefined))
    .orderBy(desc(inventoryMovements.createdAt)).limit(query.limit);
  response.json({ items });
}));

inventoryRouter.post('/stock-entry', requireRole('admin'), asyncHandler(async (request, response) => {
  const input = stockEntryInput.parse(request.body);
  const item = await db.transaction(async (tx) => {
    const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
    if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
    const [product] = await tx.select().from(products).where(and(eq(products.id, input.productId), isNull(products.deletedAt))).limit(1);
    if (!product) throw new AppError(404, 'Producto no encontrado.');
    const nextStock = product.stock + input.quantity;
    const [updated] = await tx.update(products).set({ stock: nextStock, costCents: input.unitCostCents ?? product.costCents, updatedAt: new Date() }).where(eq(products.id, input.productId)).returning();
    await tx.insert(inventoryMovements).values({ businessId: business.id, productId: input.productId, userId: request.auth!.userId, type: 'stock_entry', quantity: input.quantity, previousStock: product.stock, newStock: nextStock, referenceType: 'product', referenceId: input.productId, notes: input.note ?? 'Entrada de stock' });
    return updated;
  });
  response.status(201).json({ item });
}));

inventoryRouter.post('/stock-exit', requireRole('admin'), asyncHandler(async (request, response) => {
  const input = stockExitInput.parse(request.body);
  const item = await db.transaction(async (tx) => {
    const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
    if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
    const [product] = await tx.select().from(products).where(and(eq(products.id, input.productId), isNull(products.deletedAt))).limit(1);
    if (!product) throw new AppError(404, 'Producto no encontrado.');
    const [updated] = await tx.update(products).set({ stock: sql`${products.stock}-${input.quantity}`, updatedAt: new Date() }).where(and(eq(products.id, input.productId), gte(products.stock, input.quantity))).returning();
    if (!updated) throw new AppError(409, `Stock insuficiente para ${product.name}.`, 'INSUFFICIENT_STOCK');
    await tx.insert(inventoryMovements).values({ businessId: business.id, productId: input.productId, userId: request.auth!.userId, type: 'manual_adjustment', quantity: input.quantity, previousStock: product.stock, newStock: product.stock - input.quantity, referenceType: 'manual', referenceId: input.productId, notes: `${input.reason}${input.note ? ': '+input.note : ''}` });
    return updated;
  });
  response.status(201).json({ item });
}));

inventoryRouter.post('/adjust', requireRole('admin'), asyncHandler(async (request, response) => {
  const input = adjustInput.parse(request.body);
  if (input.type !== 'set' && input.quantity < 1) throw new AppError(400, 'La cantidad debe ser mayor a cero.');
  const item = await db.transaction(async (tx) => {
    const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
    if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
    const [product] = await tx.select().from(products).where(and(eq(products.id, input.productId), isNull(products.deletedAt))).limit(1);
    if (!product) throw new AppError(404, 'Producto no encontrado.');
    const nextStock = input.type === 'set' ? input.quantity : input.type === 'increase' ? product.stock + input.quantity : product.stock - input.quantity;
    if (nextStock < 0) throw new AppError(409, `Stock insuficiente para ${product.name}.`, 'INSUFFICIENT_STOCK');
    const movementQuantity = Math.abs(nextStock - product.stock);
    if (movementQuantity === 0) throw new AppError(400, 'El ajuste no cambia la existencia actual.');
    const [updated] = await tx.update(products).set({ stock: nextStock, updatedAt: new Date() }).where(eq(products.id, input.productId)).returning();
    await tx.insert(inventoryMovements).values({ businessId: business.id, productId: input.productId, userId: request.auth!.userId, type: 'manual_adjustment', quantity: movementQuantity, previousStock: product.stock, newStock: nextStock, referenceType: 'manual', referenceId: input.productId, notes: `${input.reason}${input.note ? ': '+input.note : ''}` });
    return updated;
  });
  response.status(201).json({ item });
}));