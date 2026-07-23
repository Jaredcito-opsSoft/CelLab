import { and, eq, gte, isNull, lte, ne, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import {
  businessSettings,
  cashSessions,
  layaways,
  products,
  repairItems,
  repairs,
  saleItems,
  salePayments,
  saleReturnItems,
  saleReturnPayments,
  saleReturns,
  sales,
} from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requireModule } from '../../middlewares/modules.js';
import { localDateRange, rangeBounds } from '../cash/cash.service.js';

export const managerialReportQuery = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).superRefine((value, context) => {
  if ((value.from && !value.to) || (!value.from && value.to)) {
    context.addIssue({ code: 'custom', message: 'Envía las fechas from y to juntas.' });
    return;
  }
  if (!value.from || !value.to) return;
  const from = new Date(`${value.from}T00:00:00Z`);
  const to = new Date(`${value.to}T00:00:00Z`);
  if (from > to) context.addIssue({ code: 'custom', message: 'La fecha inicial no puede ser posterior a la final.' });
  const inclusiveDays = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (inclusiveDays > 366) context.addIssue({ code: 'custom', message: 'El rango máximo es de 366 días.' });
});

type ReportBounds = { from: Date; to: Date; fromDate: string; toDate: string };
type ScalarRow = Record<string, number | string | null>;

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function businessAndBounds(rawQuery: unknown) {
  const query = managerialReportQuery.parse(rawQuery);
  const [business] = await db.select({
    id: businessSettings.id,
    timezone: businessSettings.timezone,
    currency: businessSettings.currency,
    businessName: businessSettings.businessName,
  }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'Configura el negocio antes de consultar reportes.');

  let bounds: ReportBounds;
  if (query.from && query.to) {
    const dates = localDateRange(query.from, query.to, business.timezone);
    bounds = { ...dates, fromDate: query.from, toDate: query.to };
  } else {
    const dates = rangeBounds('today', business.timezone);
    const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: business.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    bounds = { ...dates, fromDate: localDay, toDate: localDay };
  }
  return { business, bounds };
}

