import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { businessModules, businessSettings } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { businessModuleMap, businessModuleRegistry, type BusinessModuleKey } from './modules.registry.js';

type Executor = typeof db;

export async function getCurrentBusiness(executor: Executor | any = db) {
  const [business] = await executor.select({ id: businessSettings.id }).from(businessSettings).limit(1);
  if (!business) throw new AppError(409, 'Configura el negocio antes de continuar.');
  return business;
}

export async function ensureBusinessModules(businessId: string, executor: Executor | any = db) {
  const rows = await executor.select().from(businessModules).where(eq(businessModules.businessId, businessId)) as typeof businessModules.$inferSelect[];
  const existing = new Set(rows.map((row: typeof businessModules.$inferSelect) => row.moduleKey));
  const missing = businessModuleRegistry
    .filter((module) => !existing.has(module.key))
    .map((module) => ({ businessId, moduleKey: module.key, enabled: module.defaultEnabled }));

  if (missing.length) {
    await executor.insert(businessModules).values(missing).onConflictDoNothing();
  }
}

export async function listBusinessModules(executor: Executor | any = db) {
  const business = await getCurrentBusiness(executor);
  await ensureBusinessModules(business.id, executor);
  const rows = await executor.select().from(businessModules).where(eq(businessModules.businessId, business.id)) as typeof businessModules.$inferSelect[];
  const byKey = new Map(rows.map((row: typeof businessModules.$inferSelect) => [row.moduleKey, row]));
  return businessModuleRegistry.map((module) => {
    const row = byKey.get(module.key);
    return {
      ...module,
      businessId: business.id,
      enabled: row?.enabled ?? module.defaultEnabled,
      configuredByUserId: row?.configuredByUserId ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function isModuleEnabled(moduleKey: BusinessModuleKey, executor: Executor | any = db) {
  const modules = await listBusinessModules(executor);
  return modules.find((module) => module.key === moduleKey)?.enabled ?? false;
}

export async function assertModuleEnabled(moduleKey: BusinessModuleKey, executor: Executor | any = db) {
  if (!(await isModuleEnabled(moduleKey, executor))) {
    const label = businessModuleMap.get(moduleKey)?.label.toLowerCase() ?? moduleKey;
    throw new AppError(403, `Este modulo no esta activado para este negocio: ${label}.`, 'MODULE_DISABLED');
  }
}

export async function updateBusinessModule(moduleKey: BusinessModuleKey, enabled: boolean, userId: string) {
  const meta = businessModuleMap.get(moduleKey);
  if (!meta) throw new AppError(404, 'Modulo no encontrado.');
  if (meta.isCore && !enabled) throw new AppError(400, 'Los modulos base no se pueden desactivar.');

  const business = await getCurrentBusiness();
  await ensureBusinessModules(business.id);
  const modules = await listBusinessModules();
  const enabledMap = new Map(modules.map((module) => [module.key, module.enabled]));

  if (enabled) {
    const missingDependencies = (meta.dependsOn ?? []).filter((dependency) => !enabledMap.get(dependency));
    if (missingDependencies.length) {
      const labels = missingDependencies.map((dependency) => businessModuleMap.get(dependency)?.label ?? dependency).join(', ');
      throw new AppError(409, `${meta.label} requiere activar primero: ${labels}.`);
    }
  } else {
    const blockers = businessModuleRegistry.filter((module) => module.dependsOn?.includes(moduleKey) && enabledMap.get(module.key));
    if (blockers.length) {
      throw new AppError(409, `No puedes desactivar ${meta.label} mientras este activo: ${blockers.map((module) => module.label).join(', ')}.`);
    }
  }

  const [updated] = await db.update(businessModules)
    .set({ enabled, configuredByUserId: userId, updatedAt: new Date() })
    .where(and(eq(businessModules.businessId, business.id), eq(businessModules.moduleKey, moduleKey)))
    .returning();

  if (!updated) throw new AppError(500, 'No fue posible actualizar el modulo.');
  return { ...meta, businessId: business.id, enabled: updated.enabled, configuredByUserId: updated.configuredByUserId, updatedAt: updated.updatedAt };
}

export async function readEnabledModules(moduleKeys: BusinessModuleKey[]) {
  const business = await getCurrentBusiness();
  await ensureBusinessModules(business.id);
  const rows = await db.select({ moduleKey: businessModules.moduleKey, enabled: businessModules.enabled })
    .from(businessModules)
    .where(and(eq(businessModules.businessId, business.id), inArray(businessModules.moduleKey, moduleKeys)));
  return new Map(rows.map((row) => [row.moduleKey as BusinessModuleKey, row.enabled]));
}
