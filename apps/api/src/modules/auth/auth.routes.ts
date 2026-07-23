import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { users } from '../../db/schema.js';
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
  const [user] = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
  if (!user || !user.active || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
  }

  const now = new Date();
  await db.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, user.id));
  const token = await new SignJWT({ role: user.role, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer('cellab-api')
    .setAudience('cellab-panel')
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);

  response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, lastLoginAt: now } });
}));

authRouter.get('/session', requireAuth, asyncHandler(async (request, response) => {
  const [user] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    active: users.active,
    lastLoginAt: users.lastLoginAt,
  }).from(users).where(eq(users.id, request.auth!.userId)).limit(1);
  if (!user?.active) throw new AppError(401, 'La cuenta ya no está activa.');
  response.json({ user });
}));
