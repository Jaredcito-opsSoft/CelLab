import type { UserRole } from '../lib/roles.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        membershipId: string;
        businessId: string;
        role: UserRole;
        email: string;
        name: string;
      };
    }
  }
}

export {};
