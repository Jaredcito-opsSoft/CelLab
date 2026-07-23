import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { businessMemberships, businesses, users } from '../db/schema.js';
import { isUserRole, type UserRole } from '../lib/roles.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const requireAuth: RequestHandler = async (request, response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    response.status(401).json({ error: 'Inicia sesión para continuar.', code: 'AUTH_REQUIRED' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'cellab-api',
      audience: 'cellab-panel',
    });
    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const membershipId = typeof payload.membershipId === 'string' ? payload.membershipId : '';
    const businessId = typeof payload.businessId === 'string' ? payload.businessId : '';

    if (!userId || !membershipId || !businessId) {
      response.status(401).json({
        error: 'La sesión es anterior al contexto de negocio. Inicia sesión nuevamente.',
        code: 'TENANT_CONTEXT_REQUIRED',
      });
      return;
    }

    const [session] = await db
      .select({
        userId: users.id,
        userName: users.name,
        email: users.email,
        userActive: users.active,
        membershipId: businessMemberships.id,
        membershipRole: businessMemberships.role,
        membershipActive: businessMemberships.active,
        businessId: businesses.id,
        businessStatus: businesses.status,
      })
      .from(businessMemberships)
      .innerJoin(users, eq(users.id, businessMemberships.userId))
      .innerJoin(businesses, eq(businesses.id, businessMemberships.businessId))
      .where(and(
        eq(businessMemberships.id, membershipId),
        eq(businessMemberships.userId, userId),
        eq(businessMemberships.businessId, businessId),
      ));

    if (
      !session
      || !session.userActive
      || !session.membershipActive
      || session.businessStatus !== 'active'
      || !isUserRole(session.membershipRole)
    ) {
      response.status(401).json({
        error: 'La sesión expiró o su acceso al negocio ya no está activo.',
        code: 'SESSION_INACTIVE',
      });
      return;
    }

    request.auth = {
      userId: session.userId,
      membershipId: session.membershipId,
      businessId: session.businessId,
      role: session.membershipRole,
      email: session.email,
      name: session.userName,
    };
    next();
  } catch {
    response.status(401).json({
      error: 'La sesión expiró o no es válida.',
      code: 'INVALID_SESSION',
    });
  }
};

export const requireRole = (...roles: UserRole[]): RequestHandler =>
  (request, response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      response.status(403).json({
        error: 'Tu rol no permite realizar esta acción.',
        code: 'ROLE_FORBIDDEN',
      });
      return;
    }
    next();
  };
