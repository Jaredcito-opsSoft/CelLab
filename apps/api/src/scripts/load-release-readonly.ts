import { performance } from 'node:perf_hooks';
import { env } from '../config/env.js';

const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
const total = Math.max(1, Number(process.env.LOAD_REQUESTS ?? 100));
const concurrency = Math.min(25, Math.max(1, Number(process.env.LOAD_CONCURRENCY ?? 10)));
const maxP95 = Math.max(100, Number(process.env.LOAD_MAX_P95_MS ?? 2000));
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD.');
const login = await fetch(`${apiUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
const loginData = await login.json() as { token?: string; error?: string };
if (!login.ok || !loginData.token) throw new Error(loginData.error ?? 'Login falló.');
const paths = ['/api/operations/products?limit=20', '/api/operations/sales?limit=20', '/api/operations/dashboard/summary'];
const timings: number[] = [];
let completed = 0;
let failed = 0;
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= total) return;
    const started = performance.now();
    try {
      const response = await fetch(`${apiUrl}${paths[index % paths.length]}`, { headers: { Authorization: `Bearer ${loginData.token}` } });
      if (!response.ok) failed++;
      await response.arrayBuffer();
    } catch { failed++; }
    timings.push(performance.now() - started);
    completed++;
  }
}
const wallStarted = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
timings.sort((a, b) => a - b);
const percentile = (value: number) => timings[Math.min(timings.length - 1, Math.ceil(timings.length * value) - 1)] ?? 0;
const result = {
  requests: completed,
  concurrency,
  failures: failed,
  successRate: `${(((completed - failed) / completed) * 100).toFixed(2)}%`,
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  maxMs: Math.round(timings.at(-1) ?? 0),
  wallMs: Math.round(performance.now() - wallStarted),
};
console.log(JSON.stringify(result, null, 2));
if (failed > 0 || percentile(0.95) > maxP95) process.exitCode = 1;