async function loadManagerialReport(rawQuery: unknown) {
  const { business, bounds } = await businessAndBounds(rawQuery);
  // Raw SQL fragments do not carry Drizzle column metadata, so bind ISO text
  // explicitly and cast it in PostgreSQL instead of passing Date as an unknown type.
  const fromIso = bounds.from.toISOString();
  const toIso = bounds.to.toISOString();
  const activeSales = and(
    eq(sales.businessId, business.id),
    isNull(sales.deletedAt),
    ne(sales.status, 'cancelled'),
    gte(sales.createdAt, bounds.from),
    lte(sales.createdAt, bounds.to),
  );
  const completedReturns = and(
    eq(saleReturns.businessId, business.id),
    eq(saleReturns.status, 'completed'),
    gte(saleReturns.createdAt, bounds.from),
    lte(saleReturns.createdAt, bounds.to),
  );

  const [
    salesSummaryRows,
    returnSummaryRows,
    salesCostRows,
    returnCostRows,
    paymentRows,
    refundRows,
    topProductRows,
    inventoryRows,
    slowProductRows,
    repairRows,
    layawayRows,
    cashRows,
    cancellationRows,
  ] = await Promise.all([
    db.select({
      count: sql<number>`count(*)::int`,
      subtotalCents: sql<number>`coalesce(sum(${sales.subtotalCents}), 0)::bigint`,
      discountCents: sql<number>`coalesce(sum(${sales.discountCents}), 0)::bigint`,
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::bigint`,
    }).from(sales).where(activeSales),
    db.select({ count: sql<number>`count(*)::int`, totalCents: sql<number>`coalesce(sum(${saleReturns.totalCents}), 0)::bigint` }).from(saleReturns).where(completedReturns),
    db.select({ totalCents: sql<number>`coalesce(sum(${saleItems.costCentsSnapshot} * ${saleItems.quantity}), 0)::bigint` })
      .from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(activeSales),
    db.select({ totalCents: sql<number>`coalesce(sum(${saleReturnItems.costCentsSnapshot} * ${saleReturnItems.quantity}), 0)::bigint` })
      .from(saleReturnItems).innerJoin(saleReturns, eq(saleReturnItems.saleReturnId, saleReturns.id)).where(completedReturns),
    db.select({ method: salePayments.method, totalCents: sql<number>`coalesce(sum(${salePayments.amountCents}), 0)::bigint` })
      .from(salePayments).innerJoin(sales, eq(salePayments.saleId, sales.id)).where(and(activeSales, isNull(salePayments.voidedAt))).groupBy(salePayments.method),
    db.select({ method: saleReturnPayments.method, totalCents: sql<number>`coalesce(sum(${saleReturnPayments.amountCents}), 0)::bigint` })
      .from(saleReturnPayments).innerJoin(saleReturns, eq(saleReturnPayments.saleReturnId, saleReturns.id)).where(and(completedReturns, isNull(saleReturnPayments.voidedAt))).groupBy(saleReturnPayments.method),
    db.execute(sql<ScalarRow>`
      select si.product_id as "productId", max(si.product_name_snapshot) as name,
        sum(si.quantity)::int as "grossQuantity",
        coalesce(sum(ri.quantity), 0)::int as "returnedQuantity",
        (sum(si.quantity) - coalesce(sum(ri.quantity), 0))::int as "netQuantity",
        sum(si.subtotal_cents)::bigint - coalesce(sum(ri.total_cents), 0)::bigint as "netRevenueCents"
      from sale_items si
      join sales s on s.id = si.sale_id
      left join (
        select sri.sale_item_id, sum(sri.quantity) quantity, sum(sri.total_cents) total_cents
        from sale_return_items sri join sale_returns sr on sr.id = sri.sale_return_id
        where sr.business_id = ${business.id} and sr.status = 'completed'
          and sr.created_at between ${fromIso}::timestamptz and ${toIso}::timestamptz
        group by sri.sale_item_id
      ) ri on ri.sale_item_id = si.id
      where s.business_id = ${business.id} and s.deleted_at is null and s.status <> 'cancelled'
        and s.created_at between ${fromIso}::timestamptz and ${toIso}::timestamptz
      group by si.product_id order by "netRevenueCents" desc limit 10
    `),
    db.select({
      productsCount: sql<number>`count(*)::int`,
      lowStockCount: sql<number>`count(*) filter (where ${products.stock} <= ${products.minimumStock})::int`,
      unitsOnHand: sql<number>`coalesce(sum(${products.stock}), 0)::bigint`,
      costValueCents: sql<number>`coalesce(sum(${products.stock} * ${products.costCents}), 0)::bigint`,
      retailValueCents: sql<number>`coalesce(sum(${products.stock} * ${products.priceCents}), 0)::bigint`,
    }).from(products).where(and(isNull(products.deletedAt), eq(products.active, true))),
    db.execute(sql<ScalarRow>`
      select p.id, p.sku, p.name, p.stock, p.minimum_stock as "minimumStock", p.cost_cents as "costCents"
      from products p
      where p.deleted_at is null and p.active = true
        and not exists (
          select 1 from sale_items si join sales s on s.id = si.sale_id
          where si.product_id = p.id and s.business_id = ${business.id} and s.deleted_at is null
            and s.status <> 'cancelled' and s.created_at between ${fromIso}::timestamptz and ${toIso}::timestamptz
        )
      order by (p.stock * p.cost_cents) desc, p.name asc limit 20
    `),
    db.execute(sql<ScalarRow>`
      select
        count(*) filter (where r.status = 'delivered')::int as "deliveredCount",
        count(*) filter (where r.status not in ('delivered','cancelled'))::int as "openCount",
        coalesce(sum(coalesce(r.final_cents, r.estimated_cents, 0)) filter (where r.status = 'delivered'), 0)::bigint as "billedCents",
        coalesce(sum(items.cost_cents) filter (where r.status = 'delivered'), 0)::bigint as "costCents"
      from repairs r
      left join (
        select repair_id, sum(cost_total_cents) cost_cents from repair_items
        where business_id = ${business.id} and voided_at is null group by repair_id
      ) items on items.repair_id = r.id
      where r.deleted_at is null and (
        (r.status = 'delivered' and r.delivered_at between ${fromIso}::timestamptz and ${toIso}::timestamptz)
        or r.status not in ('delivered','cancelled')
      )
    `),
    db.select({
      activeCount: sql<number>`count(*) filter (where ${layaways.status} in ('open','paid'))::int`,
      overdueCount: sql<number>`count(*) filter (where ${layaways.status} in ('open','paid') and ${layaways.dueAt} < now())::int`,
      activeBalanceCents: sql<number>`coalesce(sum(${layaways.balanceCents}) filter (where ${layaways.status} in ('open','paid')), 0)::bigint`,
    }).from(layaways).where(eq(layaways.businessId, business.id)),
    db.select({
      closedCount: sql<number>`count(*)::int`,
      differenceCents: sql<number>`coalesce(sum(${cashSessions.differenceCents}), 0)::bigint`,
      absoluteDifferenceCents: sql<number>`coalesce(sum(abs(${cashSessions.differenceCents})), 0)::bigint`,
    }).from(cashSessions).where(and(eq(cashSessions.businessId, business.id), eq(cashSessions.status, 'closed'), gte(cashSessions.closedAt, bounds.from), lte(cashSessions.closedAt, bounds.to))),
    db.select({ count: sql<number>`count(*)::int`, totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::bigint` })
      .from(sales).where(and(eq(sales.businessId, business.id), isNull(sales.deletedAt), eq(sales.status, 'cancelled'), gte(sales.updatedAt, bounds.from), lte(sales.updatedAt, bounds.to))),
  ]);

  const salesSummary = salesSummaryRows[0] ?? { count: 0, subtotalCents: 0, discountCents: 0, totalCents: 0 };
  const returnSummary = returnSummaryRows[0] ?? { count: 0, totalCents: 0 };
  const grossCostCents = numberValue(salesCostRows[0]?.totalCents);
  const returnedCostCents = numberValue(returnCostRows[0]?.totalCents);
  const grossSalesCents = numberValue(salesSummary.totalCents);
  const returnedSalesCents = numberValue(returnSummary.totalCents);
  const netSalesCents = grossSalesCents - returnedSalesCents;
  const netCostCents = grossCostCents - returnedCostCents;
  const grossProfitCents = netSalesCents - netCostCents;
  const repair = repairRows[0] ?? { deliveredCount: 0, openCount: 0, billedCents: 0, costCents: 0 };
  const repairBilledCents = numberValue(repair.billedCents);
  const repairCostCents = numberValue(repair.costCents);
  const paymentMap = new Map(paymentRows.map((row) => [row.method, numberValue(row.totalCents)]));
  const refundMap = new Map(refundRows.map((row) => [row.method, numberValue(row.totalCents)]));
  const paymentMethods = ['cash', 'transfer', 'card'] as const;

  return {
    range: { from: bounds.fromDate, to: bounds.toDate, timezone: business.timezone },
    business: { id: business.id, name: business.businessName, currency: business.currency },
    sales: {
      completedCount: numberValue(salesSummary.count),
      grossSubtotalCents: numberValue(salesSummary.subtotalCents),
      discountsCents: numberValue(salesSummary.discountCents),
      grossSalesCents,
      returnsCount: numberValue(returnSummary.count),
      returnedSalesCents,
      netSalesCents,
      grossCostCents,
      returnedCostCents,
      netCostCents,
      grossProfitCents,
      grossMarginBps: netSalesCents > 0 ? Math.round((grossProfitCents * 10_000) / netSalesCents) : 0,
      cancellationsCount: numberValue(cancellationRows[0]?.count),
      cancellationsCents: numberValue(cancellationRows[0]?.totalCents),
    },
    payments: paymentMethods.map((method) => ({ method, collectedCents: paymentMap.get(method) ?? 0, refundedCents: refundMap.get(method) ?? 0, netCents: (paymentMap.get(method) ?? 0) - (refundMap.get(method) ?? 0) })),
    topProducts: [...topProductRows].map((row) => ({ ...row, grossQuantity: numberValue(row.grossQuantity), returnedQuantity: numberValue(row.returnedQuantity), netQuantity: numberValue(row.netQuantity), netRevenueCents: numberValue(row.netRevenueCents) })),
    inventory: {
      productsCount: numberValue(inventoryRows[0]?.productsCount),
      lowStockCount: numberValue(inventoryRows[0]?.lowStockCount),
      unitsOnHand: numberValue(inventoryRows[0]?.unitsOnHand),
      costValueCents: numberValue(inventoryRows[0]?.costValueCents),
      retailValueCents: numberValue(inventoryRows[0]?.retailValueCents),
      productsWithoutSales: [...slowProductRows].map((row) => ({ ...row, stock: numberValue(row.stock), minimumStock: numberValue(row.minimumStock), costCents: numberValue(row.costCents) })),
    },
    repairs: {
      deliveredCount: numberValue(repair.deliveredCount),
      openCount: numberValue(repair.openCount),
      billedCents: repairBilledCents,
      costCents: repairCostCents,
      grossProfitCents: repairBilledCents - repairCostCents,
      grossMarginBps: repairBilledCents > 0 ? Math.round(((repairBilledCents - repairCostCents) * 10_000) / repairBilledCents) : 0,
    },
    layaways: {
      activeCount: numberValue(layawayRows[0]?.activeCount),
      overdueCount: numberValue(layawayRows[0]?.overdueCount),
      activeBalanceCents: numberValue(layawayRows[0]?.activeBalanceCents),
    },
    cash: {
      closedSessionsCount: numberValue(cashRows[0]?.closedCount),
      differenceCents: numberValue(cashRows[0]?.differenceCents),
      absoluteDifferenceCents: numberValue(cashRows[0]?.absoluteDifferenceCents),
    },
  };
}

