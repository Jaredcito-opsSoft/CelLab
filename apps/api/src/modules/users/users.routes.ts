import bcrypt from 'bcryptjs';
import { desc, eq, ilike, or } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { users } from '../../db/schema.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { recordAuditLog } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { roleGroups, userRoles } from '../../lib/roles.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole(...roleGroups.adminOnly));

const idSchema = z.string().uuid();
const roleSchema = z.enum(userRoles);
const querySchema = z.object({
  search: z.string().trim().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(120),
  role: roleSchema.default('staff'),
  active: z.boolean().default(true),
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(180).optional(),
  role: roleSchema.optional(),
  active: z.boolean().optional(),
});
const resetPasswordSchema = z.object({ password: z.string().min(8).max(120) });

const userSelect = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  active: users.active,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

usersRouter.get('/', asyncHandler(async (request, response) => {
  const { search, limit } = querySchema.parse(request.query);
  const items = await db.select(userSelect).from(users)
    .where(search ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit);
  response.json({ items });
}));

usersRouter.post('/', asyncHandler(async (request, response) => {
  const input = createSchema.parse(request.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const [item] = await db.insert(users).values({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: input.role,
    active: input.active,
  }).returning(userSelect);
  if (!item) throw new AppError(500, 'No fue posible crear el usuario.');
  await recordAuditLog({
    actor: request.auth!,
    action: 'users.create',
    entityType: 'user',
    entityId: item.id,
    summary: `Usuario creado: ${item.email}`,
    metadata: { role: item.role, active: item.active },
  });
  response.status(201).json({ item });
}));

usersRouter.patch('/:id', asyncHandler(async (request, response) => {
  const userId = idSchema.parse(request.params.id);
  const input = updateSchema.parse(request.body);
  if (userId === request.auth!.userId && input.active === false) throw new AppError(400, 'No puedes desactivar tu propia cuenta.');
  if (userId === request.auth!.userId && input.role && input.role !== 'admin') throw new AppError(400, 'No puedes quitarte el rol administrador.');

  const values = { ...input, email: input.email?.toLowerCase(), updatedAt: new Date() };
  const [item] = await db.update(users).set(values).where(eq(users.id, userId)).returning(userSelect);
  if (!item) throw new AppError(404, 'Usuario no encontrado.');
  await recordAuditLog({
    actor: request.auth!,
    action: 'users.update',
    entityType: 'user',
    entityId: item.id,
    summary: `Usuario actualizado: ${item.email}`,
    metadata: input,
  });
  response.json({ item });
}));

usersRouter.post('/:id/reset-password', asyncHandler(async (request, response) => {
  const userId = idSchema.parse(request.params.id);
  const input = resetPasswordSchema.parse(request.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const [item] = await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId)).returning(userSelect);
  if (!item) throw new AppError(404, 'Usuario no encontrado.');
  await recordAuditLog({
    actor: request.auth!,
    action: 'users.reset_password',
    entityType: 'user',
    entityId: item.id,
    summary: `Contraseña reiniciada para ${item.email}`,
    metadata: { targetEmail: item.email },
  });
  response.json({ item });
}));
