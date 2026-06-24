import 'dotenv/config';
import { z } from 'zod';
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(10).optional(),
});
const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Configuración inválida', result.error.flatten().fieldErrors);
  throw new Error('No fue posible iniciar la API: revisa las variables de entorno.');
}
export const env = result.data;
