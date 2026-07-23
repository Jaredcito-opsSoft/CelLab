import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import {
  isBusinessModuleKey,
  type BusinessModuleKey,
} from '../modules/modules/modules.registry.js';
import { assertModuleEnabled } from '../modules/modules/modules.service.js';

export function requireModule(moduleKey: BusinessModuleKey): RequestHandler {
  return async (request, _response, next) => {
    if (!isBusinessModuleKey(moduleKey)) {
      next(new AppError(500, 'Módulo interno no registrado.'));
      return;
    }
    if (!request.auth) {
      next(new AppError(401, 'Inicia sesión para continuar.', 'AUTH_REQUIRED'));
      return;
    }

    try {
      await assertModuleEnabled(request.auth.businessId, moduleKey);
      next();
    } catch (error) {
      next(error);
    }
  };
}
