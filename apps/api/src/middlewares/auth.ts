import type { RequestHandler } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
const secret = new TextEncoder().encode(env.JWT_SECRET);
export const requireAuth: RequestHandler = async (request, response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) { response.status(401).json({ error: 'Inicia sesión para continuar.' }); return; }
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: 'cellab-api', audience: 'cellab-panel' });
    request.auth = { userId: String(payload.sub), role: payload.role as 'admin' | 'technician', email: String(payload.email) };
    next();
  } catch { response.status(401).json({ error: 'La sesión expiró o no es válida.' }); }
};
export const requireRole = (...roles: Array<'admin' | 'technician'>): RequestHandler =>
  (request, response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      response.status(403).json({ error: 'Tu rol no permite realizar esta acción.' });
      return;
    }
    next();
  };
