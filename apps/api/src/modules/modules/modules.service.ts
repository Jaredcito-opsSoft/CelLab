import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { businessModules } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import {
  businessModuleMap,
  businessModuleRegistry,
  type BusinessModuleKey,
} from './modules.registry.js';

type Executor = typeof db;

export async function ensureBusinessModules(
  businessId: string,
  executor: Executor | any = db,
) {
  const rows = await executor
    .select()
    .from(businessModules)
    .where(eq(businessModules.businessId, businessId)) as typeof businessModules.$inferSelect[];
  const existing = new Set(rows.map((row) => row.moduleKey));
  const missing = businessModuleRegistry
    .filter((module) => !existing.has(module.key))
    .map((module) => ({
      businessId,
      moduleKey: module.key,
      enabled: module.defaultEnabled,
    }));

  if (missing.length) {
    await executor.insert(businessModules).values(missing).onConflictDoNothing();
  }
}

export async function listBusinessModules(
  businessId: string,
  executor: Executor | any = db,
) {
  await ensureBusinessModules(businessId, executor);
  const rows = await executor
    .select()
    .from(businessModules)
    .where(eq(businessModules.businessId, businessId)) as typeof businessModules.$inferSelect[];
  const byKey = new Map(rows.map((row) => [row.moduleKey, row]));

  return businessModuleRegistry.map((module) => {
    const row = byKey.get(module.key);
    return {
      ...module,
      businessId,
      enabled: row?.enabled ?? module.defaultEnabled,
      configuredByUserId: row?.configuredByUserId ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function isModuleEnabled(
  businessId: string,
  moduleKey: BusinessModuleKey,
  executor: Executor | any = db,
) {
  const modules = await listBusinessModules(businessId, executor);
  return modules.find((module) => module.key === moduleKey)?.enabled ?? false;
}

export async function assertModuleEnabled(
  businessId: string,
  moduleKey: BusinessModuleKey,
  executor: Executor | any = db,
) {
  if (!(await isModuleEnabled(businessId, moduleKey, executor))) {
    const label = businessModuleMap.get(moduleKey)?.label.toLowerCase() ?? moduleKey;
    throw new AppError(
      403,
      `Este módulo no está activado para este negocio: ${label}.`,
      'MODULE_DISABLED',
    );
  }
}

export async function updateBusinessModule(
  businessId: string,
  moduleKey: BusinessModuleKey,
  enabled: boolean,
  userId: string,
) {
  const meta = businessModuleMap.get(moduleKey);
  if (!meta) throw new AppError(404, 'Módulo no encontrado.');
  if (meta.isCore && !enabled) {
    throw new AppError(400, 'Los módulos base no se pueden desactivar.');
  }

  await ensureBusinessModules(businessId);
  const modules = await listBusinessModules(businessId);
  const enabledMap = new Map(modules.map((module) => [module.key, module.enabled]));

  if (enabled) {
    const missingDependencies = (meta.dependsOn ?? [])
      .filter((dependency) => !enabledMap.get(dependency));
    if (missingDependencies.length) {
      const labels = missingDependencies
        .map((dependency) => businessModuleMap.get(dependency)?.label ?? dependency)
        .join(', ');
      throw new AppError(409, `${meta.label} requiere activar primero: ${labels}.`);
    }
  } else {
    const blockers = businessModuleRegistry.filter(
      (module) => module.dependsOn?.includes(moduleKey) && enabledMap.get(module.key),
    );
    if (blockers.length) {
      throw new AppError(
        409,
        `No puedes desactivar ${meta.label} mientras esté activo: ${blockers
          .map((module) => module.label)
          .join(', ')}.`,
      );
    }
  }

  const [updated] = await db
    .update(businessModules)
    .set({ enabled, configuredByUserId: userId, updatedAt: new Date() })
    .where(and(
      eq(businessModules.businessId, businessId),
      eq(businessModules.moduleKey, moduleKey),
    ))
    .returning();

  if (!updated) throw new AppError(500, 'No fue posible actualizar el módulo.');
  return {
    ...meta,
    businessId,
    enabled: updated.enabled,
    configuredByUserId: updated.configuredByUserId,
    updatedAt: updated.updatedAt,
  };
}

export async function readEnabledModules(
  businessId: string,
  moduleKeys: BusinessModuleKey[],
) {
  await ensureBusinessModules(businessId);
  const rows = await db
    .select({ moduleKey: businessModules.moduleKey, enabled: businessModules.enabled })
    .from(businessModules)
    .where(and(
      eq(businessModules.businessId, businessId),
      inArray(businessModules.moduleKey, moduleKeys),
    ));
  return new Map(rows.map((row) => [row.moduleKey as BusinessModuleKey, row.enabled]));
}
