import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) { response.status(400).json({ error: 'Datos inválidos.', details: error.flatten().fieldErrors }); return; }
  if (error instanceof AppError) { response.status(error.status).json({ error: error.message, code: error.code }); return; }
  console.error(error);
  response.status(500).json({ error: 'Ocurrió un error interno.' });
};
