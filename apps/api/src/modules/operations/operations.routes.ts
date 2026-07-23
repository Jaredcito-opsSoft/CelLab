import { and, count, desc, eq, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, categories, clients, folioCounters, inventoryMovements, productCompatibilities, products, repairEvents, repairItems, repairPayments, repairs, sales, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { canAccessCosts, withoutSensitiveCosts } from '../../lib/cost-privacy.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requireModule } from '../../middlewares/modules.js';
import { localDateRange, rangeBounds, recordCashMovementIfOpen } from '../cash/cash.service.js';
import { readEnabledModules } from '../modules/modules.service.js';

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
const productQuery = z.object({
  search: z.string().trim().max(100).default(''),
  categoryId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const clientInput = z.object({ name: z.string().trim().min(2).max(140), phone: z.string().trim().min(8).max(20), email: z.string().email().nullable().optional(), notes: z.string().max(2000).nullable().optional() });
const productInput = z.object({ sku: z.string().trim().min(2).max(50), barcode: z.string().trim().min(3).max(80).nullable().optional(), name: z.string().trim().min(2).max(160), categoryId: z.string().uuid().nullable().optional(), costCents: z.number().int().min(0).default(0), priceCents: z.number().int().min(0), stock: z.number().int().min(0).default(0), minimumStock: z.number().int().min(0).default(0), active: z.boolean().default(true) });
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
const voidInput = z.object({ reason: z.string().trim().min(3).max(1000).default('Anulación operativa') });

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const quoteTotal = (repair: typeof repairs.$inferSelect) => repair.finalCents ?? repair.estimatedCents ?? 0;
type RepairStatus = typeof states[number];
const repairTransitions: Record<RepairStatus, readonly RepairStatus[]> = {
  received: ['diagnosis', 'cancelled'],
  diagnosis: ['awaiting_authorization', 'in_repair', 'cancelled'],
  awaiting_authorization: ['diagnosis', 'in_repair', 'cancelled'],
  in_repair: ['testing', 'ready', 'cancelled'],
  testing: ['in_repair', 'ready', 'cancelled'],
  ready: ['testing', 'delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

function assertRepairTransition(from: RepairStatus, to: RepairStatus, role: string) {
  if (from === to) return;
  if (to === 'cancelled' && role !== 'admin' && role !== 'manager') {
    throw new AppError(403, 'Solo administración o gerencia pueden cancelar una reparación.', 'FORBIDDEN');
  }
  if (!repairTransitions[from].includes(to)) {
    throw new AppError(409, `No se permite cambiar una reparación de ${from} a ${to}.`, 'INVALID_REPAIR_TRANSITION');
  }
}
async function getBusiness(tx: typeof db | any = db) {
  const [business] = await tx.select().from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'Configura el negocio antes de continuar.');
  return business;
}

operationsRouter.get('/dashboard/summary', asyncHandler(async (_req, res) => {
  const [business, moduleState] = await Promise.all([getBusiness(), readEnabledModules(['repairs'])]);
  const { from: startOfToday, to: endOfToday } = rangeBounds('today', business.timezone);
  const startOfTodayIso = startOfToday.toISOString();
  const endOfTodayIso = endOfToday.toISOString();
  const repairsEnabled = moduleState.get('repairs') ?? false;

  const [
    [metrics],
    recentSalesRows,
    recentRepairsRows,
    recentInventoryRows,
  ] = await Promise.all([
    db.select({
      customers: sql<number>`(select count(*)::int from ${clients} where ${clients.deletedAt} is null)`,
      products: sql<number>`(select count(*)::int from ${products} where ${products.deletedAt} is null)`,
      openRepairs: repairsEnabled ? sql<number>`(select count(*)::int from ${repairs} where ${repairs.deletedAt} is null and ${repairs.status} not in ('delivered','cancelled'))` : sql<number>`0`,
      readyRepairs: repairsEnabled ? sql<number>`(select count(*)::int from ${repairs} where ${repairs.deletedAt} is null and ${repairs.status} = 'ready')` : sql<number>`0`,
      lowStock: sql<number>`(select count(*)::int from ${products} where ${products.deletedAt} is null and ${products.stock} <= ${products.minimumStock})`,
      todaySalesCount: sql<number>`(select count(*)::int from ${sales} where ${sales.deletedAt} is null and ${sales.status} = 'completed' and ${sales.createdAt} >= ${startOfTodayIso}::timestamptz and ${sales.createdAt} <= ${endOfTodayIso}::timestamptz)`,
      todaySalesTotalCents: sql<number>`(select coalesce(sum(${sales.totalCents}), 0)::int from ${sales} where ${sales.deletedAt} is null and ${sales.status} = 'completed' and ${sales.createdAt} >= ${startOfTodayIso}::timestamptz and ${sales.createdAt} <= ${endOfTodayIso}::timestamptz)`,
    }).from(sql`(select 1) as dashboard_seed`),
    db.select({
      id: sales.id,
      folio: sales.folio,
      totalCents: sales.totalCents,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      createdAt: sales.createdAt,
      customerName: clients.name,
    }).from(sales).leftJoin(clients, eq(sales.customerId, clients.id)).where(isNull(sales.deletedAt)).orderBy(desc(sales.createdAt)).limit(5),
    repairsEnabled ? db.select({
      id: repairs.id,
      folio: repairs.folio,
      brand: repairs.brand,
      model: repairs.model,
      status: repairs.status,
      createdAt: repairs.createdAt,
      clientName: clients.name,
    }).from(repairs).innerJoin(clients, eq(repairs.clientId, clients.id)).where(isNull(repairs.deletedAt)).orderBy(desc(repairs.createdAt)).limit(5) : Promise.resolve([]),
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
    todaySalesCount: metrics?.todaySalesCount ?? 0,
    todaySalesTotalCents: metrics?.todaySalesTotalCents ?? 0,
    openRepairsCount: metrics?.openRepairs ?? 0,
    readyRepairsCount: metrics?.readyRepairs ?? 0,
    lowStockCount: metrics?.lowStock ?? 0,
    productsCount: metrics?.products ?? 0,
    customersCount: metrics?.customers ?? 0,
    recentSales: recentSalesRows,
    recentRepairs: recentRepairsRows,
    recentInventoryMovements: recentInventoryRows,
  });
}));
operationsRouter.get('/reports/basic', asyncHandler(async (req, res) => {
  const business = await getBusiness();
  const moduleState = await readEnabledModules(['repairs']);
  const repairsEnabled = moduleState.get('repairs') ?? false;
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
    repairsEnabled ? db.select({ value: count() }).from(repairs).where(and(isNull(repairs.deletedAt), eq(repairs.status, 'delivered'), gte(repairs.deliveredAt, from), lte(repairs.deliveredAt, to))) : Promise.resolve([{ value: 0 }]),
    repairsEnabled ? db.select({ value: count() }).from(repairs).where(and(isNull(repairs.deletedAt), sql`${repairs.status} not in ('delivered','cancelled')`)) : Promise.resolve([{ value: 0 }]),
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
operationsRouter.post('/clients', requireRole(...roleGroups.workshop), asyncHandler(async (req,res) => { const [item]=await db.insert(clients).values(clientInput.parse(req.body)).returning(); if(!item)throw new AppError(500,'No fue posible registrar el cliente.');
  await recordAuditLog({actor:req.auth!,action:'clients.create',entityType:'client',entityId:item.id,summary:`Cliente creado: ${item.name}`,metadata:{phone:item.phone}}); res.status(201).json({item}); }));
operationsRouter.patch('/clients/:id', requireRole(...roleGroups.workshop), asyncHandler(async (req,res) => {
  const input=clientInput.partial().parse(req.body);
  const [item]=await db.update(clients).set({...input,updatedAt:new Date()}).where(and(eq(clients.id,id.parse(req.params.id)),isNull(clients.deletedAt))).returning();
  if(item)await recordAuditLog({actor:req.auth!,action:'clients.update',entityType:'client',entityId:item.id,summary:`Cliente actualizado: ${item.name}`,metadata:input});
  if(!item)throw new AppError(404,'Cliente no encontrado.'); res.json({item});
}));
operationsRouter.delete('/clients/:id', requireRole(...roleGroups.managers), asyncHandler(async (req,res) => {
  const [item]=await db.update(clients).set({deletedAt:new Date(),updatedAt:new Date()}).where(and(eq(clients.id,id.parse(req.params.id)),isNull(clients.deletedAt))).returning({id:clients.id});
  if(item)await recordAuditLog({actor:req.auth!,action:'clients.archive',entityType:'client',entityId:item.id,summary:'Cliente archivado'});
  if(!item)throw new AppError(404,'Cliente no encontrado.'); res.status(204).send();
}));

operationsRouter.get('/products', asyncHandler(async (req,res) => {
  const {search,categoryId,limit}=productQuery.parse(req.query);
  const pattern=`%${search}%`;
  const rows=await db.select({
    id:products.id,sku:products.sku,barcode:products.barcode,name:products.name,categoryId:products.categoryId,categoryName:categories.name,
    costCents:products.costCents,priceCents:products.priceCents,stock:products.stock,minimumStock:products.minimumStock,active:products.active,
    deletedAt:products.deletedAt,createdAt:products.createdAt,updatedAt:products.updatedAt,
    compatibilities: sql<Array<{id:string;businessId:string;productId:string;brand:string;model:string;createdAt:string;updatedAt:string}>>`
      coalesce((
        select json_agg(json_build_object(
          'id', pc.id, 'businessId', pc.business_id, 'productId', pc.product_id,
          'brand', pc.brand, 'model', pc.model, 'createdAt', pc.created_at, 'updatedAt', pc.updated_at
        ) order by pc.brand, pc.model)
        from product_compatibilities pc
        where pc.product_id = ${products.id}
          and pc.business_id = (select id from business_settings limit 1)
      ), '[]'::json)`,
  }).from(products).leftJoin(categories,eq(products.categoryId,categories.id)).where(and(
    isNull(products.deletedAt),
    categoryId?eq(products.categoryId,categoryId):undefined,
    search?or(
      ilike(products.name,pattern),ilike(products.sku,pattern),ilike(products.barcode,pattern),
      sql`exists (select 1 from ${productCompatibilities} pc where pc.product_id = ${products.id} and pc.business_id = (select id from ${businessSettings} limit 1) and (pc.brand ilike ${pattern} or pc.model ilike ${pattern}))`,
    ):undefined,
  )).orderBy(desc(products.createdAt)).limit(limit);
  res.json({items:canAccessCosts(req.auth!.role)?rows:rows.map(withoutSensitiveCosts)});
}));
operationsRouter.post('/products', requireRole(...roleGroups.inventory), asyncHandler(async (req,res) => {
  const input=productInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    if(input.categoryId){const [category]=await tx.select({id:categories.id}).from(categories).where(and(eq(categories.id,input.categoryId),eq(categories.active,true))).limit(1);if(!category)throw new AppError(409,'La categoría seleccionada no está disponible.');}
    if(input.barcode){const [duplicate]=await tx.select({id:products.id}).from(products).where(and(eq(products.barcode,input.barcode),isNull(products.deletedAt))).limit(1);if(duplicate)throw new AppError(409,'Ese código de barras ya pertenece a otro producto.');}
    const [created]=await tx.insert(products).values(input).returning();
    if(!created)throw new AppError(500,'No fue posible registrar el producto.');
    if(created.stock>0)await tx.insert(inventoryMovements).values({businessId:business.id,productId:created.id,userId:req.auth!.userId,type:'stock_entry',quantity:created.stock,previousStock:0,newStock:created.stock,referenceType:'product',referenceId:created.id,notes:'Existencia inicial'});
    return created;
  });
  await recordAuditLog({actor:req.auth!,action:'products.create',entityType:'product',entityId:item.id,summary:`Producto creado: ${item.name}`,metadata:{sku:item.sku,priceCents:item.priceCents,costCents:item.costCents,stock:item.stock}});
  res.status(201).json({item});
}));
operationsRouter.patch('/products/:id', requireRole(...roleGroups.inventory), asyncHandler(async (req,res) => {
  const productId=id.parse(req.params.id),input=productInput.partial().parse(req.body);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [current]=await tx.select().from(products).where(and(eq(products.id,productId),isNull(products.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Producto no encontrado.');
    if(input.categoryId){const [category]=await tx.select({id:categories.id}).from(categories).where(and(eq(categories.id,input.categoryId),eq(categories.active,true))).limit(1);if(!category)throw new AppError(409,'La categoría seleccionada no está disponible.');}
    if(input.barcode){const [duplicate]=await tx.select({id:products.id}).from(products).where(and(eq(products.barcode,input.barcode),isNull(products.deletedAt),sql`${products.id} <> ${productId}`)).limit(1);if(duplicate)throw new AppError(409,'Ese código de barras ya pertenece a otro producto.');}
    const [updated]=await tx.update(products).set({...input,updatedAt:new Date()}).where(eq(products.id,productId)).returning();
    if(input.stock!==undefined&&input.stock!==current.stock)await tx.insert(inventoryMovements).values({businessId:business.id,productId,userId:req.auth!.userId,type:'manual_adjustment',quantity:Math.abs(input.stock-current.stock),previousStock:current.stock,newStock:input.stock,referenceType:'manual',referenceId:productId,notes:'Ajuste desde inventario'});
    return updated;
  });
  if(!item)throw new AppError(500,'No fue posible actualizar el producto.');
  await recordAuditLog({actor:req.auth!,action:'products.update',entityType:'product',entityId:item.id,summary:`Producto actualizado: ${item.name}`,metadata:input});
  res.json({item});
}));
operationsRouter.delete('/products/:id', requireRole(...roleGroups.adminOnly), asyncHandler(async (req,res) => {
  const [item]=await db.update(products).set({deletedAt:new Date(),active:false,updatedAt:new Date()}).where(and(eq(products.id,id.parse(req.params.id)),isNull(products.deletedAt))).returning({id:products.id});
  if(item)await recordAuditLog({actor:req.auth!,action:'products.archive',entityType:'product',entityId:item.id,summary:'Producto archivado'});
  if(!item)throw new AppError(404,'Producto no encontrado.'); res.status(204).send();
}));

operationsRouter.use('/repairs', requireModule('repairs'));

operationsRouter.get('/repairs', asyncHandler(async (req,res) => {
  const {search,status,limit}=query.parse(req.query);
  const rows=await db.select({repair:repairs,clientName:clients.name,clientPhone:clients.phone}).from(repairs).innerJoin(clients,eq(repairs.clientId,clients.id)).where(and(
    isNull(repairs.deletedAt),
    status?eq(repairs.status,status):undefined,
    search?or(ilike(repairs.folio,`%${search}%`),ilike(repairs.brand,`%${search}%`),ilike(repairs.model,`%${search}%`),ilike(clients.name,`%${search}%`),ilike(clients.phone,`%${search}%`)):undefined
  )).orderBy(desc(repairs.createdAt)).limit(limit);
  res.json({items:rows.map(({repair,...client})=>({...repair,...client}))});
}));

operationsRouter.post('/repairs', requireRole(...roleGroups.workshop), asyncHandler(async (req,res) => {
  const input=repairInput.parse(req.body);
  const initialTotalCents = input.finalCents ?? input.estimatedCents ?? 0;
  if (initialTotalCents > 0 && input.depositCents > initialTotalCents) throw new AppError(400, 'El anticipo no puede superar el total definido de la reparación.');
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [counter]=await tx.insert(folioCounters).values({scope:'repair',value:1}).onConflictDoUpdate({target:folioCounters.scope,set:{value:sql`${folioCounters.value}+1`,updatedAt:new Date()}}).returning({value:folioCounters.value});
    if(!counter)throw new AppError(500,'No fue posible generar el folio.');
    const [created]=await tx.insert(repairs).values({...input,folio:`REP-${String(counter.value).padStart(5,'0')}`}).returning();
    if(!created)throw new AppError(500,'No fue posible crear la reparación.');
    await tx.insert(repairEvents).values({repairId:created.id,toStatus:'received',note:'Equipo recibido en taller.',createdById:req.auth!.userId});
    let cashWarning: string | null = null;
    if(created.depositCents>0){
      const [depositPayment]=await tx.insert(repairPayments).values({businessId:business.id,repairId:created.id,amountCents:created.depositCents,method:'cash',note:'Anticipo inicial',receivedByUserId:req.auth!.userId}).returning();
      if(depositPayment){
        const cashResult=await recordCashMovementIfOpen(tx,{businessId:business.id,type:'repair_payment',method:'cash',amountCents:depositPayment.amountCents,direction:'in',referenceType:'repair',referenceId:created.id,referenceFolio:created.folio,reason:'Anticipo de reparación',note:depositPayment.note,userId:req.auth!.userId});
        cashWarning=cashResult.cashWarning;
      }
    }
    return {...created,cashWarning};
  });
  await recordAuditLog({actor:req.auth!,action:'repairs.create',entityType:'repair',entityId:item.id,summary:`Reparación creada: ${item.folio}`,metadata:{clientId:item.clientId,depositCents:item.depositCents,status:item.status}});
  res.status(201).json({item});
}));

operationsRouter.get('/repairs/:id', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id);
  const business=await getBusiness();
  const canViewCosts=canAccessCosts(req.auth!.role);
  const [row]=await db.select({repair:repairs,client:clients,assignedToName:users.name}).from(repairs).innerJoin(clients,eq(repairs.clientId,clients.id)).leftJoin(users,eq(repairs.assignedToId,users.id)).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
  if(!row)throw new AppError(404,'Reparación no encontrada.');
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
  const safeItems=canViewCosts?items:items.map(withoutSensitiveCosts);
  const economics=canViewCosts?{itemsCostCents,itemsGrossProfitCents,itemsGrossMarginBps}:{};
  res.json({item:{...row.repair,client:row.client,assignedToName:row.assignedToName,events,payments,items:safeItems,business,totalCents,paidCents,balanceCents,paymentStatus,itemsRevenueCents,...economics}});
}));

operationsRouter.patch('/repairs/:id', requireRole(...roleGroups.workshop), asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=repairUpdateInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const [current]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Reparación no encontrada.');
    if(input.status)assertRepairTransition(current.status,input.status,req.auth!.role);
    const now=new Date();
    const nextWarrantyDays=input.warrantyDays??current.warrantyDays;
    const nextStatus=input.status??current.status;
    const set={...input,authorizedAt:input.quoteStatus==='authorized'&&!current.authorizedAt?now:current.authorizedAt,deliveredAt:nextStatus==='delivered'&&!current.deliveredAt?now:current.deliveredAt,warrantyUntil:nextStatus==='delivered'&&nextWarrantyDays>0?addDays(now,nextWarrantyDays):current.warrantyUntil,updatedAt:now};
    const [updated]=await tx.update(repairs).set(set).where(eq(repairs.id,repairId)).returning();
    if(input.status&&input.status!==current.status)await tx.insert(repairEvents).values({repairId,fromStatus:current.status,toStatus:input.status,note:'Cambio de estado desde detalle.',createdById:req.auth!.userId});
    return updated;
  });
  if(!item)throw new AppError(500,'No fue posible actualizar la reparación.');
  await recordAuditLog({actor:req.auth!,action:'repairs.update',entityType:'repair',entityId:item.id,summary:`Reparación actualizada: ${item.folio}`,metadata:input});
  res.json({item});
}));

