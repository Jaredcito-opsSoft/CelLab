import { eq } from 'drizzle-orm';
import type { RequestHandler } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { isUserRole, type UserRole } from '../lib/roles.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const requireAuth: RequestHandler = async (request, response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    response.status(401).json({ error: 'Inicia sesión para continuar.' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, secret, { issuer: 'cellab-api', audience: 'cellab-panel' });
    const userId = String(payload.sub ?? '');
    const [user] = await db.select({ id: users.id, email: users.email, role: users.role, active: users.active }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user?.active || !isUserRole(user.role)) {
      response.status(401).json({ error: 'La sesión expiró o la cuenta ya no está activa.' });
      return;
    }

    request.auth = { userId: user.id, role: user.role, email: user.email };
    next();
  } catch {
    response.status(401).json({ error: 'La sesión expiró o no es válida.' });
  }
};

export const requireRole = (...roles: UserRole[]): RequestHandler =>
  (request, response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      response.status(403).json({ error: 'Tu rol no permite realizar esta acción.' });
      return;
    }
    next();
  };
