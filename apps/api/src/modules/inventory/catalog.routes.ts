import { and, asc, eq, ilike, isNull, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, categories, productCompatibilities, products } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requireModule } from '../../middlewares/modules.js';

export const inventoryCatalogRouter = Router();
inventoryCatalogRouter.use(requireAuth, requireModule('inventory_basic'));

const idSchema = z.string().uuid();
const categoryInput = z.object({ name: z.string().trim().min(2).max(100), active: z.boolean().optional() });
const categoryQuery = z.object({ search: z.string().trim().max(100).default(''), includeInactive: z.coerce.boolean().default(false) });
const compatibilityInput = z.object({ brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(120) });

async function getBusiness() {
  const [business] = await db.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'Configura el negocio antes de continuar.');
  return business;
}

inventoryCatalogRouter.get('/categories', asyncHandler(async (request, response) => {
  const query = categoryQuery.parse(request.query);
  const items = await db.select({
    id: categories.id,
    name: categories.name,
    active: categories.active,
    createdAt: categories.createdAt,
    updatedAt: categories.updatedAt,
    productsCount: sql<number>`count(${products.id})::int`,
  }).from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), isNull(products.deletedAt)))
    .where(and(
      query.includeInactive ? undefined : eq(categories.active, true),
      query.search ? ilike(categories.name, `%${query.search}%`) : undefined,
    ))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  response.json({ items });
}));

inventoryCatalogRouter.post('/categories', requireRole(...roleGroups.inventory), asyncHandler(async (request, response) => {
  const input = categoryInput.parse(request.body);
  const [existing] = await db.select().from(categories).where(sql`lower(${categories.name}) = lower(${input.name})`).limit(1);
  if (existing?.active) throw new AppError(409, 'Ya existe una categoría con ese nombre.');
  const [item] = existing
    ? await db.update(categories).set({ name: input.name, active: true, updatedAt: new Date() }).where(eq(categories.id, existing.id)).returning()
    : await db.insert(categories).values({ name: input.name, active: true }).returning();
  if (!item) throw new AppError(500, 'No fue posible guardar la categoría.');
  await recordAuditLog({ actor: request.auth!, action: existing ? 'categories.reactivate' : 'categories.create', entityType: 'category', entityId: item.id, summary: `${existing ? 'Categoría reactivada' : 'Categoría creada'}: ${item.name}` });
  response.status(existing ? 200 : 201).json({ item });
}));

inventoryCatalogRouter.patch('/categories/:id', requireRole(...roleGroups.inventory), asyncHandler(async (request, response) => {
  const categoryId = idSchema.parse(request.params.id);
  const input = categoryInput.partial().parse(request.body);
  if (!Object.keys(input).length) throw new AppError(400, 'No hay cambios para guardar.');
  if (input.name) {
    const [duplicate] = await db.select({ id: categories.id }).from(categories).where(and(sql`lower(${categories.name}) = lower(${input.name})`, sql`${categories.id} <> ${categoryId}`)).limit(1);
    if (duplicate) throw new AppError(409, 'Ya existe una categoría con ese nombre.');
  }
  const [item] = await db.update(categories).set({ ...input, updatedAt: new Date() }).where(eq(categories.id, categoryId)).returning();
  if (!item) throw new AppError(404, 'Categoría no encontrada.');
  await recordAuditLog({ actor: request.auth!, action: 'categories.update', entityType: 'category', entityId: item.id, summary: `Categoría actualizada: ${item.name}`, metadata: input });
  response.json({ item });
}));

inventoryCatalogRouter.delete('/categories/:id', requireRole(...roleGroups.inventory), asyncHandler(async (request, response) => {
  const [item] = await db.update(categories).set({ active: false, updatedAt: new Date() }).where(and(eq(categories.id, idSchema.parse(request.params.id)), eq(categories.active, true))).returning();
  if (!item) throw new AppError(404, 'Categoría no encontrada o ya archivada.');
  await recordAuditLog({ actor: request.auth!, action: 'categories.archive', entityType: 'category', entityId: item.id, summary: `Categoría archivada: ${item.name}` });
  response.status(204).send();
}));

inventoryCatalogRouter.get('/products/:productId/compatibilities', asyncHandler(async (request, response) => {
  const business = await getBusiness();
  const productId = idSchema.parse(request.params.productId);
  const items = await db.select().from(productCompatibilities).where(and(eq(productCompatibilities.businessId, business.id), eq(productCompatibilities.productId, productId))).orderBy(asc(productCompatibilities.brand), asc(productCompatibilities.model));
  response.json({ items });
}));

inventoryCatalogRouter.post('/products/:productId/compatibilities', requireRole(...roleGroups.inventory), asyncHandler(async (request, response) => {
  const business = await getBusiness();
  const productId = idSchema.parse(request.params.productId);
  const input = compatibilityInput.parse(request.body);
  const [product] = await db.select({ id: products.id, name: products.name }).from(products).where(and(eq(products.id, productId), isNull(products.deletedAt))).limit(1);
  if (!product) throw new AppError(404, 'Producto no encontrado.');
  const [duplicate] = await db.select({ id: productCompatibilities.id }).from(productCompatibilities).where(and(
    eq(productCompatibilities.businessId, business.id),
    eq(productCompatibilities.productId, productId),
    sql`lower(${productCompatibilities.brand}) = lower(${input.brand})`,
    sql`lower(${productCompatibilities.model}) = lower(${input.model})`,
  )).limit(1);
  if (duplicate) throw new AppError(409, 'Esa compatibilidad ya está registrada.');
  const [item] = await db.insert(productCompatibilities).values({ businessId: business.id, productId, ...input }).returning();
  if (!item) throw new AppError(500, 'No fue posible registrar la compatibilidad.');
  await recordAuditLog({ actor: request.auth!, action: 'products.compatibility_add', entityType: 'product', entityId: productId, summary: `Compatibilidad agregada a ${product.name}`, metadata: { brand: item.brand, model: item.model } });
  response.status(201).json({ item });
}));

inventoryCatalogRouter.delete('/product-compatibilities/:id', requireRole(...roleGroups.inventory), asyncHandler(async (request, response) => {
  const business = await getBusiness();
  const compatibilityId = idSchema.parse(request.params.id);
  const [item] = await db.delete(productCompatibilities).where(and(eq(productCompatibilities.id, compatibilityId), eq(productCompatibilities.businessId, business.id))).returning();
  if (!item) throw new AppError(404, 'Compatibilidad no encontrada.');
  await recordAuditLog({ actor: request.auth!, action: 'products.compatibility_remove', entityType: 'product', entityId: item.productId, summary: `Compatibilidad eliminada: ${item.brand} ${item.model}` });
  response.status(204).send();
}));
