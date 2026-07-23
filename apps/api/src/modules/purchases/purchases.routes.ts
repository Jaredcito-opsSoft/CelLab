import { and, desc, eq, gte, ilike, isNull, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, folioCounters, inventoryMovements, products, purchaseItems, purchases, repairEvents, repairs, suppliers } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requireModule } from '../../middlewares/modules.js';
import { assertModuleEnabled } from '../modules/modules.service.js';

export const purchasesRouter = Router();
purchasesRouter.use(requireAuth, requireModule('purchases'));

const id = z.string().uuid();
const statusInput = z.enum(['draft', 'ordered', 'partially_received', 'received', 'cancelled']);
const queryInput = z.object({ search: z.string().trim().max(100).default(''), status: statusInput.optional(), limit: z.coerce.number().int().min(1).max(100).default(80) });
const purchaseInput = z.object({
  supplierId: z.string().uuid(),
  repairId: z.string().uuid().nullable().optional(),
  expectedAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(['draft', 'ordered']).default('draft'),
});
const purchaseUpdateInput = purchaseInput.partial().extend({ status: z.enum(['draft', 'ordered']).optional() });
const itemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99999),
  unitCostCents: z.number().int().min(0).max(99_999_999),
});
const receiveInput = z.object({ note: z.string().trim().max(1000).nullable().optional() });
const cancelInput = z.object({ reason: z.string().trim().min(3).max(1000).default('Compra cancelada') });

async function getBusiness(tx: typeof db | any = db) {
  const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'Configura el negocio antes de continuar.');
  return business;
}

async function recalculatePurchaseSubtotal(purchaseId: string, tx: typeof db | any = db) {
  const [subtotal] = await tx.select({ value: sql<number>`coalesce(sum(${purchaseItems.totalCents}), 0)::int` }).from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
  const [purchase] = await tx.update(purchases).set({ subtotalCents: subtotal?.value ?? 0, updatedAt: new Date() }).where(eq(purchases.id, purchaseId)).returning();
  return purchase;
}

function assertEditable(status: string) {
  if (status !== 'draft' && status !== 'ordered') throw new AppError(409, 'La compra ya no se puede editar en este estado.');
}

const canViewCosts = (role: string) => role === 'admin' || role === 'manager';

purchasesRouter.get('/', asyncHandler(async (request, response) => {
  const query = queryInput.parse(request.query);
  const showCosts = canViewCosts(request.auth!.role);
  const rows = await db.select({
    id: purchases.id,
    businessId: purchases.businessId,
    supplierId: purchases.supplierId,
    supplierName: suppliers.name,
    repairId: purchases.repairId,
    folio: purchases.folio,
    status: purchases.status,
    expectedAt: purchases.expectedAt,
    notes: purchases.notes,
    subtotalCents: purchases.subtotalCents,
    receivedAt: purchases.receivedAt,
    cancelledAt: purchases.cancelledAt,
    createdAt: purchases.createdAt,
    updatedAt: purchases.updatedAt,
  }).from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(and(
      query.status ? eq(purchases.status, query.status) : undefined,
      query.search ? or(ilike(purchases.folio, `%${query.search}%`), ilike(suppliers.name, `%${query.search}%`)) : undefined,
    ))
    .orderBy(desc(purchases.createdAt))
    .limit(query.limit);
  response.json({ items: showCosts ? rows : rows.map((item) => ({ ...item, subtotalCents: 0 })) });
}));

purchasesRouter.get('/:id', asyncHandler(async (request, response) => {
  const purchaseId = id.parse(request.params.id);
  const showCosts = canViewCosts(request.auth!.role);
  const [item] = await db.select({
    id: purchases.id,
    supplierId: purchases.supplierId,
    supplierName: suppliers.name,
    repairId: purchases.repairId,
    folio: purchases.folio,
    status: purchases.status,
    expectedAt: purchases.expectedAt,
    notes: purchases.notes,
    subtotalCents: purchases.subtotalCents,
    receivedAt: purchases.receivedAt,
    cancelledAt: purchases.cancelledAt,
    createdAt: purchases.createdAt,
    updatedAt: purchases.updatedAt,
  }).from(purchases).innerJoin(suppliers, eq(purchases.supplierId, suppliers.id)).where(eq(purchases.id, purchaseId)).limit(1);
  if (!item) throw new AppError(404, 'Compra no encontrada.');

  const items = await db.select({
    id: purchaseItems.id,
    productId: purchaseItems.productId,
    productName: purchaseItems.productNameSnapshot,
    quantity: purchaseItems.quantity,
    receivedQuantity: purchaseItems.receivedQuantity,
    unitCostCents: purchaseItems.unitCostCents,
    totalCents: purchaseItems.totalCents,
  }).from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId)).orderBy(purchaseItems.createdAt);

  response.json({
    item: {
      ...item,
      subtotalCents: showCosts ? item.subtotalCents : 0,
      items: showCosts ? items : items.map((line) => ({ ...line, unitCostCents: 0, totalCents: 0 })),
    },
  });
}));

