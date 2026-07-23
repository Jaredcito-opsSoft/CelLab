import bcrypt from 'bcryptjs';
import { and, count, desc, eq, ilike, ne, or } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessMemberships, users } from '../../db/schema.js';
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
  role: businessMemberships.role,
  active: businessMemberships.active,
  lastLoginAt: users.lastLoginAt,
  createdAt: businessMemberships.createdAt,
  updatedAt: businessMemberships.updatedAt,
};

async function getBusinessUser(businessId: string, userId: string, executor: typeof db | any = db) {
  const [item] = await executor
    .select({
      ...userSelect,
      membershipId: businessMemberships.id,
      identityActive: users.active,
    })
    .from(businessMemberships)
    .innerJoin(users, eq(users.id, businessMemberships.userId))
    .where(and(
      eq(businessMemberships.businessId, businessId),
      eq(businessMemberships.userId, userId),
    ));
  return item;
}

usersRouter.get('/', asyncHandler(async (request, response) => {
  const { search, limit } = querySchema.parse(request.query);
  const items = await db
    .select(userSelect)
    .from(businessMemberships)
    .innerJoin(users, eq(users.id, businessMemberships.userId))
    .where(and(
      eq(businessMemberships.businessId, request.auth!.businessId),
      search
        ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
        : undefined,
    ))
    .orderBy(desc(businessMemberships.createdAt))
    .limit(limit);
  response.json({ items });
}));

usersRouter.post('/', asyncHandler(async (request, response) => {
  const input = createSchema.parse(request.body);
  const email = input.email.toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    throw new AppError(
      409,
      'Ya existe una identidad con ese correo.',
      'EMAIL_ALREADY_EXISTS',
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const item = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: input.name,
        email,
        passwordHash,
        role: input.role,
        active: true,
      })
      .returning({ id: users.id });
    if (!user) throw new AppError(500, 'No fue posible crear la identidad del usuario.');

    await tx.insert(businessMemberships).values({
      businessId: request.auth!.businessId,
      userId: user.id,
      role: input.role,
      active: input.active,
    });
    return getBusinessUser(request.auth!.businessId, user.id, tx);
  });

  if (!item) throw new AppError(500, 'No fue posible crear el usuario.');
  await recordAuditLog({
    actor: request.auth!,
    action: 'users.create',
    entityType: 'business_membership',
    entityId: item.membershipId,
    summary: `Usuario creado: ${item.email}`,
    metadata: {
      businessId: request.auth!.businessId,
      membershipId: item.membershipId,
      userId: item.id,
      role: item.role,
      active: item.active,
    },
  });
  const { membershipId: _membershipId, identityActive: _identityActive, ...publicItem } = item;
  response.status(201).json({ item: publicItem });
}));

usersRouter.patch('/:id', asyncHandler(async (request, response) => {
  const userId = idSchema.parse(request.params.id);
  const input = updateSchema.parse(request.body);
  const businessId = request.auth!.businessId;
  const current = await getBusinessUser(businessId, userId);
  if (!current) throw new AppError(404, 'Usuario no encontrado en este negocio.');

  if (userId === request.auth!.userId && input.active === false) {
    throw new AppError(400, 'No puedes desactivar tu propia membresía.');
  }
  if (userId === request.auth!.userId && input.role && input.role !== 'admin') {
    throw new AppError(400, 'No puedes quitarte el rol administrador.');
  }

  const removesActiveAdmin = current.active
    && current.role === 'admin'
    && (input.active === false || (input.role !== undefined && input.role !== 'admin'));
  if (removesActiveAdmin) {
    const [adminCount] = await db
      .select({ value: count() })
      .from(businessMemberships)
      .where(and(
        eq(businessMemberships.businessId, businessId),
        eq(businessMemberships.role, 'admin'),
        eq(businessMemberships.active, true),
      ));
    if ((adminCount?.value ?? 0) <= 1) {
      throw new AppError(
        409,
        'El negocio debe conservar al menos una membresía administradora activa.',
        'LAST_ACTIVE_ADMIN_REQUIRED',
      );
    }
  }

  const normalizedEmail = input.email?.toLowerCase();
  if (normalizedEmail) {
    const [duplicate] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), ne(users.id, userId)))
      .limit(1);
    if (duplicate) {
      throw new AppError(409, 'Ya existe una identidad con ese correo.', 'EMAIL_ALREADY_EXISTS');
    }
  }

  const item = await db.transaction(async (tx) => {
    const identityChanges: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) identityChanges.name = input.name;
    if (normalizedEmail !== undefined) identityChanges.email = normalizedEmail;
    if (input.role !== undefined) identityChanges.role = input.role;

    await tx.update(users).set(identityChanges).where(eq(users.id, userId));
    await tx
      .update(businessMemberships)
      .set({
        role: input.role ?? current.role,
        active: input.active ?? current.active,
        updatedAt: new Date(),
      })
      .where(and(
        eq(businessMemberships.businessId, businessId),
        eq(businessMemberships.userId, userId),
      ));
    return getBusinessUser(businessId, userId, tx);
  });

  if (!item) throw new AppError(500, 'No fue posible actualizar el usuario.');
  await recordAuditLog({
    actor: request.auth!,
    action: 'users.update',
    entityType: 'business_membership',
    entityId: item.membershipId,
    summary: `Usuario actualizado: ${item.email}`,
    metadata: {
      businessId,
      membershipId: item.membershipId,
      userId: item.id,
      changes: input,
    },
  });
  const { membershipId: _membershipId, identityActive: _identityActive, ...publicItem } = item;
  response.json({ item: publicItem });
}));

usersRouter.post('/:id/reset-password', asyncHandler(async (request, response) => {
  const userId = idSchema.parse(request.params.id);
  const input = resetPasswordSchema.parse(request.body);
  const businessId = request.auth!.businessId;
  const current = await getBusinessUser(businessId, userId);
  if (!current) throw new AppError(404, 'Usuario no encontrado en este negocio.');

  const passwordHash = await bcrypt.hash(input.password, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
  const item = await getBusinessUser(businessId, userId);
  if (!item) throw new AppError(500, 'No fue posible reiniciar la contraseña.');

  await recordAuditLog({
    actor: request.auth!,
    action: 'users.reset_password',
    entityType: 'business_membership',
    entityId: item.membershipId,
    summary: `Contraseña reiniciada para ${item.email}`,
    metadata: {
      businessId,
      membershipId: item.membershipId,
      userId: item.id,
      targetEmail: item.email,
    },
  });
  const { membershipId: _membershipId, identityActive: _identityActive, ...publicItem } = item;
  response.json({ item: publicItem });
}));
