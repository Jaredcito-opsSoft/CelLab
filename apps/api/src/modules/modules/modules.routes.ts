import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { businessModuleMap, isBusinessModuleKey } from './modules.registry.js';
import { listBusinessModules, updateBusinessModule } from './modules.service.js';

export const modulesRouter = Router();
modulesRouter.use(requireAuth);

const updateInput = z.object({ enabled: z.boolean() });

modulesRouter.get('/', asyncHandler(async (_request, response) => {
  response.json({ items: await listBusinessModules() });
}));

modulesRouter.patch('/:moduleKey', requireRole(...roleGroups.managers), asyncHandler(async (request, response) => {
  const moduleKey = String(request.params.moduleKey ?? '');
  if (!isBusinessModuleKey(moduleKey)) throw new AppError(404, 'Modulo no encontrado.');

  const input = updateInput.parse(request.body);
  const item = await updateBusinessModule(moduleKey, input.enabled, request.auth!.userId);
  const meta = businessModuleMap.get(moduleKey)!;

  await recordAuditLog({
    actor: request.auth!,
    action: input.enabled ? 'module.enabled' : 'module.disabled',
    entityType: 'business_module',
    entityId: moduleKey,
    summary: `${input.enabled ? 'Modulo activado' : 'Modulo desactivado'}: ${meta.label}`,
    metadata: { moduleKey, enabled: input.enabled },
  });

  response.json({ item });
}));
