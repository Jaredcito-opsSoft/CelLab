import { and, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
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
  search: z.string().trim().max(120).optional(),
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(80).optional(),
  actorUserId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(80),
});

auditRouter.get('/', asyncHandler(async (request, response) => {
  const query = querySchema.parse(request.query);
  const items = await db.select({
    id: auditLogs.id,
    actorUserId: auditLogs.actorUserId,
    actorEmail: auditLogs.actorEmail,
    actorRole: auditLogs.actorRole,
    action: auditLogs.action,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    summary: auditLogs.summary,
    metadata: auditLogs.metadata,
    createdAt: auditLogs.createdAt,
  }).from(auditLogs)
    .where(and(
      query.search ? or(
        ilike(auditLogs.action, `%${query.search}%`),
        ilike(auditLogs.entityType, `%${query.search}%`),
        ilike(auditLogs.actorEmail, `%${query.search}%`),
        ilike(auditLogs.summary, `%${query.search}%`),
      ) : undefined,
      query.action ? eq(auditLogs.action, query.action) : undefined,
      query.entityType ? eq(auditLogs.entityType, query.entityType) : undefined,
      query.actorUserId ? eq(auditLogs.actorUserId, query.actorUserId) : undefined,
      query.from ? gte(auditLogs.createdAt, new Date(query.from)) : undefined,
      query.to ? lte(auditLogs.createdAt, new Date(query.to)) : undefined,
    ))
    .orderBy(desc(auditLogs.createdAt))
    .limit(query.limit);
  response.json({ items });
}));
