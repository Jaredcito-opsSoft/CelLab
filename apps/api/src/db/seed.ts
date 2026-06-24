import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db, queryClient } from './client.js';
import { businessSettings, users } from './schema.js';

const CEL_LAB_BUSINESS_ID = '00000000-0000-4000-8000-000000000001';

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

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  console.log('Configuración de CelLab creada. Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el acceso inicial.');
  await queryClient.end();
  process.exit(0);
}
const email = env.ADMIN_EMAIL.toLowerCase();
const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
const current = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
if (current[0]) {
  await db.update(users).set({ passwordHash, active: true, role: 'admin', updatedAt: new Date() }).where(eq(users.id, current[0].id));
  console.log(`Administrador actualizado: ${email}`);
} else {
  await db.insert(users).values({ name: 'Administrador', email, passwordHash, role: 'admin' });
  console.log(`Administrador creado: ${email}`);
}
await queryClient.end();
