import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { AppError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

export const businessSettingsRouter = Router();
businessSettingsRouter.use(requireAuth);

const inputSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  businessType: z.string().trim().min(2).max(160),
  logoUrl: z.string().url().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  ticketMessage: z.string().trim().max(1000).nullable().optional(),
  warrantyMessage: z.string().trim().max(2000).nullable().optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Usa un color hexadecimal de seis dígitos.'),
});

businessSettingsRouter.get('/', asyncHandler(async (_request, response) => {
  const [item] = await db.select().from(businessSettings).limit(1);
  if (!item) throw new AppError(404, 'La configuración del negocio aún no existe. Ejecuta el seed inicial.');
  response.json({ item });
}));

businessSettingsRouter.patch('/', requireRole('admin'), asyncHandler(async (request, response) => {
  const [current] = await db.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!current) throw new AppError(404, 'La configuración del negocio aún no existe. Ejecuta el seed inicial.');
  const input = inputSchema.partial().parse(request.body);
  const [item] = await db.update(businessSettings).set({ ...input, updatedAt: new Date() }).where(eq(businessSettings.id, current.id)).returning();
  response.json({ item });
}));
