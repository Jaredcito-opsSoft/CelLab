import { and, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, clients, folioCounters, inventoryMovements, products, repairEvents, repairs } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { AppError } from '../../lib/errors.js';
import { requireAuth } from '../../middlewares/auth.js';

export const operationsRouter = Router();
operationsRouter.use(requireAuth);
const id = z.string().uuid();
const query = z.object({ search: z.string().trim().max(100).default(''), limit: z.coerce.number().int().min(1).max(100).default(50) });
const clientInput = z.object({ name: z.string().trim().min(2).max(140), phone: z.string().trim().min(8).max(20), email: z.string().email().nullable().optional(), notes: z.string().max(2000).nullable().optional() });
const productInput = z.object({ sku: z.string().trim().min(2).max(50), name: z.string().trim().min(2).max(160), categoryId: z.string().uuid().nullable().optional(), costCents: z.number().int().min(0).default(0), priceCents: z.number().int().min(0), stock: z.number().int().min(0).default(0), minimumStock: z.number().int().min(0).default(0), active: z.boolean().default(true) });
const states = ['received','diagnosis','awaiting_authorization','in_repair','testing','ready','delivered','cancelled'] as const;
const repairInput = z.object({ clientId: z.string().uuid(), assignedToId: z.string().uuid().nullable().optional(), brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(120), serialNumber: z.string().max(120).nullable().optional(), reportedIssue: z.string().trim().min(3).max(3000), physicalCondition: z.string().trim().min(3).max(3000), depositCents: z.number().int().min(0).default(0), estimatedCents: z.number().int().min(0).nullable().optional(), internalNotes: z.string().max(3000).nullable().optional() });
const stateInput = z.object({ status: z.enum(states), note: z.string().max(1000).nullable().optional(), diagnosis: z.string().max(3000).nullable().optional(), finalCents: z.number().int().min(0).nullable().optional(), warrantyDays: z.number().int().min(0).max(365).optional() });

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
    const [business]=await tx.select({id:businessSettings.id}).from(businessSettings).limit(1);
    if(!business)throw new AppError(409,'Configura el negocio antes de registrar inventario.');
    const [created]=await tx.insert(products).values(input).returning();
    if(!created)throw new AppError(500,'No fue posible registrar el producto.');
    if(created.stock>0)await tx.insert(inventoryMovements).values({businessId:business.id,productId:created.id,userId:req.auth!.userId,type:'stock_entry',quantity:created.stock,previousStock:0,newStock:created.stock,referenceType:'product',referenceId:created.id,notes:'Existencia inicial'});
    return created;
  });
  res.status(201).json({item});
}));
operationsRouter.patch('/products/:id', asyncHandler(async (req,res) => {
  const productId=id.parse(req.params.id),input=productInput.partial().parse(req.body);
  const item=await db.transaction(async tx=>{
    const [business]=await tx.select({id:businessSettings.id}).from(businessSettings).limit(1);
    if(!business)throw new AppError(409,'La configuración del negocio no existe.');
    const [current]=await tx.select().from(products).where(and(eq(products.id,productId),isNull(products.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Producto no encontrado.');
    const [updated]=await tx.update(products).set({...input,updatedAt:new Date()}).where(eq(products.id,productId)).returning();
    if(input.stock!==undefined&&input.stock!==current.stock)await tx.insert(inventoryMovements).values({businessId:business.id,productId,userId:req.auth!.userId,type:'manual_adjustment',quantity:Math.abs(input.stock-current.stock),previousStock:current.stock,newStock:input.stock,referenceType:'manual',referenceId:productId,notes:'Ajuste desde inventario'});
    return updated;
  });
  res.json({item});
}));
operationsRouter.delete('/products/:id', asyncHandler(async (req,res) => {
  const [item]=await db.update(products).set({deletedAt:new Date(),active:false,updatedAt:new Date()}).where(and(eq(products.id,id.parse(req.params.id)),isNull(products.deletedAt))).returning({id:products.id});
  if(!item)throw new AppError(404,'Producto no encontrado.'); res.status(204).send();
}));

operationsRouter.get('/repairs', asyncHandler(async (req,res) => {
  const {search,limit}=query.parse(req.query);
  const rows=await db.select({repair:repairs,clientName:clients.name,clientPhone:clients.phone}).from(repairs).innerJoin(clients,eq(repairs.clientId,clients.id)).where(and(isNull(repairs.deletedAt),search?or(ilike(repairs.folio,`%${search}%`),ilike(repairs.brand,`%${search}%`),ilike(repairs.model,`%${search}%`),ilike(clients.name,`%${search}%`)):undefined)).orderBy(desc(repairs.createdAt)).limit(limit);
  res.json({items:rows.map(({repair,...client})=>({...repair,...client}))});
}));
operationsRouter.post('/repairs', asyncHandler(async (req,res) => {
  const input=repairInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const [counter]=await tx.insert(folioCounters).values({scope:'repair',value:1}).onConflictDoUpdate({target:folioCounters.scope,set:{value:sql`${folioCounters.value}+1`,updatedAt:new Date()}}).returning({value:folioCounters.value});
    if(!counter)throw new AppError(500,'No fue posible generar el folio.');
    const [created]=await tx.insert(repairs).values({...input,folio:`REP-${String(counter.value).padStart(5,'0')}`}).returning();
    if(!created)throw new AppError(500,'No fue posible crear la reparación.');
    await tx.insert(repairEvents).values({repairId:created.id,toStatus:'received',note:'Equipo recibido en taller.',createdById:req.auth!.userId});
    return created;
  });
  res.status(201).json({item});
}));
operationsRouter.patch('/repairs/:id', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id), input=repairInput.partial().parse(req.body);
  const [item]=await db.update(repairs).set({...input,updatedAt:new Date()}).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).returning();
  if(!item)throw new AppError(404,'Reparación no encontrada.'); res.json({item});
}));
operationsRouter.delete('/repairs/:id', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id);
  const [item]=await db.update(repairs).set({deletedAt:new Date(),updatedAt:new Date()}).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).returning({id:repairs.id});
  if(!item)throw new AppError(404,'Reparación no encontrada.'); res.status(204).send();
}));

operationsRouter.patch('/repairs/:id/status', asyncHandler(async (req,res) => {
  const repairId=id.parse(req.params.id),input=stateInput.parse(req.body);
  const item=await db.transaction(async tx=>{
    const [current]=await tx.select().from(repairs).where(and(eq(repairs.id,repairId),isNull(repairs.deletedAt))).limit(1);
    if(!current)throw new AppError(404,'Reparación no encontrada.');
    const [updated]=await tx.update(repairs).set({status:input.status,diagnosis:input.diagnosis??current.diagnosis,finalCents:input.finalCents??current.finalCents,warrantyDays:input.warrantyDays??current.warrantyDays,deliveredAt:input.status==='delivered'?new Date():current.deliveredAt,updatedAt:new Date()}).where(eq(repairs.id,repairId)).returning();
    await tx.insert(repairEvents).values({repairId,fromStatus:current.status,toStatus:input.status,note:input.note,createdById:req.auth!.userId});
    return updated;
  });
  res.json({item});
}));
