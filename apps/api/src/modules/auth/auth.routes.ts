import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { businessMemberships, businesses, users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { AppError } from '../../lib/errors.js';
import { requireAuth } from '../../middlewares/auth.js';

export const authRouter = Router();

const secret = new TextEncoder().encode(env.JWT_SECRET);
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV !== 'production' && env.SMOKE_TEST_MODE,
});

authRouter.post('/login', limiter, asyncHandler(async (request, response) => {
  const input = loginSchema.parse(request.body);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .limit(1);

  if (!user || !user.active || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
  }

  const memberships = await db
    .select({
      membershipId: businessMemberships.id,
      membershipRole: businessMemberships.role,
      businessId: businesses.id,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessStatus: businesses.status,
    })
    .from(businessMemberships)
    .innerJoin(businesses, eq(businesses.id, businessMemberships.businessId))
    .where(and(
      eq(businessMemberships.userId, user.id),
      eq(businessMemberships.active, true),
      eq(businesses.status, 'active'),
    ));

  if (memberships.length === 0) {
    throw new AppError(
      403,
      'La cuenta no tiene una membresía activa en un negocio.',
      'NO_ACTIVE_BUSINESS_MEMBERSHIP',
    );
  }
  if (memberships.length > 1) {
    throw new AppError(
      409,
      'La cuenta pertenece a más de un negocio activo. La selección de negocio aún no está disponible.',
      'MULTIPLE_BUSINESSES_NOT_SUPPORTED',
    );
  }

  const [membership] = memberships;
  if (!membership) {
    throw new AppError(
      403,
      'La cuenta no tiene una membresía activa en un negocio.',
      'NO_ACTIVE_BUSINESS_MEMBERSHIP',
    );
  }
  const now = new Date();
  await db.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, user.id));

  const token = await new SignJWT({
    membershipId: membership.membershipId,
    businessId: membership.businessId,
    sessionVersion: user.sessionVersion,
    role: membership.membershipRole,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer('cellab-api')
    .setAudience('cellab-panel')
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);

  response.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: membership.membershipRole,
      lastLoginAt: now,
    },
    membership: {
      id: membership.membershipId,
      role: membership.membershipRole,
      active: true,
    },
    business: {
      id: membership.businessId,
      name: membership.businessName,
      slug: membership.businessSlug,
      status: membership.businessStatus,
    },
  });
}));

authRouter.get('/session', requireAuth, asyncHandler(async (request, response) => {
  const auth = request.auth!;
  const [session] = await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userActive: users.active,
      lastLoginAt: users.lastLoginAt,
      membershipId: businessMemberships.id,
      membershipRole: businessMemberships.role,
      membershipActive: businessMemberships.active,
      businessId: businesses.id,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessStatus: businesses.status,
    })
    .from(businessMemberships)
    .innerJoin(users, eq(users.id, businessMemberships.userId))
    .innerJoin(businesses, eq(businesses.id, businessMemberships.businessId))
    .where(and(
      eq(businessMemberships.id, auth.membershipId),
      eq(users.id, auth.userId),
      eq(businesses.id, auth.businessId),
    ));

  if (
    !session
    || !session.userActive
    || !session.membershipActive
    || session.businessStatus !== 'active'
  ) {
    throw new AppError(401, 'La sesión ya no está activa.', 'SESSION_INACTIVE');
  }

  response.json({
    user: {
      id: session.userId,
      name: session.userName,
      email: session.userEmail,
      role: session.membershipRole,
      active: session.userActive,
      lastLoginAt: session.lastLoginAt,
    },
    membership: {
      id: session.membershipId,
      role: session.membershipRole,
      active: session.membershipActive,
    },
    business: {
      id: session.businessId,
      name: session.businessName,
      slug: session.businessSlug,
      status: session.businessStatus,
    },
  });
}));
