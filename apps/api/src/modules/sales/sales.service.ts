import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { businessSettings, folioCounters, inventoryMovements, products, saleItems, sales } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { recordCashMovementIfOpen } from '../cash/cash.service.js';

export type CreateSaleInput = {
  customerId?: string | null;
  paymentMethod: 'cash' | 'transfer' | 'card';
  discountCents: number;
  notes?: string | null;
  items: Array<{ productId: string; quantity: number }>;
};

export async function createSale(input: CreateSaleInput, userId: string) {
  return db.transaction(async (tx) => {
    const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
    if (!business) throw new AppError(409, 'Configura el negocio antes de registrar ventas.');

    const productIds = input.items.map((item) => item.productId);
    const catalog = await tx.select({
      id: products.id, name: products.name, priceCents: products.priceCents, costCents: products.costCents,
    }).from(products).where(and(inArray(products.id, productIds), isNull(products.deletedAt), eq(products.active, true)));
    if (catalog.length !== productIds.length) throw new AppError(409, 'Uno o más productos ya no están disponibles.');

    const byId = new Map(catalog.map((product) => [product.id, product]));
    const lineItems = input.items.map((item) => {
      const product = byId.get(item.productId)!;
      return { ...item, productNameSnapshot: product.name, unitPriceCents: product.priceCents, subtotalCents: product.priceCents * item.quantity, costCentsSnapshot: product.costCents ?? 0 };
    });
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.subtotalCents, 0);
    if (input.discountCents > subtotalCents) throw new AppError(400, 'El descuento no puede superar el subtotal.');
    const totalCents = subtotalCents - input.discountCents;

    const [counter] = await tx.insert(folioCounters).values({ scope: 'sale', value: 1 })
      .onConflictDoUpdate({ target: folioCounters.scope, set: { value: sql`${folioCounters.value} + 1`, updatedAt: new Date() } })
      .returning({ value: folioCounters.value });
    if (!counter) throw new AppError(500, 'No fue posible generar el folio de venta.');

    const [sale] = await tx.insert(sales).values({
      businessId: business.id,
      folio: `VTA-${String(counter.value).padStart(5, '0')}`,
      customerId: input.customerId ?? null,
      userId,
      subtotalCents,
      discountCents: input.discountCents,
      totalCents,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
    }).returning();
    if (!sale) throw new AppError(500, 'No fue posible registrar la venta.');

    await tx.insert(saleItems).values(lineItems.map((item) => ({
      businessId: business.id,
      saleId: sale.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      subtotalCents: item.subtotalCents,
      costCentsSnapshot: item.costCentsSnapshot,
    })));

    for (const item of lineItems) {
      const [updated] = await tx.update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: new Date() })
        .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity), isNull(products.deletedAt), eq(products.active, true)))
        .returning({ newStock: products.stock });
      if (!updated) throw new AppError(409, `Stock insuficiente para ${item.productNameSnapshot}.`, 'INSUFFICIENT_STOCK');
      await tx.insert(inventoryMovements).values({
        businessId: business.id,
        productId: item.productId,
        userId,
        type: 'sale',
        quantity: item.quantity,
        previousStock: updated.newStock + item.quantity,
        newStock: updated.newStock,
        referenceType: 'sale',
        referenceId: sale.id,
        notes: `Venta ${sale.folio}`,
      });
    }
    const cashResult = await recordCashMovementIfOpen(tx, { businessId: business.id, type: 'sale_payment', method: sale.paymentMethod, amountCents: sale.totalCents, direction: 'in', referenceType: 'sale', referenceId: sale.id, referenceFolio: sale.folio, reason: 'Venta POS', userId });
    return { ...sale, cashWarning: cashResult.cashWarning };
  });
}

export async function cancelSale(saleId: string, reason: string, userId: string) {
  return db.transaction(async (tx) => {
    const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
    if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
    const [sale] = await tx.update(sales).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(sales.id, saleId), eq(sales.businessId, business.id), eq(sales.status, 'completed'), isNull(sales.deletedAt)))
      .returning();
    if (!sale) throw new AppError(409, 'La venta no existe o ya fue cancelada.');

    const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    for (const item of items) {
      const [updated] = await tx.update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: new Date() })
        .where(eq(products.id, item.productId))
        .returning({ newStock: products.stock });
      if (!updated) throw new AppError(409, `No fue posible devolver stock de ${item.productNameSnapshot}.`);
      await tx.insert(inventoryMovements).values({
        businessId: business.id,
        productId: item.productId,
        userId,
        type: 'sale_cancel',
        quantity: item.quantity,
        previousStock: updated.newStock - item.quantity,
        newStock: updated.newStock,
        referenceType: 'sale',
        referenceId: sale.id,
        notes: reason,
      });
    }
    const cashResult = await recordCashMovementIfOpen(tx, { businessId: business.id, type: 'sale_cancel', method: sale.paymentMethod, amountCents: sale.totalCents, direction: 'out', referenceType: 'sale', referenceId: sale.id, referenceFolio: sale.folio, reason, userId });
    return { ...sale, cashWarning: cashResult.cashWarning };
  });
}

