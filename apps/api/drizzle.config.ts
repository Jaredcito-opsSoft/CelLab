import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

for (const envPath of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  if (existsSync(envPath)) config({ path: envPath, override: false });
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria.');
export default defineConfig({ dialect: 'postgresql', schema: './src/db/schema.ts', out: './drizzle', dbCredentials: { url: process.env.DATABASE_URL }, strict: true });