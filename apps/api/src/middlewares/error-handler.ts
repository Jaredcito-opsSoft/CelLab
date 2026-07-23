import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Datos inválidos.', details: error.flatten().fieldErrors, requestId: request.requestId });
    return;
  }
  if (error instanceof AppError) {
    response.status(error.status).json({ error: error.message, code: error.code, requestId: request.requestId });
    return;
  }
  logger.error('unhandled_request_error', { requestId: request.requestId, error });
  response.status(500).json({ error: 'Ocurrió un error interno.', requestId: request.requestId });
};
