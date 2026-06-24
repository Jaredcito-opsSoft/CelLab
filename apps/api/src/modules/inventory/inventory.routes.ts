import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, inventoryMovements, products, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { AppError } from '../../lib/errors.js';
import { requireAuth } from '../../middlewares/auth.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);
const querySchema = z.object({ productId: z.string().uuid().optional(), type: z.enum(['sale','sale_cancel','stock_entry','manual_adjustment']).optional(), limit: z.coerce.number().int().min(1).max(200).default(100) });

inventoryRouter.get('/', asyncHandler(async (request, response) => {
  const query = querySchema.parse(request.query);
  const [business] = await db.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'La configuración del negocio no existe.');
  const items = await db.select({
    id: inventoryMovements.id, productId: inventoryMovements.productId, productName: products.name,
    userId: inventoryMovements.userId, userName: users.name, type: inventoryMovements.type,
    quantity: inventoryMovements.quantity, previousStock: inventoryMovements.previousStock,
    newStock: inventoryMovements.newStock, referenceType: inventoryMovements.referenceType,
    referenceId: inventoryMovements.referenceId, notes: inventoryMovements.notes, createdAt: inventoryMovements.createdAt,
  }).from(inventoryMovements)
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .innerJoin(users, eq(inventoryMovements.userId, users.id))
    .where(and(eq(inventoryMovements.businessId, business.id), query.productId ? eq(inventoryMovements.productId, query.productId) : undefined, query.type ? eq(inventoryMovements.type, query.type) : undefined))
    .orderBy(desc(inventoryMovements.createdAt)).limit(query.limit);
  response.json({ items });
}));
