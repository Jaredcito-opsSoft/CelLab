export const userRoles = ['admin', 'manager', 'staff', 'technician', 'viewer'] as const;
export type UserRole = typeof userRoles[number];

export const roleGroups = {
  adminOnly: ['admin'],
  managers: ['admin', 'manager'],
  staff: ['admin', 'manager', 'staff'],
  workshop: ['admin', 'manager', 'staff', 'technician'],
  inventory: ['admin', 'manager'],
  cash: ['admin', 'manager'],
  readers: ['admin', 'manager', 'staff', 'technician', 'viewer'],
} satisfies Record<string, readonly UserRole[]>;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && userRoles.includes(value as UserRole);
}
