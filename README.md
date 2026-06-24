# LocalPOS

POS modular para negocios locales. CelLab Tuxtla es el primer negocio configurado y conserva su landing pública y su módulo de reparaciones.

## Arquitectura actual

- React, Vite y TypeScript para landing y panel.
- Express y TypeScript para la API.
- PostgreSQL con Drizzle y migraciones versionadas.
- JWT, BCrypt, rate limit y roles `admin` / `technician`.
- Configuración single-business mediante `business_settings`.
- CRUD de clientes, productos y reparaciones con borrado lógico.
- Folios de reparación transaccionales e historial de estados.

Los namespaces internos `@cellab/*` se conservan temporalmente para evitar una refactorización disruptiva. No representan el nombre comercial del producto.

## Inicio local

1. Copia `.env.example` como `.env`.
2. Configura `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
3. Ejecuta:

```bash
pnpm install
pnpm --filter @cellab/api db:migrate
pnpm --filter @cellab/api db:seed
pnpm dev
```

- Landing CelLab: `http://localhost:5173/`
- Panel LocalPOS: `http://localhost:5173/panel`
- Configuración: `http://localhost:5173/panel/configuracion`

## Siguiente fase

POS-lite con ventas `VTA-00001`, pagos, movimientos de inventario, descuento de stock transaccional y notas imprimibles alimentadas por `business_settings`.