operationsRouter.delete('/repairs/:id', requireRole(...roleGroups.adminOnly), asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id);
  const [item]=await db.update(repairs).set({deletedAt:new Date(),updatedAt:new Date()}).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).returning({id:repairs.id});
  if(item)await recordAuditLog({actor:req.auth!,action:'repairs.archive',entityType:'repair',entityId:item.id,summary:'Reparación archivada'});
  if(!item)throw new AppError(404,'Reparación no encontrada.'); res.status(204).send();
}));

operationsRouter.patch('/repairs/:id/status', requireRole(...roleGroups.workshop), asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id),input=stateInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const [current]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Reparación no encontrada.');
    assertRepairTransition(current.status,input.status,req.auth!.role);
    const now=new Date();
    const warrantyDays=input.warrantyDays??current.warrantyDays;
    const [updated]=await tx.update(repairs).set({status:input.status,diagnosis:input.diagnosis??current.diagnosis,finalCents:input.finalCents??current.finalCents,warrantyDays,deliveredAt:input.status==='delivered'?now:current.deliveredAt,warrantyUntil:input.status==='delivered'&&warrantyDays>0?addDays(now,warrantyDays):current.warrantyUntil,updatedAt:now}).where(eq(repairs.id,repairId)).returning();
    await tx.insert(repairEvents).values({repairId,fromStatus:current.status,toStatus:input.status,note:input.note,createdById:req.auth!.userId});
    return updated;
  });
  if(!item)throw new AppError(500,'No fue posible cambiar el estado de la reparación.');
  await recordAuditLog({actor:req.auth!,action:'repairs.status',entityType:'repair',entityId:item.id,summary:`Estado de reparación: ${item.status}`,metadata:input});
  res.json({item});
}));