purchasesRouter.post('/', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const input = purchaseInput.parse(request.body);
  const item = await db.transaction(async (tx) => {
    const business = await getBusiness(tx);
    const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.id, input.supplierId), isNull(suppliers.deletedAt), eq(suppliers.active, true))).limit(1);
    if (!supplier) throw new AppError(404, 'Proveedor no encontrado o inactivo.');
    if (input.repairId) {
      await assertModuleEnabled(request.auth!.businessId, 'repairs', tx);
      await assertModuleEnabled(request.auth!.businessId, 'repair_parts', tx);
      const [repair] = await tx.select({ id: repairs.id }).from(repairs).where(and(eq(repairs.id, input.repairId), isNull(repairs.deletedAt))).limit(1);
      if (!repair) throw new AppError(404, 'Reparación no encontrada.');
    }
    const [counter] = await tx.insert(folioCounters).values({ scope: 'purchase', value: 1 })
      .onConflictDoUpdate({ target: folioCounters.scope, set: { value: sql`${folioCounters.value}+1`, updatedAt: new Date() } })
      .returning({ value: folioCounters.value });
    if (!counter) throw new AppError(500, 'No fue posible generar el folio de compra.');
    const [created] = await tx.insert(purchases).values({
      businessId: business.id,
      supplierId: input.supplierId,
      repairId: input.repairId ?? null,
      folio: `COM-${String(counter.value).padStart(5, '0')}`,
      status: input.status,
      expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
      notes: input.notes ?? null,
      createdByUserId: request.auth!.userId,
      updatedByUserId: request.auth!.userId,
    }).returning();
    if (!created) throw new AppError(500, 'No fue posible crear la compra.');
    return created;
  });
  if (!item) throw new AppError(500, 'No fue posible crear la compra.');
  await recordAuditLog({ actor: request.auth!, action: 'purchase.created', entityType: 'purchase', entityId: item.id, summary: `Compra creada: ${item.folio}`, metadata: { supplierId: item.supplierId, repairId: item.repairId } });
  response.status(201).json({ item });
}));

purchasesRouter.patch('/:id', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const purchaseId = id.parse(request.params.id);
  const input = purchaseUpdateInput.parse(request.body);
  const [current] = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
  if (!current) throw new AppError(404, 'Compra no encontrada.');
  assertEditable(current.status);

  const [item] = await db.update(purchases).set({
    ...input,
    expectedAt: input.expectedAt === undefined ? current.expectedAt : input.expectedAt ? new Date(input.expectedAt) : null,
    repairId: input.repairId === undefined ? current.repairId : input.repairId ?? null,
    notes: input.notes === undefined ? current.notes : input.notes ?? null,
    updatedByUserId: request.auth!.userId,
    updatedAt: new Date(),
  }).where(eq(purchases.id, purchaseId)).returning();
  if (!item) throw new AppError(500, 'No fue posible actualizar la compra.');

  await recordAuditLog({ actor: request.auth!, action: 'purchase.updated', entityType: 'purchase', entityId: item.id, summary: `Compra actualizada: ${item.folio}`, metadata: input });
  response.json({ item });
}));

purchasesRouter.post('/:id/items', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const purchaseId = id.parse(request.params.id);
  const input = itemInput.parse(request.body);
  const item = await db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
    if (!purchase) throw new AppError(404, 'Compra no encontrada.');
    assertEditable(purchase.status);
    const [product] = await tx.select().from(products).where(and(eq(products.id, input.productId), isNull(products.deletedAt))).limit(1);
    if (!product) throw new AppError(404, 'Producto no encontrado.');
    const [created] = await tx.insert(purchaseItems).values({
      purchaseId,
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: input.quantity,
      unitCostCents: input.unitCostCents,
      totalCents: input.quantity * input.unitCostCents,
    }).returning();
    if (!created) throw new AppError(500, 'No fue posible agregar el producto a la compra.');
    await recalculatePurchaseSubtotal(purchaseId, tx);
    return created;
  });
  if (!item) throw new AppError(500, 'No fue posible agregar el producto a la compra.');

  await recordAuditLog({ actor: request.auth!, action: 'purchase.item_added', entityType: 'purchase', entityId: purchaseId, summary: 'Producto agregado a compra', metadata: { productId: item.productId, quantity: item.quantity, unitCostCents: item.unitCostCents } });
  response.status(201).json({ item });
}));

