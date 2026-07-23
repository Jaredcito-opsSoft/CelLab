# Hito de hardening técnico mínimo

## Objetivo

Agregar una barrera reproducible contra regresiones de contratos operativos, TypeScript, compilación y codificación de textos, sin depender de PostgreSQL remoto ni secretos.

## Alcance implementado

- Suite local de contratos con `node:test`, ejecutada mediante `tsx` ya presente en el API.
- Validación de roles y su paridad con el enum Drizzle.
- Validación del registro de módulos, sus claves y dependencias.
- Validación de enums críticos de ventas, caja, compras, inventario y reparaciones.
- Validación de campos económicos históricos y `business_id` esenciales.
- Barrido de mojibake y caracteres Unicode de reemplazo en código visible del frontend y API.
- Workflow de GitHub Actions para instalación bloqueada, pruebas, typecheck y build.
- Script raíz `verify` para reproducir localmente lo que ejecuta CI.

## Archivos incorporados

- `.github/workflows/ci.yml`
- `scripts/check-encoding.mjs`
- `apps/api/src/tests/contracts.test.ts`
- `docs/hito-hardening-tecnico.md`

## Archivos ajustados

- `package.json`: scripts `check:encoding`, `test` y `verify`.
- `apps/api/package.json`: script `test:contracts`.
- `apps/web/src/components/LogoIcon.tsx`: normalización de codificación del comentario.
- `apps/web/src/lib/api.ts`: normalización de mensajes visibles.
- `apps/api/src/modules/cash/cash.service.ts`: normalización textual de avisos y errores; sin modificar condiciones ni cálculos.

## Cómo ejecutar

```bash
npm run test
npm run typecheck
npm run build
```

O la validación completa:

```bash
npm run verify
```

## Validación ejecutada

- `npm run test`: aprobado, 6/6 pruebas de contrato.
- `npm run check:encoding`: aprobado, 71 archivos visibles revisados.
- `npm run typecheck -w @cellab/web`: aprobado.
- `npm run typecheck -w @cellab/api`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado para web y API.
- `git diff --check`: aprobado.

## Smoke tests que requieren entorno real

Los scripts existentes `smoke:permissions`, `smoke:modules` y `smoke:purchases` se conservaron. Son pruebas opcionales de integración porque necesitan API, base migrada, datos controlados y credenciales válidas. No forman parte del CI sin secretos para evitar mutaciones accidentales sobre una base remota.

## No implementado

- No se modificaron esquema ni migraciones.
- No se modificaron endpoints, permisos ni lógica transaccional.
- No se conectó CI a Supabase/PostgreSQL.
- No se añadieron dependencias.
- No se automatizaron smoke tests que crean ventas, movimientos de caja, compras o reparaciones.

## Pendientes recomendados

- Crear una base PostgreSQL efímera exclusiva de CI para pruebas transaccionales.
- Añadir pruebas HTTP de autenticación y permisos contra esa base aislada.
- Añadir pruebas de concurrencia para folios, stock y cierre de caja.
- Agregar smoke visual automatizado cuando exista un entorno de prueba sembrado y estable.
