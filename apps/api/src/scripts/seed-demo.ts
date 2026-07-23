import bcrypt from 'bcryptjs';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '../config/env.js';
import { db, queryClient } from '../db/client.js';
import {
  businessModules,
  businessSettings,
  cashRegisters,
  categories,
  clients,
  folioCounters,
  inventoryMovements,
  products,
  repairEvents,
  repairs,
  saleItems,
  salePayments,
  sales,
  users,
} from '../db/schema.js';
import { businessModuleRegistry, type BusinessModuleKey } from '../modules/modules/modules.registry.js';

const input = z.object({
  profile: z.enum(['pos', 'cellab']).default('pos'),
  password: z.string().min(10),
}).parse({
  profile: process.env.DEMO_PROFILE,
  password: process.env.DEMO_PASSWORD,
});

function assertDemoDatabase() {
  const database = new URL(env.DATABASE_URL);
  const databaseName = decodeURIComponent(database.pathname.replace(/^\//, '')).toLowerCase();
  const localHost = database.hostname === '127.0.0.1' || database.hostname === 'localhost';
  if (!localHost || !databaseName.includes('demo') || database.hostname.includes('supabase') || env.NODE_ENV === 'production') {
    throw new Error('Seed demo bloqueado: usa una base PostgreSQL local cuyo nombre contenga "demo" y NODE_ENV distinto de production.');
  }
  return databaseName;
}

const databaseName = assertDemoDatabase();
const BUSINESS_ID = '00000000-0000-4000-8000-000000000001';
const now = new Date();
const historicalSaleAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
const passwordHash = await bcrypt.hash(input.password, 12);

const categoryRows = [
  { id: '20000000-0000-4000-8000-000000000001', name: 'Protección' },
  { id: '20000000-0000-4000-8000-000000000002', name: 'Carga y cables' },
  { id: '20000000-0000-4000-8000-000000000003', name: 'Audio' },
  { id: '20000000-0000-4000-8000-000000000004', name: 'Refacciones' },
] as const;

const productRows = [
  { id: '10000000-0000-4000-8000-000000000001', sku: 'DEMO-MIC-IP11', name: 'Mica templada iPhone 11', categoryId: categoryRows[0].id, costCents: 3500, priceCents: 9900, stock: 18, minimumStock: 5 },
  { id: '10000000-0000-4000-8000-000000000002', sku: 'DEMO-MIC-A15', name: 'Mica templada Samsung A15', categoryId: categoryRows[0].id, costCents: 3200, priceCents: 8900, stock: 4, minimumStock: 5 },
  { id: '10000000-0000-4000-8000-000000000003', sku: 'DEMO-CAB-USBC', name: 'Cable USB-C 1 m', categoryId: categoryRows[1].id, costCents: 5800, priceCents: 12900, stock: 24, minimumStock: 8 },
  { id: '10000000-0000-4000-8000-000000000004', sku: 'DEMO-CAB-LTG', name: 'Cable Lightning 1 m', categoryId: categoryRows[1].id, costCents: 7200, priceCents: 15900, stock: 12, minimumStock: 5 },
  { id: '10000000-0000-4000-8000-000000000005', sku: 'DEMO-CAR-20W', name: 'Cargador USB-C 20 W', categoryId: categoryRows[1].id, costCents: 14500, priceCents: 29900, stock: 9, minimumStock: 4 },
  { id: '10000000-0000-4000-8000-000000000006', sku: 'DEMO-AUD-35', name: 'Audífonos 3.5 mm', categoryId: categoryRows[2].id, costCents: 6800, priceCents: 14900, stock: 14, minimumStock: 4 },
  { id: '10000000-0000-4000-8000-000000000007', sku: 'DEMO-AUD-BT', name: 'Audífonos Bluetooth', categoryId: categoryRows[2].id, costCents: 21500, priceCents: 44900, stock: 7, minimumStock: 3 },
  { id: '10000000-0000-4000-8000-000000000008', sku: 'DEMO-FUN-TRA', name: 'Funda transparente', categoryId: categoryRows[0].id, costCents: 4200, priceCents: 11900, stock: 20, minimumStock: 6 },
  { id: '10000000-0000-4000-8000-000000000009', sku: 'DEMO-FUN-REF', name: 'Funda reforzada', categoryId: categoryRows[0].id, costCents: 9500, priceCents: 22900, stock: 10, minimumStock: 4 },
  { id: '10000000-0000-4000-8000-000000000010', sku: 'DEMO-POPSOCKET', name: 'PopSocket', categoryId: categoryRows[0].id, costCents: 2800, priceCents: 7900, stock: 30, minimumStock: 10 },
  { id: '10000000-0000-4000-8000-000000000011', sku: 'DEMO-BOC-MINI', name: 'Bocina Bluetooth mini', categoryId: categoryRows[2].id, costCents: 18500, priceCents: 39900, stock: 1, minimumStock: 2 },
  { id: '10000000-0000-4000-8000-000000000012', sku: 'DEMO-CC-GEN', name: 'Centro de carga genérico', categoryId: categoryRows[3].id, costCents: 6500, priceCents: 18900, stock: 6, minimumStock: 3 },
] as const;

async function upsertUser(executor: any, data: { name: string; email: string; role: 'admin' | 'manager' | 'staff' | 'viewer' }) {
  const [existing] = await executor.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing) {
    const [updated] = await executor.update(users).set({ name: data.name, passwordHash, role: data.role, active: true, updatedAt: now }).where(eq(users.id, existing.id)).returning({ id: users.id });
    return updated.id as string;
  }
  const [created] = await executor.insert(users).values({ ...data, passwordHash, active: true }).returning({ id: users.id });
  return created.id as string;
}

try {
  await db.transaction(async (tx) => {
    const business = input.profile === 'cellab'
      ? {
          businessName: 'CelLab Tuxtla · Demo',
          businessType: 'Taller de reparación y accesorios',
          phone: '9610000000',
          address: 'Avenida Demo 100, Colonia Centro',
          city: 'Tuxtla Gutiérrez',
          state: 'Chiapas',
          ticketMessage: 'Demostración LocalPOS. Gracias por su visita.',
          warrantyMessage: 'Garantía de demostración según el servicio indicado en la nota.',
          currency: 'MXN',
          primaryColor: '#185A70',
          timezone: 'America/Mexico_City',
          requireOpenCashForMoneyOperations: true,
        }
      : {
          businessName: 'Demo LocalPOS',
          businessType: 'Tienda de accesorios',
          phone: '9610000000',
          address: 'Avenida Demo 100, Colonia Centro',
          city: 'Tuxtla Gutiérrez',
          state: 'Chiapas',
          ticketMessage: 'Gracias por su compra en Demo LocalPOS.',
          warrantyMessage: 'Conserve su ticket para cualquier aclaración.',
          currency: 'MXN',
          primaryColor: '#185A70',
          timezone: 'America/Mexico_City',
          requireOpenCashForMoneyOperations: true,
        };

    await tx.insert(businessSettings).values({ id: BUSINESS_ID, ...business })
      .onConflictDoUpdate({ target: businessSettings.id, set: { ...business, updatedAt: now } });

    const adminId = await upsertUser(tx, { name: 'Administrador Demo', email: 'admin@demo.localpos.test', role: 'admin' });
    await upsertUser(tx, { name: 'Gerente Demo', email: 'gerente@demo.localpos.test', role: 'manager' });
    await upsertUser(tx, { name: 'Caja Demo', email: 'caja@demo.localpos.test', role: 'staff' });
    const viewerId = await upsertUser(tx, { name: 'Consulta Demo', email: 'consulta@demo.localpos.test', role: 'viewer' });

    const enabledModules = new Set<BusinessModuleKey>(['core_pos', 'cash', 'inventory_basic']);
    if (input.profile === 'cellab') {
      enabledModules.add('repairs');
      enabledModules.add('public_tracking');
      enabledModules.add('repair_parts');
    }
    for (const module of businessModuleRegistry) {
      await tx.insert(businessModules).values({
        businessId: BUSINESS_ID,
        moduleKey: module.key,
        enabled: enabledModules.has(module.key),
        configuredByUserId: adminId,
      }).onConflictDoUpdate({
        target: [businessModules.businessId, businessModules.moduleKey],
        set: { enabled: enabledModules.has(module.key), configuredByUserId: adminId, updatedAt: now },
      });
    }

    const [defaultRegister] = await tx.select({ id: cashRegisters.id }).from(cashRegisters)
      .where(and(eq(cashRegisters.businessId, BUSINESS_ID), eq(cashRegisters.isDefault, true))).limit(1);
    if (!defaultRegister) {
      const [mainRegister] = await tx.select({ id: cashRegisters.id }).from(cashRegisters)
        .where(and(eq(cashRegisters.businessId, BUSINESS_ID), eq(cashRegisters.code, 'MAIN-01'))).limit(1);
      if (mainRegister) {
        await tx.update(cashRegisters).set({ name: 'Caja principal', active: true, isDefault: true, updatedAt: now }).where(eq(cashRegisters.id, mainRegister.id));
      } else {
        await tx.insert(cashRegisters).values({ businessId: BUSINESS_ID, code: 'MAIN-01', name: 'Caja principal', active: true, isDefault: true });
      }
    }

    for (const category of categoryRows) {
      await tx.insert(categories).values({ ...category, active: true })
        .onConflictDoUpdate({ target: categories.name, set: { active: true, updatedAt: now } });
    }
    for (const product of productRows) {
      await tx.insert(products).values({ ...product, active: true, deletedAt: null })
        .onConflictDoUpdate({
          target: products.sku,
          set: {
            name: product.name,
            categoryId: product.categoryId,
            costCents: product.costCents,
            priceCents: product.priceCents,
            stock: product.stock,
            minimumStock: product.minimumStock,
            active: true,
            deletedAt: null,
            updatedAt: now,
          },
        });
      await tx.insert(inventoryMovements).values({
        id: `63000000-0000-4000-8000-${product.id.slice(-12)}`,
        businessId: BUSINESS_ID,
        productId: product.id,
        userId: adminId,
        type: 'stock_entry',
        quantity: product.stock + (product.sku === 'DEMO-CAB-USBC' || product.sku === 'DEMO-MIC-A15' ? 1 : 0),
        previousStock: 0,
        newStock: product.stock + (product.sku === 'DEMO-CAB-USBC' || product.sku === 'DEMO-MIC-A15' ? 1 : 0),
        referenceType: 'product',
        referenceId: product.id,
        notes: 'Existencia inicial de demostración',
        createdAt: historicalSaleAt,
      }).onConflictDoNothing({ target: inventoryMovements.id });
    }

    const demoClients = [
      { id: '30000000-0000-4000-8000-000000000001', name: 'Ana Demo', phone: '9610000101', email: 'ana@demo.localpos.test', notes: 'Cliente ficticio para demostración.' },
      { id: '30000000-0000-4000-8000-000000000002', name: 'Carlos Demo', phone: '9610000102', email: 'carlos@demo.localpos.test', notes: 'Cliente ficticio para demostración.' },
    ] as const;
    for (const client of demoClients) {
      await tx.insert(clients).values(client)
        .onConflictDoUpdate({ target: clients.id, set: { name: client.name, phone: client.phone, email: client.email, notes: client.notes, deletedAt: null, updatedAt: now } });
    }

    await tx.insert(sales).values({
      id: '60000000-0000-4000-8000-000000000001',
      businessId: BUSINESS_ID,
      folio: 'VTA-00001',
      customerId: demoClients[0].id,
      userId: adminId,
      subtotalCents: 21800,
      discountCents: 0,
      totalCents: 21800,
      paymentMethod: 'cash',
      status: 'completed',
      notes: 'Venta mínima de demostración',
      createdAt: historicalSaleAt,
      updatedAt: historicalSaleAt,
    }).onConflictDoNothing({ target: sales.id });
    await tx.insert(saleItems).values([
      {
        id: '61000000-0000-4000-8000-000000000001',
        businessId: BUSINESS_ID,
        saleId: '60000000-0000-4000-8000-000000000001',
        productId: productRows[1].id,
        productNameSnapshot: productRows[1].name,
        quantity: 1,
        unitPriceCents: productRows[1].priceCents,
        subtotalCents: productRows[1].priceCents,
        costCentsSnapshot: productRows[1].costCents,
        createdAt: historicalSaleAt,
      },
      {
        id: '61000000-0000-4000-8000-000000000002',
        businessId: BUSINESS_ID,
        saleId: '60000000-0000-4000-8000-000000000001',
        productId: productRows[2].id,
        productNameSnapshot: productRows[2].name,
        quantity: 1,
        unitPriceCents: productRows[2].priceCents,
        subtotalCents: productRows[2].priceCents,
        costCentsSnapshot: productRows[2].costCents,
        createdAt: historicalSaleAt,
      },
    ]).onConflictDoNothing();
    await tx.insert(salePayments).values({
      id: '62000000-0000-4000-8000-000000000001',
      businessId: BUSINESS_ID,
      saleId: '60000000-0000-4000-8000-000000000001',
      method: 'cash',
      amountCents: 21800,
      receivedAmountCents: 25000,
      createdByUserId: adminId,
      createdAt: historicalSaleAt,
    }).onConflictDoNothing({ target: salePayments.id });
    for (const [index, product] of [productRows[1], productRows[2]].entries()) {
      await tx.insert(inventoryMovements).values({
        id: `64000000-0000-4000-8000-00000000000${index + 1}`,
        businessId: BUSINESS_ID,
        productId: product.id,
        userId: adminId,
        type: 'sale',
        quantity: 1,
        previousStock: product.stock + 1,
        newStock: product.stock,
        referenceType: 'sale',
        referenceId: '60000000-0000-4000-8000-000000000001',
        notes: 'Venta histórica mínima de demostración',
        createdAt: historicalSaleAt,
      }).onConflictDoNothing({ target: inventoryMovements.id });
    }
    await tx.insert(folioCounters).values({ scope: 'sale', value: 1 })
      .onConflictDoUpdate({ target: folioCounters.scope, set: { value: sql`greatest(${folioCounters.value}, 1)`, updatedAt: now } });

    if (input.profile === 'cellab') {
      const repairRows = [
        {
          id: '70000000-0000-4000-8000-000000000001',
          folio: 'REP-00001',
          clientId: demoClients[0].id,
          assignedToId: adminId,
          status: 'received' as const,
          brand: 'Samsung',
          model: 'Galaxy A15',
          reportedIssue: 'El equipo no carga correctamente.',
          physicalCondition: 'Equipo ficticio sin golpes visibles.',
          publicNotes: 'Equipo recibido. Iniciaremos el diagnóstico.',
          internalNotes: 'Datos creados exclusivamente para demo.',
          depositCents: 0,
          estimatedCents: null,
          finalCents: null,
          quoteStatus: 'pending',
          warrantyDays: 0,
          trackingEnabled: true,
        },
        {
          id: '70000000-0000-4000-8000-000000000002',
          folio: 'REP-00002',
          clientId: demoClients[1].id,
          assignedToId: adminId,
          status: 'ready' as const,
          brand: 'Motorola',
          model: 'Moto G54',
          reportedIssue: 'Batería con poca duración.',
          physicalCondition: 'Equipo ficticio con desgaste normal.',
          diagnosis: 'Batería degradada; reemplazo y pruebas completadas.',
          publicNotes: 'Tu equipo está listo para entrega.',
          internalNotes: 'Datos creados exclusivamente para demo.',
          depositCents: 20000,
          estimatedCents: 65000,
          finalCents: 65000,
          quoteStatus: 'authorized',
          warrantyDays: 30,
          trackingEnabled: true,
        },
      ];
      for (const repair of repairRows) {
        await tx.insert(repairs).values(repair)
          .onConflictDoUpdate({
            target: repairs.id,
            set: {
              status: repair.status,
              diagnosis: repair.diagnosis ?? null,
              publicNotes: repair.publicNotes,
              internalNotes: repair.internalNotes,
              estimatedCents: repair.estimatedCents,
              finalCents: repair.finalCents,
              quoteStatus: repair.quoteStatus,
              warrantyDays: repair.warrantyDays,
              trackingEnabled: true,
              deletedAt: null,
              updatedAt: now,
            },
          });
      }
      const readyEvents = [
        { id: '71000000-0000-4000-8000-000000000001', fromStatus: null, toStatus: 'received' as const, note: 'Equipo recibido para demostración.' },
        { id: '71000000-0000-4000-8000-000000000002', fromStatus: 'received' as const, toStatus: 'diagnosis' as const, note: 'Diagnóstico iniciado.' },
        { id: '71000000-0000-4000-8000-000000000003', fromStatus: 'diagnosis' as const, toStatus: 'in_repair' as const, note: 'Servicio autorizado.' },
        { id: '71000000-0000-4000-8000-000000000004', fromStatus: 'in_repair' as const, toStatus: 'testing' as const, note: 'Equipo en pruebas.' },
        { id: '71000000-0000-4000-8000-000000000005', fromStatus: 'testing' as const, toStatus: 'ready' as const, note: 'Equipo listo para entrega.' },
      ];
      for (const event of readyEvents) {
        await tx.insert(repairEvents).values({ ...event, repairId: repairRows[1]!.id, createdById: adminId }).onConflictDoNothing({ target: repairEvents.id });
      }
      await tx.insert(repairEvents).values({
        id: '71000000-0000-4000-8000-000000000006',
        repairId: repairRows[0]!.id,
        fromStatus: null,
        toStatus: 'received',
        note: 'Equipo recibido para demostración.',
        createdById: viewerId,
      }).onConflictDoNothing({ target: repairEvents.id });
      await tx.insert(folioCounters).values({ scope: 'repair', value: 2 })
        .onConflictDoUpdate({ target: folioCounters.scope, set: { value: sql`greatest(${folioCounters.value}, 2)`, updatedAt: now } });
    }
  });

  console.log(`Demo preparada en ${databaseName}: perfil=${input.profile}, productos=${productRows.length}, clientes=2, usuarios=4.`);
  console.log('Las contraseñas no se muestran. Usa DEMO_PASSWORD únicamente en este entorno local.');
} finally {
  await queryClient.end();
}