operationsRouter.post('/repairs/:id/events', requireRole(...roleGroups.workshop), asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=eventInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const [current]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Reparación no encontrada.');
    if(input.status)assertRepairTransition(current.status,input.status,req.auth!.role);
    if(input.status&&input.status!==current.status)await tx.update(repairs).set({status:input.status,updatedAt:new Date()}).where(eq(repairs.id,repairId));
    const [event]=await tx.insert(repairEvents).values({repairId,fromStatus:input.status&&input.status!==current.status?current.status:null,toStatus:input.status??current.status,note:input.note,createdById:req.auth!.userId}).returning();
    return event;
  });
  if(!item)throw new AppError(500,'No fue posible registrar el evento de reparación.');
  await recordAuditLog({actor:req.auth!,action:'repairs.event',entityType:'repair',entityId:repairId,summary:'Evento agregado a reparación',metadata:input});
  res.status(201).json({item});
}));

operationsRouter.post('/repairs/:id/payments', requireRole(...roleGroups.staff), asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=paymentInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [repair]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!repair)throw new AppError(404,'Reparación no encontrada.');
    if(repair.status==='cancelled')throw new AppError(409,'No se pueden registrar pagos en una reparación cancelada.');
    const totalCents=quoteTotal(repair);
    const [paid]=await tx.select({value:sql<number>`coalesce(sum(${repairPayments.amountCents}),0)::int`}).from(repairPayments).where(and(eq(repairPayments.repairId,repairId),eq(repairPayments.status,'active')));
    const alreadyPaidCents=paid?.value ?? 0;
    if(totalCents>0 && alreadyPaidCents + input.amountCents > totalCents) throw new AppError(400,'El pago excede el saldo pendiente de la reparación.');
    const [payment]=await tx.insert(repairPayments).values({businessId:business.id,repairId,amountCents:input.amountCents,method:input.method,note:input.note??null,receivedByUserId:req.auth!.userId}).returning();
    const cashResult=await recordCashMovementIfOpen(tx,{businessId:business.id,type:'repair_payment',method:input.method,amountCents:input.amountCents,direction:'in',referenceType:'repair',referenceId:repairId,referenceFolio:repair.folio,reason:'Pago de reparación',note:input.note??null,userId:req.auth!.userId});
    await tx.insert(repairEvents).values({repairId,fromStatus:repair.status,toStatus:repair.status,note:`Pago registrado por ${input.amountCents} centavos.`,createdById:req.auth!.userId});
    return {...payment,cashWarning:cashResult.cashWarning};
  });
  if(!item)throw new AppError(500,'No fue posible registrar el pago de reparación.');
  await recordAuditLog({actor:req.auth!,action:'repairs.payment',entityType:'repair',entityId:repairId,summary:'Pago de reparación registrado',metadata:{amountCents:item.amountCents,method:item.method}});
  res.status(201).json({item});
}));

