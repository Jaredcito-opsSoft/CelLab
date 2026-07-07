import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { auditLogs } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole(...roleGroups.adminOnly));

const querySchema = z.object({
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(80).optional(),
  actorUserId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(80),
});

auditRouter.get('/', asyncHandler(async (request, response) => {
  const query = querySchema.parse(request.query);
  const items = await db.select().from(auditLogs)
    .where(and(
      query.action ? eq(auditLogs.action, query.action) : undefined,
      query.entityType ? eq(auditLogs.entityType, query.entityType) : undefined,
      query.actorUserId ? eq(auditLogs.actorUserId, query.actorUserId) : undefined,
    ))
    .orderBy(desc(auditLogs.createdAt))
    .limit(query.limit);
  response.json({ items });
}));
