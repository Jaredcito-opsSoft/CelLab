import { db } from '../db/client.js';
import { auditLogs } from '../db/schema.js';
import type { UserRole } from './roles.js';

type AuditActor = {
  userId: string;
  email: string;
  role: UserRole;
};

type AuditInput = {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AuditExecutor = Pick<typeof db, 'insert'>;

export async function recordAuditLog(input: AuditInput, executor: AuditExecutor = db) {
  await executor.insert(auditLogs).values({
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
    actorRole: input.actor.role,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary ?? null,
    metadata: input.metadata ?? null,
  });
}
