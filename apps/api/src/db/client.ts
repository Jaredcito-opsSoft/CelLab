import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';
export const queryClient = postgres(env.DATABASE_URL, { max: env.DB_POOL_MAX, prepare: false });
export const db = drizzle(queryClient, { schema });
