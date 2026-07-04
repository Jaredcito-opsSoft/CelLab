# Hito 4 — Reparaciones completas

## Resumen

Se extendió el módulo de reparaciones para operar como flujo real de taller dentro de LocalPOS, manteniendo compatibilidad con los folios `REP-00001`, el panel existente y POS-lite.

## Base de datos

Migración creada:

- `apps/api/drizzle/0003_square_power_man.sql`

Cambios principales:

- Se agregaron columnas a `repairs`:
  - `device_color`
  - `accessories_received`
  - `public_notes`
  - `quote_status`
  - `authorized_at`
  - `warranty_until`
  - `warranty_notes`
  - `tracking_enabled`
- Se creó `repair_payments`.
- Se creó `repair_items`.
- Se agregó `service_usage` a `inventory_movement_type`.
- Se agregaron índices para reparaciones, pagos, conceptos y eventos.

## Endpoints nuevos o ampliados

- `GET /api/operations/repairs/:id`
- `PATCH /api/operations/repairs/:id`
- `POST /api/operations/repairs/:id/events`
- `POST /api/operations/repairs/:id/payments`
- `POST /api/operations/repairs/:id/items`
- `POST /api/operations/repair-payments/:id/void`

## Panel

Ruta nueva:

- `/panel/reparaciones/:id`

La vista incluye:

- encabezado con folio, cliente y estado;
- edición de equipo, condición, falla, diagnóstico, notas públicas e internas;
- cotización, total final, estado de cotización y garantía;
- pagos y saldo pendiente;
- conceptos/piezas usadas;
- descuento transaccional de inventario cuando aplica;
- historial de eventos;
- nota imprimible con datos desde `business_settings`.

## Reglas implementadas

- Todo cambio de estado puede dejar evento.
- Todo pago queda registrado y se puede anular sin borrado físico.
- El saldo se calcula con total cotizado/final menos pagos activos.
- Las notas internas no se imprimen.
- Las notas públicas sí aparecen para cliente/rastreo.
- El uso de inventario en reparación descuenta stock dentro de transacción y crea movimiento `service_usage`.

## Pendientes conocidos

- No se implementó devolución/anulación de `repair_items` con regreso automático de inventario.
- La nota imprimible usa `window.print()` desde la vista de detalle, no una ruta separada `/nota`.
- `reference_type` de movimientos sigue usando `manual` para reparaciones, por compatibilidad con el enum actual.

## Validaciones

Ejecutado:

```bash
pnpm typecheck
pnpm build
```
