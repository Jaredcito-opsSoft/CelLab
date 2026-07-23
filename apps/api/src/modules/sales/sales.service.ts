import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  businessSettings, folioCounters, inventoryMovements, products, saleItems, salePayments,
  saleReturnItems, saleReturnPayments, saleReturns, sales,
} from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { recordCashMovementIfOpen } from '../cash/cash.service.js';

type ConcretePaymentMethod = 'cash' | 'transfer' | 'card';
export type PaymentInput = { method: ConcretePaymentMethod; amountCents: number; receivedAmountCents?: number | null };

export type CreateSaleInput = {
  cashRegisterId?: string | null;
  customerId?: string | null;
  paymentMethod?: ConcretePaymentMethod;
  payments?: PaymentInput[];
  discountCents: number;
  notes?: string | null;
  items: Array<{ productId: string; quantity: number }>;
};

export type CreateReturnInput = {
  cashRegisterId?: string | null;
  reason: string;
  items: Array<{ saleItemId: string; quantity: number }>;
  payments: Array<{ method: ConcretePaymentMethod; amountCents: number }>;
};

function normalizePayments(input: CreateSaleInput, totalCents: number): PaymentInput[] {
  const rows = input.payments?.length ? input.payments : input.paymentMethod && totalCents > 0
    ? [{ method: input.paymentMethod, amountCents: totalCents }]
    : [];
  const sum = rows.reduce((value, payment) => value + payment.amountCents, 0);
  if (sum !== totalCents) throw new AppError(400, 'La suma de los pagos debe coincidir con el total de la venta.');
  return rows;
}

export async function createSale(input: CreateSaleInput, userId: string) {
  return db.transaction(async (tx) => {
    const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
    if (!business) throw new AppError(409, 'Configura el negocio antes de registrar ventas.');

    const productIds = input.items.map((item) => item.productId);
    const catalog = await tx.select({ id: products.id, name: products.name, priceCents: products.priceCents, costCents: products.costCents })
      .from(products).where(and(inArray(products.id, productIds), isNull(products.deletedAt), eq(products.active, true)));
    if (catalog.length !== productIds.length) throw new AppError(409, 'Uno o más productos ya no están disponibles.');

    const byId = new Map(catalog.map((product) => [product.id, product]));
    const lineItems = input.items.map((item) => {
      const product = byId.get(item.productId)!;
      return { ...item, productNameSnapshot: product.name, unitPriceCents: product.priceCents, subtotalCents: product.priceCents * item.quantity, costCentsSnapshot: product.costCents ?? 0 };
    });
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.subtotalCents, 0);
    if (input.discountCents > subtotalCents) throw new AppError(400, 'El descuento no puede superar el subtotal.');
    const totalCents = subtotalCents - input.discountCents;
    const paymentRows = normalizePayments(input, totalCents);
    const paymentMethod = paymentRows.length > 1 ? 'mixed' : (paymentRows[0]?.method ?? input.paymentMethod ?? 'cash');

    const [counter] = await tx.insert(folioCounters).values({ scope: 'sale', value: 1 })
      .onConflictDoUpdate({ target: folioCounters.scope, set: { value: sql`${folioCounters.value} + 1`, updatedAt: new Date() } })
      .returning({ value: folioCounters.value });
    if (!counter) throw new AppError(500, 'No fue posible generar el folio de venta.');

    const [sale] = await tx.insert(sales).values({
      businessId: business.id, folio: `VTA-${String(counter.value).padStart(5, '0')}`,
      customerId: input.customerId ?? null, userId, subtotalCents, discountCents: input.discountCents,
      totalCents, paymentMethod, notes: input.notes ?? null,
    }).returning();
    if (!sale) throw new AppError(500, 'No fue posible registrar la venta.');

    await tx.insert(saleItems).values(lineItems.map((item) => ({
      businessId: business.id, saleId: sale.id, productId: item.productId,
      productNameSnapshot: item.productNameSnapshot, quantity: item.quantity,
      unitPriceCents: item.unitPriceCents, subtotalCents: item.subtotalCents, costCentsSnapshot: item.costCentsSnapshot,
    })));
    if (paymentRows.length) await tx.insert(salePayments).values(paymentRows.map((payment) => ({
      businessId: business.id, saleId: sale.id, method: payment.method, amountCents: payment.amountCents,
      receivedAmountCents: payment.receivedAmountCents ?? null, createdByUserId: userId,
    })));

    for (const item of [...lineItems].sort((left, right) => left.productId.localeCompare(right.productId))) {
      const [updated] = await tx.update(products).set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: new Date() })
        .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity), isNull(products.deletedAt), eq(products.active, true)))
        .returning({ newStock: products.stock });
      if (!updated) throw new AppError(409, `Stock insuficiente para ${item.productNameSnapshot}.`, 'INSUFFICIENT_STOCK');
      await tx.insert(inventoryMovements).values({ businessId: business.id, productId: item.productId, userId, type: 'sale', quantity: item.quantity, previousStock: updated.newStock + item.quantity, newStock: updated.newStock, referenceType: 'sale', referenceId: sale.id, notes: `Venta ${sale.folio}` });
    }
    const warnings: string[] = [];
    for (const payment of paymentRows) {
      const result = await recordCashMovementIfOpen(tx, { businessId: business.id, cashRegisterId: input.cashRegisterId, type: 'sale_payment', method: payment.method, amountCents: payment.amountCents, direction: 'in', referenceType: 'sale', referenceId: sale.id, referenceFolio: sale.folio, reason: 'Venta POS', userId });
      if (result.cashWarning) warnings.push(result.cashWarning);
    }
    return { ...sale, payments: paymentRows, cashWarning: warnings[0] ?? null };
  });
}