purchasesRouter.patch('/:id/items/:itemId', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const purchaseId = id.parse(request.params.id);
  const itemId = id.parse(request.params.itemId);
  const input = itemInput.partial().parse(request.body);
  const item = await db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
    if (!purchase) throw new AppError(404, 'Compra no encontrada.');
    assertEditable(purchase.status);
    const [current] = await tx.select().from(purchaseItems).where(and(eq(purchaseItems.id, itemId), eq(purchaseItems.purchaseId, purchaseId))).limit(1);
    if (!current) throw new AppError(404, 'Producto de compra no encontrado.');
    if (current.receivedQuantity > 0) throw new AppError(409, 'No se puede editar una partida ya recibida.');
    const productId = input.productId ?? current.productId;
    const [product] = await tx.select().from(products).where(and(eq(products.id, productId), isNull(products.deletedAt))).limit(1);
    if (!product) throw new AppError(404, 'Producto no encontrado.');
    const quantity = input.quantity ?? current.quantity;
    const unitCostCents = input.unitCostCents ?? current.unitCostCents;
    const [updated] = await tx.update(purchaseItems).set({
      productId,
      productNameSnapshot: product.name,
      quantity,
      unitCostCents,
      totalCents: quantity * unitCostCents,
      updatedAt: new Date(),
    }).where(eq(purchaseItems.id, itemId)).returning();
    if (!updated) throw new AppError(500, 'No fue posible actualizar el producto de compra.');
    await recalculatePurchaseSubtotal(purchaseId, tx);
    return updated;
  });
  if (!item) throw new AppError(500, 'No fue posible actualizar el producto de compra.');

  await recordAuditLog({ actor: request.auth!, action: 'purchase.item_updated', entityType: 'purchase', entityId: purchaseId, summary: 'Producto de compra actualizado', metadata: { itemId, ...input } });
  response.json({ item });
}));

purchasesRouter.post('/:id/receive', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const purchaseId = id.parse(request.params.id);
  const input = receiveInput.parse(request.body);
  const item = await db.transaction(async (tx) => {
    const business = await getBusiness(tx);
    const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
    if (!purchase) throw new AppError(404, 'Compra no encontrada.');
    if (purchase.status === 'cancelled' || purchase.status === 'received') throw new AppError(409, 'La compra no puede recibirse en este estado.');
    const lines = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    if (!lines.length) throw new AppError(409, 'Agrega al menos un producto antes de recibir la compra.');

    for (const line of lines) {
      const pending = line.quantity - line.receivedQuantity;
      if (pending <= 0) continue;
      const [product] = await tx.select().from(products).where(and(eq(products.id, line.productId), isNull(products.deletedAt))).limit(1);
      if (!product) throw new AppError(404, `Producto no encontrado para ${line.productNameSnapshot}.`);
      const nextStock = product.stock + pending;
      await tx.update(products).set({ stock: nextStock, costCents: line.unitCostCents, updatedAt: new Date() }).where(and(eq(products.id, line.productId), gte(products.stock, 0)));
      await tx.update(purchaseItems).set({ receivedQuantity: line.quantity, updatedAt: new Date() }).where(eq(purchaseItems.id, line.id));
      await tx.insert(inventoryMovements).values({
        businessId: business.id,
        productId: line.productId,
        userId: request.auth!.userId,
        type: 'purchase_receipt',
        quantity: pending,
        previousStock: product.stock,
        newStock: nextStock,
        referenceType: 'purchase',
        referenceId: purchase.id,
        notes: input.note ?? `Recepción de compra ${purchase.folio}`,
      });
      await recordAuditLog({ actor: request.auth!, action: 'inventory.purchase_receipt', entityType: 'product', entityId: line.productId, summary: `Recepción de compra ${purchase.folio}`, metadata: { purchaseId, quantity: pending, unitCostCents: line.unitCostCents } }, tx);
    }

    const [updated] = await tx.update(purchases).set({ status: 'received', receivedAt: new Date(), updatedAt: new Date(), updatedByUserId: request.auth!.userId }).where(eq(purchases.id, purchaseId)).returning();
    if (!updated) throw new AppError(500, 'No fue posible recibir la compra.');
    if (updated.repairId) {
      await tx.insert(repairEvents).values({ repairId: updated.repairId, toStatus: 'in_repair', note: `Pieza recibida mediante compra ${updated.folio}.`, createdById: request.auth!.userId });
      await recordAuditLog({ actor: request.auth!, action: 'repair.part_received', entityType: 'repair', entityId: updated.repairId, summary: `Pieza recibida mediante compra ${updated.folio}.`, metadata: { purchaseId } }, tx);
    }
    return updated;
  });
  if (!item) throw new AppError(500, 'No fue posible recibir la compra.');

  await recordAuditLog({ actor: request.auth!, action: 'purchase.received', entityType: 'purchase', entityId: item.id, summary: `Compra recibida: ${item.folio}`, metadata: { subtotalCents: item.subtotalCents } });
  response.json({ item });
}));

purchasesRouter.post('/:id/cancel', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const purchaseId = id.parse(request.params.id);
  const input = cancelInput.parse(request.body);
  const [current] = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
  if (!current) throw new AppError(404, 'Compra no encontrada.');
  if (current.status === 'received') throw new AppError(409, 'No se puede cancelar una compra recibida.');
  if (current.status === 'cancelled') throw new AppError(409, 'La compra ya está cancelada.');
  const [item] = await db.update(purchases).set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date(), updatedByUserId: request.auth!.userId }).where(eq(purchases.id, purchaseId)).returning();
  if (!item) throw new AppError(500, 'No fue posible cancelar la compra.');

  await recordAuditLog({ actor: request.auth!, action: 'purchase.cancelled', entityType: 'purchase', entityId: item.id, summary: `Compra cancelada: ${item.folio}`, metadata: { reason: input.reason } });
  response.json({ item });
}));
