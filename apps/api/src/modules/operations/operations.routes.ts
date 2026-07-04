import { and, count, desc, eq, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, clients, folioCounters, inventoryMovements, products, repairEvents, repairItems, repairPayments, repairs, sales, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { AppError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { localDateRange, rangeBounds, recordCashMovementIfOpen } from '../cash/cash.service.js';

export const operationsRouter = Router();
operationsRouter.use(requireAuth);

const id = z.string().uuid();
const states = ['received','diagnosis','awaiting_authorization','in_repair','testing','ready','delivered','cancelled'] as const;
const quoteStates = ['pending','quoted','authorized','rejected'] as const;

const query = z.object({
  search: z.string().trim().max(100).default(''),
  status: z.enum(states).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const clientInput = z.object({ name: z.string().trim().min(2).max(140), phone: z.string().trim().min(8).max(20), email: z.string().email().nullable().optional(), notes: z.string().max(2000).nullable().optional() });
const productInput = z.object({ sku: z.string().trim().min(2).max(50), name: z.string().trim().min(2).max(160), categoryId: z.string().uuid().nullable().optional(), costCents: z.number().int().min(0).default(0), priceCents: z.number().int().min(0), stock: z.number().int().min(0).default(0), minimumStock: z.number().int().min(0).default(0), active: z.boolean().default(true) });
const repairInput = z.object({
  clientId: z.string().uuid(), assignedToId: z.string().uuid().nullable().optional(), brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(120),
  deviceColor: z.string().trim().max(80).nullable().optional(), serialNumber: z.string().max(120).nullable().optional(), accessoriesReceived: z.string().max(2000).nullable().optional(),
  reportedIssue: z.string().trim().min(3).max(3000), physicalCondition: z.string().trim().min(3).max(3000),
  depositCents: z.number().int().min(0).default(0), estimatedCents: z.number().int().min(0).nullable().optional(), finalCents: z.number().int().min(0).nullable().optional(),
  diagnosis: z.string().max(3000).nullable().optional(), publicNotes: z.string().max(3000).nullable().optional(), internalNotes: z.string().max(3000).nullable().optional(),
  warrantyDays: z.number().int().min(0).max(365).optional(), warrantyNotes: z.string().max(2000).nullable().optional(), quoteStatus: z.enum(quoteStates).optional(), trackingEnabled: z.boolean().optional(),
});
const repairUpdateInput = repairInput.partial().extend({ status: z.enum(states).optional() });
const stateInput = z.object({ status: z.enum(states), note: z.string().max(1000).nullable().optional(), diagnosis: z.string().max(3000).nullable().optional(), finalCents: z.number().int().min(0).nullable().optional(), warrantyDays: z.number().int().min(0).max(365).optional() });
const eventInput = z.object({ status: z.enum(states).optional(), note: z.string().trim().min(1).max(1000) });
const paymentInput = z.object({ amountCents: z.number().int().min(1), method: z.enum(['cash','transfer','card']), note: z.string().trim().max(1000).nullable().optional() });
const itemInput = z.object({ productId: z.string().uuid().nullable().optional(), name: z.string().trim().min(2).max(255).optional(), quantity: z.number().int().min(1).max(999), unitPriceCents: z.number().int().min(0).default(0), costCents: z.number().int().min(0).default(0), affectsInventory: z.boolean().default(false) });
const voidInput = z.object({ reason: z.string().trim().min(3).max(1000).default('Anulaci贸n operativa') });

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const quoteTotal = (repair: typeof repairs.$inferSelect) => repair.finalCents ?? repair.estimatedCents ?? 0;
async function getBusiness(tx: typeof db | any = db) {
  const [business] = await tx.select().from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'Configura el negocio antes de continuar.');
  return business;
}

operationsRouter.get('/dashboard/summary', asyncHandler(async (_req, res) => {
  const business = await getBusiness();
  const { from: startOfToday, to: endOfToday } = rangeBounds('today', business.timezone);

  const [
    [customers],
    [productTotal],
    [openRepairs],
    [readyRepairs],
    [lowStock],
    [todaySales],
    recentSalesRows,
    recentRepairsRows,
    recentInventoryRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(clients).where(isNull(clients.deletedAt)),
    db.select({ value: count() }).from(products).where(isNull(products.deletedAt)),
    db.select({ value: count() }).from(repairs).where(and(isNull(repairs.deletedAt), sql`${repairs.status} not in ('delivered','cancelled')`)),
    db.select({ value: count() }).from(repairs).where(and(isNull(repairs.deletedAt), eq(repairs.status, 'ready'))),
    db.select({ value: count() }).from(products).where(and(isNull(products.deletedAt), sql`${products.stock} <= ${products.minimumStock}`)),
    db.select({
      count: count(),
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
    }).from(sales).where(and(
      isNull(sales.deletedAt),
      eq(sales.status, 'completed'),
      gte(sales.createdAt, startOfToday),
      lte(sales.createdAt, endOfToday),
    )),
    db.select({
      id: sales.id,
      folio: sales.folio,
      totalCents: sales.totalCents,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      createdAt: sales.createdAt,
      customerName: clients.name,
    }).from(sales).leftJoin(clients, eq(sales.customerId, clients.id)).where(isNull(sales.deletedAt)).orderBy(desc(sales.createdAt)).limit(5),
    db.select({
      id: repairs.id,
      folio: repairs.folio,
      brand: repairs.brand,
      model: repairs.model,
      status: repairs.status,
      createdAt: repairs.createdAt,
      clientName: clients.name,
    }).from(repairs).innerJoin(clients, eq(repairs.clientId, clients.id)).where(isNull(repairs.deletedAt)).orderBy(desc(repairs.createdAt)).limit(5),
    db.select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      quantity: inventoryMovements.quantity,
      previousStock: inventoryMovements.previousStock,
      newStock: inventoryMovements.newStock,
      createdAt: inventoryMovements.createdAt,
      productName: products.name,
    }).from(inventoryMovements).innerJoin(products, eq(inventoryMovements.productId, products.id)).orderBy(desc(inventoryMovements.createdAt)).limit(6),
  ]);

  res.json({
    todaySalesCount: todaySales?.count ?? 0,
    todaySalesTotalCents: todaySales?.totalCents ?? 0,
    openRepairsCount: openRepairs?.value ?? 0,
    readyRepairsCount: readyRepairs?.value ?? 0,
    lowStockCount: lowStock?.value ?? 0,
    productsCount: productTotal?.value ?? 0,
    customersCount: customers?.value ?? 0,
    recentSales: recentSalesRows,
    recentRepairs: recentRepairsRows,
    recentInventoryMovements: recentInventoryRows,
  });
}));
operationsRouter.get('/reports/basic', asyncHandler(async (req, res) => {
  const business = await getBusiness();
  const todayBounds = rangeBounds('today', business.timezone);
  const fromDate = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
  const toDate = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;
  const { from, to } = fromDate || toDate
    ? localDateRange(fromDate ?? toDate!, toDate ?? fromDate!, business.timezone)
    : todayBounds;

  const [
    [salesRange],
    [deliveredRepairs],
    [pendingRepairs],
    [lowStock],
    movementRows,
  ] = await Promise.all([
    db.select({ count: count(), totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int` }).from(sales).where(and(isNull(sales.deletedAt), eq(sales.status, 'completed'), gte(sales.createdAt, from), lte(sales.createdAt, to))),
    db.select({ value: count() }).from(repairs).where(and(isNull(repairs.deletedAt), eq(repairs.status, 'delivered'), gte(repairs.deliveredAt, from), lte(repairs.deliveredAt, to))),
    db.select({ value: count() }).from(repairs).where(and(isNull(repairs.deletedAt), sql`${repairs.status} not in ('delivered','cancelled')`)),
    db.select({ value: count() }).from(products).where(and(isNull(products.deletedAt), eq(products.active, true), sql`${products.stock} <= ${products.minimumStock}`)),
    db.select({ id: inventoryMovements.id, type: inventoryMovements.type, quantity: inventoryMovements.quantity, previousStock: inventoryMovements.previousStock, newStock: inventoryMovements.newStock, notes: inventoryMovements.notes, createdAt: inventoryMovements.createdAt, productName: products.name, userName: users.name }).from(inventoryMovements).innerJoin(products, eq(inventoryMovements.productId, products.id)).innerJoin(users, eq(inventoryMovements.userId, users.id)).orderBy(desc(inventoryMovements.createdAt)).limit(10),
  ]);

  res.json({
    from: from.toISOString(),
    to: to.toISOString(),
    salesCount: salesRange?.count ?? 0,
    incomeCents: salesRange?.totalCents ?? 0,
    pendingRepairs: pendingRepairs?.value ?? 0,
    deliveredRepairs: deliveredRepairs?.value ?? 0,
    lowStockProducts: lowStock?.value ?? 0,
    recentMovements: movementRows,
  });
}));
operationsRouter.get('/dashboard', asyncHandler(async (_req, res) => {
  const [[a],[b],[c],[d],[e]] = await Promise.all([
    db.select({ value: count() }).from(clients).where(isNull(clients.deletedAt)),
    db.select({ value: count() }).from(products).where(isNull(products.deletedAt)),
    db.select({ value: count() }).from(repairs).where(and(isNull(repairs.deletedAt), sql`${repairs.status} not in ('delivered','cancelled')`)),
    db.select({ value: count() }).from(repairs).where(and(isNull(repairs.deletedAt), eq(repairs.status, 'ready'))),
    db.select({ value: count() }).from(products).where(and(isNull(products.deletedAt), sql`${products.stock} <= ${products.minimumStock}`)),
  ]);
  res.json({ clients: a?.value ?? 0, products: b?.value ?? 0, openRepairs: c?.value ?? 0, readyRepairs: d?.value ?? 0, lowStock: e?.value ?? 0 });
}));

operationsRouter.get('/clients', asyncHandler(async (req,res) => {
  const {search,limit}=query.parse(req.query);
  res.json({items:await db.select().from(clients).where(and(isNull(clients.deletedAt),search?or(ilike(clients.name,`%${search}%`),ilike(clients.phone,`%${search}%`)):undefined)).orderBy(desc(clients.createdAt)).limit(limit)});
}));
operationsRouter.post('/clients', asyncHandler(async (req,res) => { const [item]=await db.insert(clients).values(clientInput.parse(req.body)).returning(); res.status(201).json({item}); }));
operationsRouter.patch('/clients/:id', asyncHandler(async (req,res) => {
  const [item]=await db.update(clients).set({...clientInput.partial().parse(req.body),updatedAt:new Date()}).where(and(eq(clients.id,id.parse(req.params.id)),isNull(clients.deletedAt))).returning();
  if(!item)throw new AppError(404,'Cliente no encontrado.'); res.json({item});
}));
operationsRouter.delete('/clients/:id', asyncHandler(async (req,res) => {
  const [item]=await db.update(clients).set({deletedAt:new Date(),updatedAt:new Date()}).where(and(eq(clients.id,id.parse(req.params.id)),isNull(clients.deletedAt))).returning({id:clients.id});
  if(!item)throw new AppError(404,'Cliente no encontrado.'); res.status(204).send();
}));

operationsRouter.get('/products', asyncHandler(async (req,res) => {
  const {search,limit}=query.parse(req.query);
  res.json({items:await db.select().from(products).where(and(isNull(products.deletedAt),search?or(ilike(products.name,`%${search}%`),ilike(products.sku,`%${search}%`)):undefined)).orderBy(desc(products.createdAt)).limit(limit)});
}));
operationsRouter.post('/products', asyncHandler(async (req,res) => {
  const input=productInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [created]=await tx.insert(products).values(input).returning();
    if(!created)throw new AppError(500,'No fue posible registrar el producto.');
    if(created.stock>0)await tx.insert(inventoryMovements).values({businessId:business.id,productId:created.id,userId:req.auth!.userId,type:'stock_entry',quantity:created.stock,previousStock:0,newStock:created.stock,referenceType:'product',referenceId:created.id,notes:'Existencia inicial'});
    return created;
  });
  res.status(201).json({item});
}));
operationsRouter.patch('/products/:id', asyncHandler(async (req,res) => {
  const productId=id.parse(req.params.id),input=productInput.partial().parse(req.body);
  const sensitiveFields = ['costCents','priceCents','stock','minimumStock','active'] as const;
  if (req.auth?.role !== 'admin' && sensitiveFields.some((field) => Object.prototype.hasOwnProperty.call(input, field))) {
    throw new AppError(403, 'Tu rol no permite modificar precio, costo, stock m韓imo o estado del producto.');
  }
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [current]=await tx.select().from(products).where(and(eq(products.id,productId),isNull(products.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Producto no encontrado.');
    const [updated]=await tx.update(products).set({...input,updatedAt:new Date()}).where(eq(products.id,productId)).returning();
    if(input.stock!==undefined&&input.stock!==current.stock)await tx.insert(inventoryMovements).values({businessId:business.id,productId,userId:req.auth!.userId,type:'manual_adjustment',quantity:Math.abs(input.stock-current.stock),previousStock:current.stock,newStock:input.stock,referenceType:'manual',referenceId:productId,notes:'Ajuste desde inventario'});
    return updated;
  });
  res.json({item});
}));
operationsRouter.delete('/products/:id', requireRole('admin'), asyncHandler(async (req,res) => {
  const [item]=await db.update(products).set({deletedAt:new Date(),active:false,updatedAt:new Date()}).where(and(eq(products.id,id.parse(req.params.id)),isNull(products.deletedAt))).returning({id:products.id});
  if(!item)throw new AppError(404,'Producto no encontrado.'); res.status(204).send();
}));

operationsRouter.get('/repairs', asyncHandler(async (req,res) => {
  const {search,status,limit}=query.parse(req.query);
  const rows=await db.select({repair:repairs,clientName:clients.name,clientPhone:clients.phone}).from(repairs).innerJoin(clients,eq(repairs.clientId,clients.id)).where(and(
    isNull(repairs.deletedAt),
    status?eq(repairs.status,status):undefined,
    search?or(ilike(repairs.folio,`%${search}%`),ilike(repairs.brand,`%${search}%`),ilike(repairs.model,`%${search}%`),ilike(clients.name,`%${search}%`),ilike(clients.phone,`%${search}%`)):undefined
  )).orderBy(desc(repairs.createdAt)).limit(limit);
  res.json({items:rows.map(({repair,...client})=>({...repair,...client}))});
}));

operationsRouter.post('/repairs', asyncHandler(async (req,res) => {
  const input=repairInput.parse(req.body);
  const initialTotalCents = input.finalCents ?? input.estimatedCents ?? 0;
  if (initialTotalCents > 0 && input.depositCents > initialTotalCents) throw new AppError(400, 'El anticipo no puede superar el total definido de la reparaci髇.');
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [counter]=await tx.insert(folioCounters).values({scope:'repair',value:1}).onConflictDoUpdate({target:folioCounters.scope,set:{value:sql`${folioCounters.value}+1`,updatedAt:new Date()}}).returning({value:folioCounters.value});
    if(!counter)throw new AppError(500,'No fue posible generar el folio.');
    const [created]=await tx.insert(repairs).values({...input,folio:`REP-${String(counter.value).padStart(5,'0')}`}).returning();
    if(!created)throw new AppError(500,'No fue posible crear la reparaci髇.');
    await tx.insert(repairEvents).values({repairId:created.id,toStatus:'received',note:'Equipo recibido en taller.',createdById:req.auth!.userId});
    let cashWarning: string | null = null;
    if(created.depositCents>0){
      const [depositPayment]=await tx.insert(repairPayments).values({businessId:business.id,repairId:created.id,amountCents:created.depositCents,method:'cash',note:'Anticipo inicial',receivedByUserId:req.auth!.userId}).returning();
      if(depositPayment){
        const cashResult=await recordCashMovementIfOpen(tx,{businessId:business.id,type:'repair_payment',method:'cash',amountCents:depositPayment.amountCents,direction:'in',referenceType:'repair',referenceId:created.id,referenceFolio:created.folio,reason:'Anticipo de reparaci髇',note:depositPayment.note,userId:req.auth!.userId});
        cashWarning=cashResult.cashWarning;
      }
    }
    return {...created,cashWarning};
  });
  res.status(201).json({item});
}));

operationsRouter.get('/repairs/:id', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id);
  const business=await getBusiness();
  const [row]=await db.select({repair:repairs,client:clients,assignedToName:users.name}).from(repairs).innerJoin(clients,eq(repairs.clientId,clients.id)).leftJoin(users,eq(repairs.assignedToId,users.id)).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
  if(!row)throw new AppError(404,'Reparaci贸n no encontrada.');
  const [events,payments,items]=await Promise.all([
    db.select({id:repairEvents.id,fromStatus:repairEvents.fromStatus,toStatus:repairEvents.toStatus,note:repairEvents.note,createdAt:repairEvents.createdAt,userName:users.name}).from(repairEvents).innerJoin(users,eq(repairEvents.createdById,users.id)).where(eq(repairEvents.repairId,repairId)).orderBy(desc(repairEvents.createdAt)),
    db.select({id:repairPayments.id,amountCents:repairPayments.amountCents,method:repairPayments.method,note:repairPayments.note,status:repairPayments.status,createdAt:repairPayments.createdAt,voidedAt:repairPayments.voidedAt,userName:users.name}).from(repairPayments).innerJoin(users,eq(repairPayments.receivedByUserId,users.id)).where(eq(repairPayments.repairId,repairId)).orderBy(desc(repairPayments.createdAt)),
    db.select().from(repairItems).where(eq(repairItems.repairId,repairId)).orderBy(desc(repairItems.createdAt)),
  ]);
  const activePaid=payments.filter(p=>p.status==='active').reduce((sum,p)=>sum+p.amountCents,0);
  const paidCents=payments.length>0?activePaid:row.repair.depositCents;
  const activeItems=items.filter(item=>!item.voidedAt);
  const itemsRevenueCents=activeItems.reduce((sum,item)=>sum+item.totalCents,0);
  const itemsCostCents=activeItems.reduce((sum,item)=>sum+item.costTotalCents,0);
  const itemsGrossProfitCents=activeItems.reduce((sum,item)=>sum+item.grossProfitCents,0);
  const itemsGrossMarginBps=itemsRevenueCents>0?Math.round((itemsGrossProfitCents/itemsRevenueCents)*10000):0;
  const totalCents=quoteTotal(row.repair);
  const balanceCents=Math.max(0,totalCents-paidCents);
  const paymentStatus=totalCents>0&&balanceCents===0?'paid':paidCents>0?'partial':'pending';
  res.json({item:{...row.repair,client:row.client,assignedToName:row.assignedToName,events,payments,items,business,totalCents,paidCents,balanceCents,paymentStatus,itemsRevenueCents,itemsCostCents,itemsGrossProfitCents,itemsGrossMarginBps}});
}));

operationsRouter.patch('/repairs/:id', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=repairUpdateInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const [current]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Reparaci贸n no encontrada.');
    const now=new Date();
    const nextWarrantyDays=input.warrantyDays??current.warrantyDays;
    const nextStatus=input.status??current.status;
    const set={...input,authorizedAt:input.quoteStatus==='authorized'&&!current.authorizedAt?now:current.authorizedAt,deliveredAt:nextStatus==='delivered'&&!current.deliveredAt?now:current.deliveredAt,warrantyUntil:nextStatus==='delivered'&&nextWarrantyDays>0?addDays(now,nextWarrantyDays):current.warrantyUntil,updatedAt:now};
    const [updated]=await tx.update(repairs).set(set).where(eq(repairs.id,repairId)).returning();
    if(input.status&&input.status!==current.status)await tx.insert(repairEvents).values({repairId,fromStatus:current.status,toStatus:input.status,note:'Cambio de estado desde detalle.',createdById:req.auth!.userId});
    return updated;
  });
  res.json({item});
}));

operationsRouter.delete('/repairs/:id', requireRole('admin'), asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id);
  const [item]=await db.update(repairs).set({deletedAt:new Date(),updatedAt:new Date()}).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).returning({id:repairs.id});
  if(!item)throw new AppError(404,'Reparaci贸n no encontrada.'); res.status(204).send();
}));

operationsRouter.patch('/repairs/:id/status', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id),input=stateInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const [current]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Reparaci贸n no encontrada.');
    const now=new Date();
    const warrantyDays=input.warrantyDays??current.warrantyDays;
    const [updated]=await tx.update(repairs).set({status:input.status,diagnosis:input.diagnosis??current.diagnosis,finalCents:input.finalCents??current.finalCents,warrantyDays,deliveredAt:input.status==='delivered'?now:current.deliveredAt,warrantyUntil:input.status==='delivered'&&warrantyDays>0?addDays(now,warrantyDays):current.warrantyUntil,updatedAt:now}).where(eq(repairs.id,repairId)).returning();
    await tx.insert(repairEvents).values({repairId,fromStatus:current.status,toStatus:input.status,note:input.note,createdById:req.auth!.userId});
    return updated;
  });
  res.json({item});
}));

operationsRouter.post('/repairs/:id/events', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=eventInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const [current]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Reparaci贸n no encontrada.');
    if(input.status&&input.status!==current.status)await tx.update(repairs).set({status:input.status,updatedAt:new Date()}).where(eq(repairs.id,repairId));
    const [event]=await tx.insert(repairEvents).values({repairId,fromStatus:input.status&&input.status!==current.status?current.status:null,toStatus:input.status??current.status,note:input.note,createdById:req.auth!.userId}).returning();
    return event;
  });
  res.status(201).json({item});
}));

operationsRouter.post('/repairs/:id/payments', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=paymentInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [repair]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!repair)throw new AppError(404,'Reparaci髇 no encontrada.');
    if(repair.status==='cancelled')throw new AppError(409,'No se pueden registrar pagos en una reparaci髇 cancelada.');
    const totalCents=quoteTotal(repair);
    const [paid]=await tx.select({value:sql<number>`coalesce(sum(${repairPayments.amountCents}),0)::int`}).from(repairPayments).where(and(eq(repairPayments.repairId,repairId),eq(repairPayments.status,'active')));
    const alreadyPaidCents=paid?.value ?? 0;
    if(totalCents>0 && alreadyPaidCents + input.amountCents > totalCents) throw new AppError(400,'El pago excede el saldo pendiente de la reparaci髇.');
    const [payment]=await tx.insert(repairPayments).values({businessId:business.id,repairId,amountCents:input.amountCents,method:input.method,note:input.note??null,receivedByUserId:req.auth!.userId}).returning();
    const cashResult=await recordCashMovementIfOpen(tx,{businessId:business.id,type:'repair_payment',method:input.method,amountCents:input.amountCents,direction:'in',referenceType:'repair',referenceId:repairId,referenceFolio:repair.folio,reason:'Pago de reparaci髇',note:input.note??null,userId:req.auth!.userId});
    await tx.insert(repairEvents).values({repairId,fromStatus:repair.status,toStatus:repair.status,note:`Pago registrado por ${input.amountCents} centavos.`,createdById:req.auth!.userId});
    return {...payment,cashWarning:cashResult.cashWarning};
  });
  res.status(201).json({item});
}));

operationsRouter.post('/repairs/:id/items', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=itemInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [repair]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!repair)throw new AppError(404,'Reparaci贸n no encontrada.');
    if(repair.status==='cancelled')throw new AppError(409,'No se pueden agregar conceptos a una reparaci贸n cancelada.');
    let name=input.name; let unitPriceCents=input.unitPriceCents; let costCentsSnapshot=input.costCents; let productId=input.productId??null;
    if(productId){
      const [product]=await tx.select().from(products).where(and(eq(products.id,productId),isNull(products.deletedAt),eq(products.active,true))).limit(1);
      if(!product)throw new AppError(404,'Producto no encontrado.');
      name=product.name; costCentsSnapshot=product.costCents; if(unitPriceCents===0)unitPriceCents=product.priceCents;
      if(input.affectsInventory){
        const [updated]=await tx.update(products).set({stock:sql`${products.stock}-${input.quantity}`,updatedAt:new Date()}).where(and(eq(products.id,productId),gte(products.stock,input.quantity))).returning({newStock:products.stock});
        if(!updated)throw new AppError(409,`Stock insuficiente para ${product.name}.`,'INSUFFICIENT_STOCK');
        await tx.insert(inventoryMovements).values({businessId:business.id,productId,userId:req.auth!.userId,type:'service_usage',quantity:input.quantity,previousStock:updated.newStock+input.quantity,newStock:updated.newStock,referenceType:'repair',referenceId:repairId,notes:`Uso en reparaci贸n ${repair.folio}`});
      }
    }
    if(!name)throw new AppError(400,'Indica el concepto o selecciona un producto.');
    const totalCents=unitPriceCents*input.quantity;
    const costTotalCents=costCentsSnapshot*input.quantity;
    const grossProfitCents=totalCents-costTotalCents;
    const grossMarginBps=totalCents>0?Math.round((grossProfitCents/totalCents)*10000):0;
    const [created]=await tx.insert(repairItems).values({businessId:business.id,repairId,productId,nameSnapshot:name,quantity:input.quantity,unitPriceCents,totalCents,costCentsSnapshot,costTotalCents,grossProfitCents,grossMarginBps,affectsInventory:input.affectsInventory}).returning();
    await tx.insert(repairEvents).values({repairId,fromStatus:repair.status,toStatus:repair.status,note:`Concepto agregado: ${name}.`,createdById:req.auth!.userId});
    return created;
  });
  res.status(201).json({item});
}));

operationsRouter.post('/repair-items/:id/void', requireRole('admin'), asyncHandler(async (req,res) => {
  const itemId=id.parse(req.params.id), input=voidInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [row]=await tx.select({item:repairItems,repair:repairs}).from(repairItems).innerJoin(repairs,eq(repairItems.repairId,repairs.id)).where(eq(repairItems.id,itemId)).limit(1);
    if(!row)throw new AppError(404,'Concepto no encontrado.');
    if(row.item.voidedAt)throw new AppError(409,'El concepto ya fue anulado.');
    const [voided]=await tx.update(repairItems).set({voidedAt:new Date(),voidedByUserId:req.auth!.userId,voidReason:input.reason}).where(eq(repairItems.id,itemId)).returning();
    if(row.item.affectsInventory&&row.item.productId){
      const [updated]=await tx.update(products).set({stock:sql`${products.stock}+${row.item.quantity}`,updatedAt:new Date()}).where(eq(products.id,row.item.productId)).returning({newStock:products.stock});
      if(!updated)throw new AppError(404,'Producto asociado no encontrado.');
      await tx.insert(inventoryMovements).values({businessId:business.id,productId:row.item.productId,userId:req.auth!.userId,type:'service_usage_void',quantity:row.item.quantity,previousStock:updated.newStock-row.item.quantity,newStock:updated.newStock,referenceType:'repair',referenceId:row.repair.id,notes:`Anulaci贸n de uso en reparaci贸n ${row.repair.folio}: ${input.reason}`});
    }
    await tx.insert(repairEvents).values({repairId:row.repair.id,fromStatus:row.repair.status,toStatus:row.repair.status,note:`Concepto anulado: ${row.item.nameSnapshot}. ${input.reason}`,createdById:req.auth!.userId});
    return voided;
  });
  res.json({item});
}));

operationsRouter.post('/repair-payments/:id/void', requireRole('admin'), asyncHandler(async (req,res) => {
  const paymentId=id.parse(req.params.id);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [row]=await tx.select({payment:repairPayments,repair:repairs}).from(repairPayments).innerJoin(repairs,eq(repairPayments.repairId,repairs.id)).where(and(eq(repairPayments.id,paymentId),eq(repairPayments.status,'active'))).limit(1);
    if(!row)throw new AppError(404,'Pago no encontrado o ya anulado.');
    const [voided]=await tx.update(repairPayments).set({status:'voided',voidedAt:new Date(),voidedByUserId:req.auth!.userId}).where(eq(repairPayments.id,paymentId)).returning();
    let cashWarning: string | null = null;
    if(voided){
      const cashResult=await recordCashMovementIfOpen(tx,{businessId:business.id,type:'repair_payment_void',method:row.payment.method,amountCents:row.payment.amountCents,direction:'out',referenceType:'repair',referenceId:row.repair.id,referenceFolio:row.repair.folio,reason:'Anulaci髇 de pago de reparaci髇',note:row.payment.note,userId:req.auth!.userId});
      cashWarning=cashResult.cashWarning;
    }
    await tx.insert(repairEvents).values({repairId:row.repair.id,fromStatus:row.repair.status,toStatus:row.repair.status,note:`Pago anulado por ${row.payment.amountCents} centavos.`,createdById:req.auth!.userId});
    return voided ? {...voided,cashWarning} : voided;
  });
  res.json({item});
}));









