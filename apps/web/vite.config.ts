import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

function loadWorkspaceViteEnv(mode: string) {
  const result: Record<string, string> = {};
  for (const name of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    const path = resolve(workspaceRoot, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^(VITE_[A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      result[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return result;
}

export default defineConfig(({ mode }) => {
  const env = loadWorkspaceViteEnv(mode);
  const apiUrl = process.env.VITE_API_URL ?? env.VITE_API_URL ?? '';
  const devApiTarget = process.env.VITE_DEV_API_TARGET ?? env.VITE_DEV_API_TARGET ?? 'http://localhost:3000';

  return {
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    plugins: [
      react(),
      ...VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'LocalPOS',
          short_name: 'LocalPOS',
          description: 'Punto de venta e inventario para negocios locales',
          start_url: '/panel',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#102b32',
          background_color: '#f7f8f6',
          lang: 'es-MX',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => ({
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly' as const,
            method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          })),
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
        },
        '/health': {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
