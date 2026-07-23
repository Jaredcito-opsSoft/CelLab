import bcrypt from 'bcryptjs';
import { and, eq, sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db, queryClient } from './client.js';
import { businessMemberships, businesses, businessSettings, cashRegisters, users } from './schema.js';

const CEL_LAB_BUSINESS_ID = '00000000-0000-4000-8000-000000000001';

await db.insert(businesses).values({
  id: CEL_LAB_BUSINESS_ID,
  name: 'CelLab Tuxtla',
  slug: 'cellab-tuxtla',
  status: 'active',
}).onConflictDoUpdate({
  target: businesses.id,
  set: { name: 'CelLab Tuxtla', slug: 'cellab-tuxtla', status: 'active', updatedAt: new Date() },
});

await db.insert(businessSettings).values({
  id: CEL_LAB_BUSINESS_ID,
  businessName: 'CelLab Tuxtla',
  businessType: 'Accesorios, diagnóstico y reparación celular',
  phone: '961 543 7710',
  address: 'Tuxtla Gutiérrez, Chiapas',
  city: 'Tuxtla Gutiérrez',
  state: 'Chiapas',
  ticketMessage: 'Gracias por su compra. Conserve esta nota para cualquier aclaración.',
  warrantyMessage: 'Garantía general de 15 días presentando nota o tarjeta del negocio. No aplica por golpes, humedad, manipulación externa o daños distintos al servicio realizado.',
  currency: 'MXN',
  primaryColor: '#0A84FF',
}).onConflictDoNothing({ target: businessSettings.id });

const [defaultRegister] = await db.select({ id: cashRegisters.id })
  .from(cashRegisters)
  .where(and(eq(cashRegisters.businessId, CEL_LAB_BUSINESS_ID), eq(cashRegisters.isDefault, true)))
  .limit(1);

if (!defaultRegister) {
  const [mainRegister] = await db.select({ id: cashRegisters.id })
    .from(cashRegisters)
    .where(and(eq(cashRegisters.businessId, CEL_LAB_BUSINESS_ID), eq(cashRegisters.code, 'MAIN-01')))
    .limit(1);

  if (mainRegister) {
    await db.update(cashRegisters)
      .set({ active: true, isDefault: true, updatedAt: new Date() })
      .where(eq(cashRegisters.id, mainRegister.id));
  } else {
    await db.insert(cashRegisters).values({
      businessId: CEL_LAB_BUSINESS_ID,
      code: 'MAIN-01',
      name: 'Caja principal',
      active: true,
      isDefault: true,
    });
  }
}

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  console.log('Configuración de CelLab creada. Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el acceso inicial.');
  await queryClient.end();
  process.exit(0);
}
const email = env.ADMIN_EMAIL.toLowerCase();
const current = await db.select({
  id: users.id,
  passwordHash: users.passwordHash,
}).from(users).where(eq(users.email, email)).limit(1);
let adminUserId: string;
if (current[0]) {
  adminUserId = current[0].id;
  const passwordMatches = await bcrypt.compare(env.ADMIN_PASSWORD, current[0].passwordHash);
  await db.update(users).set({
    ...(passwordMatches
      ? {}
      : {
          passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
          sessionVersion: sql`${users.sessionVersion} + 1`,
        }),
    active: true,
    role: 'admin',
    updatedAt: new Date(),
  }).where(eq(users.id, adminUserId));
  console.log(`Administrador actualizado: ${email}`);
} else {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const [created] = await db.insert(users).values({ name: 'Administrador', email, passwordHash, role: 'admin' }).returning({ id: users.id });
  if (!created) throw new Error('No fue posible crear el administrador inicial.');
  adminUserId = created.id;
  console.log(`Administrador creado: ${email}`);
}

await db.insert(businessMemberships).values({
  businessId: CEL_LAB_BUSINESS_ID,
  userId: adminUserId,
  role: 'admin',
  active: true,
}).onConflictDoUpdate({
  target: [businessMemberships.businessId, businessMemberships.userId],
  set: { role: 'admin', active: true, updatedAt: new Date() },
});

await queryClient.end();