operationsRouter.post('/repairs/:id/items', requireRole(...roleGroups.workshop), asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=itemInput.parse(req.body);
  const canSetCosts=canAccessCosts(req.auth!.role);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [repair]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!repair)throw new AppError(404,'Reparación no encontrada.');
    if(repair.status==='cancelled')throw new AppError(409,'No se pueden agregar conceptos a una reparación cancelada.');
    let name=input.name; let unitPriceCents=input.unitPriceCents; let costCentsSnapshot=canSetCosts?input.costCents:0; let productId=input.productId??null;
    if(productId){
      const [product]=await tx.select().from(products).where(and(eq(products.id,productId),isNull(products.deletedAt),eq(products.active,true))).limit(1);
      if(!product)throw new AppError(404,'Producto no encontrado.');
      name=product.name; costCentsSnapshot=product.costCents; if(unitPriceCents===0)unitPriceCents=product.priceCents;
      if(input.affectsInventory){
        const [updated]=await tx.update(products).set({stock:sql`${products.stock}-${input.quantity}`,updatedAt:new Date()}).where(and(eq(products.id,productId),gte(products.stock,input.quantity))).returning({newStock:products.stock});
        if(!updated)throw new AppError(409,`Stock insuficiente para ${product.name}.`,'INSUFFICIENT_STOCK');
        await tx.insert(inventoryMovements).values({businessId:business.id,productId,userId:req.auth!.userId,type:'service_usage',quantity:input.quantity,previousStock:updated.newStock+input.quantity,newStock:updated.newStock,referenceType:'repair',referenceId:repairId,notes:`Uso en reparación ${repair.folio}`});
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
  if(!item)throw new AppError(500,'No fue posible registrar el concepto de reparación.');
  await recordAuditLog({actor:req.auth!,action:'repairs.item',entityType:'repair',entityId:repairId,summary:`Concepto agregado: ${item.nameSnapshot}`,metadata:{quantity:item.quantity,totalCents:item.totalCents,affectsInventory:item.affectsInventory,productId:item.productId}});
  res.status(201).json({item:canSetCosts?item:withoutSensitiveCosts(item)});
}));

