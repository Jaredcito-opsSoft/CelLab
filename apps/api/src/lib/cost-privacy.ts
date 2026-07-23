import type { UserRole } from './roles.js';

const sensitiveCostFields = [
  'costCents',
  'costCentsSnapshot',
  'costTotalCents',
  'grossProfitCents',
  'grossMarginBps',
] as const;

export function canAccessCosts(role: UserRole) {
  return role === 'admin' || role === 'manager';
}

export function withoutSensitiveCosts<T extends object>(row: T) {
  const safe = { ...row } as Record<string, unknown>;
  for (const field of sensitiveCostFields) delete safe[field];
  return safe;
}
