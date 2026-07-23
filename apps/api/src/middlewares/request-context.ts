import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../lib/logger.js';

export const requestContext: RequestHandler = (request, response, next) => {
  const suppliedId = request.header('x-request-id')?.trim();
  request.requestId = suppliedId && suppliedId.length <= 128 ? suppliedId : randomUUID();
  response.setHeader('x-request-id', request.requestId);
  const startedAt = performance.now();
  response.on('finish', () => logger.info('http_request', {
    requestId: request.requestId,
    method: request.method,
    path: request.path,
    status: response.statusCode,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    userId: request.auth?.userId,
  }));
  next();
};