operationsRouter.use('/repair-items', requireModule('repairs'));

operationsRouter.post('/repair-items/:id/void', requireRole(...roleGroups.adminOnly), asyncHandler(async (req,res) => {
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
      await tx.insert(inventoryMovements).values({businessId:business.id,productId:row.item.productId,userId:req.auth!.userId,type:'service_usage_void',quantity:row.item.quantity,previousStock:updated.newStock-row.item.quantity,newStock:updated.newStock,referenceType:'repair',referenceId:row.repair.id,notes:`Anulación de uso en reparación ${row.repair.folio}: ${input.reason}`});
    }
    await tx.insert(repairEvents).values({repairId:row.repair.id,fromStatus:row.repair.status,toStatus:row.repair.status,note:`Concepto anulado: ${row.item.nameSnapshot}. ${input.reason}`,createdById:req.auth!.userId});
    return voided;
  });
  if(!item)throw new AppError(500,'No fue posible anular el concepto de reparación.');
  await recordAuditLog({actor:req.auth!,action:'repairs.item_void',entityType:'repair_item',entityId:item.id,summary:'Concepto de reparación anulado',metadata:{reason:input.reason,repairId:item.repairId}});
  res.json({item});
}));

operationsRouter.post('/repair-payments/:id/void', requireRole(...roleGroups.adminOnly), asyncHandler(async (req,res) => {
  const paymentId=id.parse(req.params.id);
  const item=await db.transaction(async tx=>{
    const business=await getBusiness(tx);
    const [row]=await tx.select({payment:repairPayments,repair:repairs}).from(repairPayments).innerJoin(repairs,eq(repairPayments.repairId,repairs.id)).where(and(eq(repairPayments.id,paymentId),eq(repairPayments.status,'active'))).limit(1);
    if(!row)throw new AppError(404,'Pago no encontrado o ya anulado.');
    const [voided]=await tx.update(repairPayments).set({status:'voided',voidedAt:new Date(),voidedByUserId:req.auth!.userId}).where(eq(repairPayments.id,paymentId)).returning();
    let cashWarning: string | null = null;
    if(voided){
      if(row.payment.method==='mixed')throw new AppError(409,'Un pago de reparación no puede usar método mixto.');
      const cashResult=await recordCashMovementIfOpen(tx,{businessId:business.id,type:'repair_payment_void',method:row.payment.method,amountCents:row.payment.amountCents,direction:'out',referenceType:'repair',referenceId:row.repair.id,referenceFolio:row.repair.folio,reason:'Anulación de pago de reparación',note:row.payment.note,userId:req.auth!.userId});
      cashWarning=cashResult.cashWarning;
    }
    await tx.insert(repairEvents).values({repairId:row.repair.id,fromStatus:row.repair.status,toStatus:row.repair.status,note:`Pago anulado por ${row.payment.amountCents} centavos.`,createdById:req.auth!.userId});
    return voided ? {...voided,cashWarning} : voided;
  });
  await recordAuditLog({actor:req.auth!,action:'repairs.payment_void',entityType:'repair_payment',entityId:item?.id ?? paymentId,summary:'Pago de reparación anulado',metadata:{repairId:item?.repairId ?? null,amountCents:item?.amountCents ?? null}});
  res.json({item});
}));









