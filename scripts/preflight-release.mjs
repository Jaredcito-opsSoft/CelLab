import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || line.trimStart().startsWith('#')) return [];
    return [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]];
  }));
}

const values = { ...readEnvFile(resolve('.env')), ...process.env };
const strict = process.argv.includes('--strict');
const failures = [];
const warnings = [];
const passes = [];
const pass = (message) => passes.push(message);
const warn = (message) => warnings.push(message);
const fail = (message) => failures.push(message);

function validUrl(name, { https = false } = {}) {
  const raw = values[name];
  if (!raw) return fail(`${name} no está definida.`);
  try {
    const url = new URL(raw);
    if (https && url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) fail(`${name} debe usar HTTPS fuera de local.`);
    else pass(`${name} tiene formato válido.`);
  } catch { fail(`${name} no es una URL válida.`); }
}

if (values.NODE_ENV === 'production') pass('NODE_ENV=production.');
else (strict ? fail : warn)('NODE_ENV no está en production.');
validUrl('APP_URL', { https: true });
validUrl('VITE_API_URL', { https: true });
validUrl('DATABASE_URL');

if ((values.JWT_SECRET ?? '').length >= 32 && !/change_this|localpos|secret/i.test(values.JWT_SECRET)) pass('JWT_SECRET tiene longitud y apariencia adecuadas.');
else fail('JWT_SECRET debe ser aleatorio, tener 32+ caracteres y no usar el valor de ejemplo.');

const databaseUrl = values.DATABASE_URL ?? '';
if (/sslmode=require|ssl=true/i.test(databaseUrl)) pass('DATABASE_URL exige TLS.');
else (strict ? fail : warn)('DATABASE_URL no declara sslmode=require; confírmalo con el proveedor.');

const poolMax = Number(values.DB_POOL_MAX ?? 5);
if (Number.isInteger(poolMax) && poolMax >= 1 && poolMax <= 20) pass(`DB_POOL_MAX=${poolMax} está dentro del límite admitido.`);
else fail('DB_POOL_MAX debe ser entero entre 1 y 20.');

if (values.ADMIN_PASSWORD) warn('ADMIN_PASSWORD está presente: úsala solo para seed/bootstrap y retírala del entorno de runtime después.');
if (values.SUPABASE_SERVICE_ROLE_KEY?.startsWith('ey')) warn('SUPABASE_SERVICE_ROLE_KEY está presente; la API actual no la necesita para operar con PostgreSQL directo.');
if (!existsSync(resolve('pnpm-lock.yaml')) && !existsSync(resolve('package-lock.json'))) fail('No existe lockfile reproducible.');
else pass('Lockfile presente.');

console.log('\nPreflight de lanzamiento LocalPOS');
for (const item of passes) console.log(`  OK    ${item}`);
for (const item of warnings) console.log(`  AVISO ${item}`);
for (const item of failures) console.log(`  ERROR ${item}`);
console.log(`\nResultado: ${passes.length} OK, ${warnings.length} avisos, ${failures.length} errores.`);
if (failures.length) process.exitCode = 1;
