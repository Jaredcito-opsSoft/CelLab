# Hito — Cajas físicas y turnos por terminal

## Objetivo

Preparar LocalPOS para operar entre 3 y 10 terminales de venta dentro de un mismo negocio, sin implementar todavía sucursales ni multiempresa.

## Alcance implementado

- Catálogo de cajas físicas con código, nombre, estado y caja principal.
- Límite operativo de 10 cajas activas.
- Una sesión abierta por caja física.
- Varias cajas abiertas simultáneamente dentro del mismo negocio.
- Caja principal creada automáticamente para conservar compatibilidad.
- Backfill de todos los cortes históricos hacia la caja principal.
- Selección persistente de caja en Venta rápida y Caja.
- Apertura, movimientos manuales, venta, devolución, cancelación y cierre asociados a la caja seleccionada.
- Nombre y código de caja incluidos en el detalle del turno.
- Auditoría al crear o actualizar cajas.
- Límite de conexiones PostgreSQL configurable mediante `DB_POOL_MAX`.

## Migración

`0012_late_songbird.sql` crea `cash_registers`, agrega `cash_register_id` a `cash_sessions`, crea la caja principal, migra sesiones históricas y reemplaza la restricción de una caja abierta por negocio por una sesión abierta por caja física.

La migración es incremental y no elimina ventas, movimientos ni cortes históricos.

## Endpoints

- `GET /api/operations/cash/registers`
- `POST /api/operations/cash/registers`
- `PATCH /api/operations/cash/registers/:id`
- `GET /api/operations/cash/current?cashRegisterId=<uuid>`

Los endpoints existentes de apertura, cierre y movimientos aceptan `cashRegisterId`. Ventas, devoluciones y cancelaciones también lo aceptan.

## Smoke funcional

`npm run smoke:multi-register -w @cellab/api`

Validó dos cajas simultáneas, venta en efectivo, pago mixto, devolución parcial, aislamiento de movimientos y cierre independiente sin diferencia.

## Smoke de concurrencia

`npm run smoke:cash-concurrency -w @cellab/api`

Validó nueve terminales simultáneas, nueve ventas concurrentes, folios únicos, stock consistente, aislamiento por turno y cierres exactos.

En el entorno de desarrollo, con el API limitado a dos conexiones y PostgreSQL remoto, las nueve ventas tardaron aproximadamente 43 segundos. Es una aprobación funcional, no una aprobación definitiva de rendimiento. Antes del piloto se debe repetir con una sola instancia de API, `DB_POOL_MAX=5`, datos representativos y métricas p50/p95.

## No implementado

- Sucursales.
- Multiempresa.
- Operación offline.
- Registro fiscal por terminal.
- Arqueo ciego o autorización dual.
- Asociación automática de un dispositivo físico mediante enrolamiento seguro.

## Próximo paso

Hito de Preparación para Lanzamiento Piloto: entorno de staging aislado, pruebas de carga, backups/restauración, impresión térmica, observabilidad, onboarding y checklist de despliegue.
