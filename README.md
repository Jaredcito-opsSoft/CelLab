# LocalPOS

POS modular para negocios locales. CelLab Tuxtla es el primer negocio configurado y conserva su landing p√∫blica y su m√≥dulo de reparaciones.

## Arquitectura actual

- React, Vite y TypeScript para landing y panel.
- Express y TypeScript para la API.
- PostgreSQL con Drizzle y migraciones versionadas.
- JWT, BCrypt, rate limit y roles `admin` / `technician`.
- Configuraci√≥n single-business mediante `business_settings`.
- CRUD de clientes, productos y reparaciones con borrado l√≥gico.
- Folios de reparaci√≥n transaccionales e historial de estados.

Los namespaces internos `@cellab/*` se conservan temporalmente para evitar una refactorizaci√≥n disruptiva. No representan el nombre comercial del producto.

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
- Configuraci√≥n: `http://localhost:5173/panel/configuracion`

## Siguiente fase

POS-lite con ventas `VTA-00001`, pagos, movimientos de inventario, descuento de stock transaccional y notas imprimibles alimentadas por `business_settings`.

## Hito 8.5 ó caja y operaciÛn real

Se agregaron correcciones funcionales para caja, ventas y reparaciones: polÌtica configurable de caja abierta, timezone por negocio, costo snapshot en ventas, validaciÛn de sobrepagos, permisos endurecidos y perfil p˙blico del negocio para eliminar telÈfonos hardcodeados en WhatsApp. Ver `docs/hito-8-5-correcciones-funcionales-caja-ventas.md`.
