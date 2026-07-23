import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businesses, businessSettings } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
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
  requireOpenCashForMoneyOperations: z.boolean(),
  timezone: z.string().trim().min(3).max(80).default('America/Mexico_City'),
});

businessSettingsRouter.get('/', asyncHandler(async (request, response) => {
  const [item] = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.id, request.auth!.businessId));
  if (!item) {
    throw new AppError(
      404,
      'La configuración del negocio aún no existe. Ejecuta el seed inicial.',
      'BUSINESS_SETTINGS_NOT_FOUND',
    );
  }
  response.json({ item });
}));

businessSettingsRouter.patch(
  '/',
  requireRole(...roleGroups.adminOnly),
  asyncHandler(async (request, response) => {
    const input = inputSchema.partial().parse(request.body);
    const businessId = request.auth!.businessId;
    const item = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ id: businessSettings.id })
        .from(businessSettings)
        .where(eq(businessSettings.id, businessId));
      if (!current) {
        throw new AppError(
          404,
          'La configuración del negocio aún no existe. Ejecuta el seed inicial.',
          'BUSINESS_SETTINGS_NOT_FOUND',
        );
      }

      const now = new Date();
      if (input.businessName !== undefined) {
        await tx
          .update(businesses)
          .set({ name: input.businessName, updatedAt: now })
          .where(eq(businesses.id, businessId));
      }

      const [updated] = await tx
        .update(businessSettings)
        .set({ ...input, updatedAt: now })
        .where(eq(businessSettings.id, businessId))
        .returning();
      return updated;
    });

    if (!item) throw new AppError(500, 'No fue posible actualizar la configuración.');
    await recordAuditLog({
      actor: request.auth!,
      action: 'settings.update',
      entityType: 'business_settings',
      entityId: item.id,
      summary: 'Configuración del negocio actualizada',
      metadata: {
        businessId,
        membershipId: request.auth!.membershipId,
        changes: input,
      },
    });
    response.json({ item });
  }),
);
