import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { sql } from 'drizzle-orm';
import { env } from './config/env.js';
import { db, queryClient } from './db/client.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middlewares/error-handler.js';
import { requestContext } from './middlewares/request-context.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { operationsRouter } from './modules/operations/operations.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { businessSettingsRouter } from './modules/settings/business-settings.routes.js';
import { salesRouter } from './modules/sales/sales.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { cashRouter } from './modules/cash/cash.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { modulesRouter } from './modules/modules/modules.routes.js';
import { suppliersRouter } from './modules/suppliers/suppliers.routes.js';
import { purchasesRouter } from './modules/purchases/purchases.routes.js';
import { inventoryCatalogRouter } from './modules/inventory/catalog.routes.js';
import { warrantiesRouter } from './modules/warranties/warranties.routes.js';
import { layawaysRouter } from './modules/layaways/layaways.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: env.APP_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(requestContext);

const healthPayload = () => ({
  status: 'ok',
  service: 'localpos-api',
  version: env.RELEASE_VERSION,
  uptimeSeconds: Math.floor(process.uptime()),
});

app.get(['/health', '/health/live'], (_request, response) => response.json(healthPayload()));
app.get('/health/ready', async (request, response) => {
  try {
    await Promise.race([
      db.execute(sql`select 1 as ready`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('readiness_timeout')), 3000)),
    ]);
    response.json({ ...healthPayload(), database: 'ready' });
  } catch (error) {
    logger.warn('readiness_failed', { requestId: request.requestId, error });
    response.status(503).json({ status: 'unavailable', service: 'localpos-api', database: 'unavailable', requestId: request.requestId });
  }
});
app.use('/api/public', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api/operations/business-settings', businessSettingsRouter);
app.use('/api/operations/sales', salesRouter);
app.use('/api/operations/inventory', inventoryRouter);
app.use('/api/operations/inventory-movements', inventoryRouter);
app.use('/api/operations/cash', cashRouter);
app.use('/api/operations/users', usersRouter);
app.use('/api/operations/audit-logs', auditRouter);
app.use('/api/operations/modules', modulesRouter);
app.use('/api/operations/suppliers', suppliersRouter);
app.use('/api/operations/purchases', purchasesRouter);
app.use('/api/operations/warranties', warrantiesRouter);
app.use('/api/operations/layaways', layawaysRouter);
app.use('/api/operations/reports', reportsRouter);
app.use('/api/operations', inventoryCatalogRouter);
app.use('/api/operations', operationsRouter);
app.use(errorHandler);

const server = app.listen(env.PORT, () => logger.info('api_started', {
  port: env.PORT,
  environment: env.NODE_ENV,
  version: env.RELEASE_VERSION,
  poolMax: env.DB_POOL_MAX,
}));

let shuttingDown = false;
async function shutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('api_shutdown_started', { signal });
  const forceTimer = setTimeout(() => {
    logger.error('api_shutdown_timeout', { timeoutMs: env.SHUTDOWN_TIMEOUT_MS });
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();
  server.close(async (error) => {
    if (error) logger.error('http_server_close_failed', { error });
    try {
      await queryClient.end({ timeout: 5 });
    } catch (databaseError) {
      logger.error('database_pool_close_failed', { error: databaseError });
      exitCode = 1;
    }
    clearTimeout(forceTimer);
    logger.info('api_shutdown_completed', { exitCode });
    process.exit(exitCode);
  });
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (error) => logger.error('unhandled_rejection', { error }));
process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error });
  void shutdown('uncaughtException', 1);
});