export const reportsRouter = Router();
const managerialAccess = [requireAuth, requireRole(...roleGroups.managers), requireModule('advanced_reports')] as const;

reportsRouter.get('/managerial', ...managerialAccess, asyncHandler(async (request, response) => {
  response.json(await loadManagerialReport(request.query));
}));

reportsRouter.get('/managerial.csv', ...managerialAccess, asyncHandler(async (request, response) => {
  const report = await loadManagerialReport(request.query);
  const rows: Array<[string, string, number]> = [
    ['Ventas', 'Ventas netas', report.sales.netSalesCents],
    ['Ventas', 'Costo vendido neto', report.sales.netCostCents],
    ['Ventas', 'Utilidad bruta', report.sales.grossProfitCents],
    ['Ventas', 'Devoluciones', report.sales.returnedSalesCents],
    ['Ventas', 'Cancelaciones', report.sales.cancellationsCents],
    ['Inventario', 'Capital a costo', report.inventory.costValueCents],
    ['Inventario', 'Valor a precio de venta', report.inventory.retailValueCents],
    ['Reparaciones', 'Ingresos facturados', report.repairs.billedCents],
    ['Reparaciones', 'Utilidad bruta', report.repairs.grossProfitCents],
    ['Apartados', 'Saldo pendiente activo', report.layaways.activeBalanceCents],
    ['Caja', 'Diferencia neta', report.cash.differenceCents],
  ];
  const csv = ['seccion,metrica,valor_centavos', ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n');
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="reporte-gerencial-${report.range.from}-${report.range.to}.csv"`);
  response.send(`\uFEFF${csv}`);
}));
