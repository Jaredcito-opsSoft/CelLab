import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { isBusinessModuleKey, type BusinessModuleKey } from '../modules/modules/modules.registry.js';
import { assertModuleEnabled } from '../modules/modules/modules.service.js';

export function requireModule(moduleKey: BusinessModuleKey): RequestHandler {
  return async (_request, _response, next) => {
    if (!isBusinessModuleKey(moduleKey)) {
      next(new AppError(500, 'Módulo interno no registrado.'));
      return;
    }

    try {
      await assertModuleEnabled(moduleKey);
      next();
    } catch (error) {
      next(error);
    }
  };
}
