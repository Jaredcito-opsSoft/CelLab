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

## Fuente de verdad para agentes

Antes de proponer cambios funcionales, revisa `docs/AI_SOURCE_OF_TRUTH.md`. El contrato actual es: código vigente > schema/migraciones > smoke tests cerrados > docs de hito > memoria conversacional.

## Siguiente fase

Hito 10 prioriza fuente de verdad, limpieza UTF-8 y claridad UX del panel sin cambiar reglas transaccionales. Después siguen usuarios, roles y auditoría inicial.

## Hito 8.5 — caja y operación real

Se agregaron correcciones funcionales para caja, ventas y reparaciones: política configurable de caja abierta, timezone por negocio, costo snapshot en ventas, validación de sobrepagos, permisos endurecidos y perfil público del negocio para eliminar teléfonos hardcodeados en WhatsApp. Ver `docs/hito-8-5-correcciones-funcionales-caja-ventas.md`.
