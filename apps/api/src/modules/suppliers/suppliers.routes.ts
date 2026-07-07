import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { suppliers } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requireModule } from '../../middlewares/modules.js';

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth, requireModule('suppliers'));

const supplierInput = z.object({
  name: z.string().trim().min(2).max(160),
  contactName: z.string().trim().max(140).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().default(true),
});
const queryInput = z.object({ search: z.string().trim().max(100).default(''), includeInactive: z.coerce.boolean().default(false), limit: z.coerce.number().int().min(1).max(100).default(80) });
const id = z.string().uuid();

suppliersRouter.get('/', asyncHandler(async (request, response) => {
  const query = queryInput.parse(request.query);
  const items = await db.select().from(suppliers).where(and(
    isNull(suppliers.deletedAt),
    query.includeInactive ? undefined : eq(suppliers.active, true),
    query.search ? or(ilike(suppliers.name, `%${query.search}%`), ilike(suppliers.phone, `%${query.search}%`), ilike(suppliers.contactName, `%${query.search}%`)) : undefined,
  )).orderBy(desc(suppliers.createdAt)).limit(query.limit);

  response.json({ items });
}));

suppliersRouter.post('/', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const input = supplierInput.parse(request.body);
  const [item] = await db.insert(suppliers).values(input).returning();
  if (!item) throw new AppError(500, 'No fue posible registrar el proveedor.');

  await recordAuditLog({
    actor: request.auth!,
    action: 'supplier.created',
    entityType: 'supplier',
    entityId: item.id,
    summary: `Proveedor creado: ${item.name}`,
    metadata: { phone: item.phone, email: item.email },
  });

  response.status(201).json({ item });
}));

suppliersRouter.patch('/:id', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const supplierId = id.parse(request.params.id);
  const input = supplierInput.partial().parse(request.body);
  const [item] = await db.update(suppliers)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(suppliers.id, supplierId), isNull(suppliers.deletedAt)))
    .returning();
  if (!item) throw new AppError(404, 'Proveedor no encontrado.');

  await recordAuditLog({
    actor: request.auth!,
    action: 'supplier.updated',
    entityType: 'supplier',
    entityId: item.id,
    summary: `Proveedor actualizado: ${item.name}`,
    metadata: input,
  });

  response.json({ item });
}));

suppliersRouter.delete('/:id', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const supplierId = id.parse(request.params.id);
  const [item] = await db.update(suppliers)
    .set({ active: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(suppliers.id, supplierId), isNull(suppliers.deletedAt)))
    .returning({ id: suppliers.id, name: suppliers.name });
  if (!item) throw new AppError(404, 'Proveedor no encontrado.');

  await recordAuditLog({
    actor: request.auth!,
    action: 'supplier.archived',
    entityType: 'supplier',
    entityId: item.id,
    summary: `Proveedor archivado: ${item.name}`,
  });

  response.status(204).send();
}));
