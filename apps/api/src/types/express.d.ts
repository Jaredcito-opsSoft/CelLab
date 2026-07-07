import type { UserRole } from '../lib/roles.js';

declare global { namespace Express { interface Request { auth?: { userId: string; role: UserRole; email: string }; } } }
export {};