export async function createSaleReturn(saleId: string, input: CreateReturnInput, userId: string) {
  return db.transaction(async (tx) => {
    const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
    if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${saleId}))`);
    const [sale] = await tx.select().from(sales).where(and(eq(sales.id, saleId), eq(sales.businessId, business.id), isNull(sales.deletedAt))).limit(1);
    if (!sale || sale.status === 'cancelled') throw new AppError(409, 'La venta no permite devoluciones.');

    const originalItems = await tx.select().from(saleItems).where(and(eq(saleItems.saleId, saleId), inArray(saleItems.id, input.items.map((item) => item.saleItemId))));
    if (originalItems.length !== input.items.length) throw new AppError(400, 'La devolución contiene artículos que no pertenecen a la venta.');
    const previous = await tx.select({ saleItemId: saleReturnItems.saleItemId, quantity: sql<number>`coalesce(sum(${saleReturnItems.quantity}), 0)::int` })
      .from(saleReturnItems).innerJoin(saleReturns, and(eq(saleReturnItems.saleReturnId, saleReturns.id), eq(saleReturns.status, 'completed')))
      .where(and(eq(saleReturns.saleId, saleId), inArray(saleReturnItems.saleItemId, input.items.map((item) => item.saleItemId))))
      .groupBy(saleReturnItems.saleItemId);
    const returnedByItem = new Map(previous.map((row) => [row.saleItemId, row.quantity]));
    const itemById = new Map(originalItems.map((item) => [item.id, item]));
    const returnLines = input.items.map((requested) => {
      const original = itemById.get(requested.saleItemId)!;
      if ((returnedByItem.get(original.id) ?? 0) + requested.quantity > original.quantity) throw new AppError(409, `La cantidad a devolver de ${original.productNameSnapshot} supera la disponible.`);
      return { original, quantity: requested.quantity, totalCents: original.unitPriceCents * requested.quantity };
    });
    const subtotalCents = returnLines.reduce((sum, line) => sum + line.totalCents, 0);
    const refundedBefore = await tx.select({ value: sql<number>`coalesce(sum(${saleReturns.totalCents}), 0)::int` }).from(saleReturns).where(and(eq(saleReturns.saleId, saleId), eq(saleReturns.status, 'completed')));
    const refundableCents = sale.totalCents - (refundedBefore[0]?.value ?? 0);
    const totalCents = input.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    if (totalCents <= 0 || totalCents > subtotalCents || totalCents > refundableCents) throw new AppError(400, 'El reembolso supera el importe disponible para devolver.');

    const [counter] = await tx.insert(folioCounters).values({ scope: 'sale_return', value: 1 })
      .onConflictDoUpdate({ target: folioCounters.scope, set: { value: sql`${folioCounters.value} + 1`, updatedAt: new Date() } }).returning({ value: folioCounters.value });
    const [saleReturn] = await tx.insert(saleReturns).values({ businessId: business.id, folio: `DEV-${String(counter!.value).padStart(5, '0')}`, saleId, userId, reason: input.reason, subtotalCents, totalCents }).returning();
    if (!saleReturn) throw new AppError(500, 'No fue posible registrar la devolución.');
    await tx.insert(saleReturnItems).values(returnLines.map(({ original, quantity, totalCents: lineTotal }) => ({ businessId: business.id, saleReturnId: saleReturn.id, saleItemId: original.id, productId: original.productId, productNameSnapshot: original.productNameSnapshot, quantity, unitPriceCents: original.unitPriceCents, totalCents: lineTotal, costCentsSnapshot: original.costCentsSnapshot })));
    await tx.insert(saleReturnPayments).values(input.payments.map((payment) => ({ businessId: business.id, saleReturnId: saleReturn.id, method: payment.method, amountCents: payment.amountCents, createdByUserId: userId })));

    for (const line of [...returnLines].sort((left, right) => left.original.productId.localeCompare(right.original.productId))) {
      const [updated] = await tx.update(products).set({ stock: sql`${products.stock} + ${line.quantity}`, updatedAt: new Date() }).where(eq(products.id, line.original.productId)).returning({ newStock: products.stock });
      if (!updated) throw new AppError(409, `No fue posible devolver stock de ${line.original.productNameSnapshot}.`);
      await tx.insert(inventoryMovements).values({ businessId: business.id, productId: line.original.productId, userId, type: 'sale_return', quantity: line.quantity, previousStock: updated.newStock - line.quantity, newStock: updated.newStock, referenceType: 'sale_return', referenceId: saleReturn.id, notes: `Devolución ${saleReturn.folio} de ${sale.folio}` });
    }
    const warnings: string[] = [];
    for (const payment of input.payments) {
      const result = await recordCashMovementIfOpen(tx, { businessId: business.id, cashRegisterId: input.cashRegisterId, type: 'sale_refund', method: payment.method, amountCents: payment.amountCents, direction: 'out', referenceType: 'sale_return', referenceId: saleReturn.id, referenceFolio: saleReturn.folio, reason: input.reason, userId });
      if (result.cashWarning) warnings.push(result.cashWarning);
    }
    const allItems = await tx.select({ sold: sql<number>`coalesce(sum(${saleItems.quantity}), 0)::int` }).from(saleItems).where(eq(saleItems.saleId, saleId));
    const returnedItems = await tx.select({ returned: sql<number>`coalesce(sum(${saleReturnItems.quantity}), 0)::int` }).from(saleReturnItems).innerJoin(saleReturns, and(eq(saleReturnItems.saleReturnId, saleReturns.id), eq(saleReturns.status, 'completed'))).where(eq(saleReturns.saleId, saleId));
    const fullyRefunded = (returnedItems[0]?.returned ?? 0) >= (allItems[0]?.sold ?? 0) || totalCents >= refundableCents;
    await tx.update(sales).set({ status: fullyRefunded ? 'refunded' : 'partially_refunded', updatedAt: new Date() }).where(eq(sales.id, saleId));
    return { ...saleReturn, cashWarning: warnings[0] ?? null };
  });
}

export async function cancelSale(saleId: string, reason: string, userId: string, cashRegisterId?: string | null) {
  return db.transaction(async (tx) => {
    const [business] = await tx.select({ id: businessSettings.id }).from(businessSettings).limit(1);
    if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${saleId}))`);
    const [hasReturn] = await tx.select({ id: saleReturns.id }).from(saleReturns).where(and(eq(saleReturns.saleId, saleId), eq(saleReturns.status, 'completed'))).limit(1);
    if (hasReturn) throw new AppError(409, 'Una venta con devoluciones debe resolverse mediante devoluciones parciales.');
    const [sale] = await tx.update(sales).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(sales.id, saleId), eq(sales.businessId, business.id), eq(sales.status, 'completed'), isNull(sales.deletedAt))).returning();
    if (!sale) throw new AppError(409, 'La venta no existe o ya no puede cancelarse.');
    const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    for (const item of [...items].sort((left, right) => left.productId.localeCompare(right.productId))) {
      const [updated] = await tx.update(products).set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: new Date() }).where(eq(products.id, item.productId)).returning({ newStock: products.stock });
      if (!updated) throw new AppError(409, `No fue posible devolver stock de ${item.productNameSnapshot}.`);
      await tx.insert(inventoryMovements).values({ businessId: business.id, productId: item.productId, userId, type: 'sale_cancel', quantity: item.quantity, previousStock: updated.newStock - item.quantity, newStock: updated.newStock, referenceType: 'sale', referenceId: sale.id, notes: reason });
    }
    const payments = await tx.select().from(salePayments).where(and(eq(salePayments.saleId, sale.id), isNull(salePayments.voidedAt)));
    const refundRows = payments.length ? payments : [{ method: sale.paymentMethod === 'mixed' ? 'cash' as const : sale.paymentMethod, amountCents: sale.totalCents }];
    const warnings: string[] = [];
    for (const payment of refundRows) {
      if (payment.amountCents <= 0) continue;
      const result = await recordCashMovementIfOpen(tx, { businessId: business.id, cashRegisterId, type: 'sale_cancel', method: payment.method as ConcretePaymentMethod, amountCents: payment.amountCents, direction: 'out', referenceType: 'sale', referenceId: sale.id, referenceFolio: sale.folio, reason, userId });
      if (result.cashWarning) warnings.push(result.cashWarning);
    }
    return { ...sale, cashWarning: warnings[0] ?? null };
  });
}
