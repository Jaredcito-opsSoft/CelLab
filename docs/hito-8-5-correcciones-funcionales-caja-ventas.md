# Hito 8.5 - Correcciones funcionales de caja, ventas y separación LocalPOS/CelLab

## Objetivo

Cerrar brechas operativas detectadas después del corte de caja, sin rediseñar el panel ni romper el MVP existente.

## Cambios implementados

- `business_settings` ahora incluye:
  - `require_open_cash_for_money_operations boolean default false`
  - `timezone text default 'America/Mexico_City'`
- `sale_items` ahora guarda `cost_cents_snapshot` para conservar costo histórico de venta.
- Las operaciones monetarias integradas con caja usan una política clara:
  - Si hay caja abierta, se registra el movimiento en el corte abierto.
  - Si no hay caja abierta y la política está activa, la operación se bloquea.
  - Si no hay caja abierta y la política está inactiva, la operación continúa con `cashWarning` visible en frontend.
- Cancelaciones/anulaciones no mutan cajas cerradas. Solo generan salida si existe caja abierta actual.
- Pagos de reparación ya no pueden exceder el saldo cuando existe total definido.
- Pagos anulados no cuentan para el saldo.
- Si una reparación aún no tiene total definido, se permiten anticipos.
- Permisos endurecidos:
  - Borrado lógico de productos: solo `admin`.
  - Borrado lógico de reparaciones: solo `admin`.
  - Campos sensibles de producto (`costCents`, `priceCents`, `stock`, `minimumStock`, `active`): solo `admin`.
  - Ajustes de inventario, anulación de conceptos, anulación de pagos y cierre de caja se mantienen en `admin`.
- Nuevo endpoint público seguro:
  - `GET /api/public/business-profile`
- Landing, chatbot y rastreo público consumen teléfono/WhatsApp desde `business_settings` en lugar de número hardcodeado.
- Reportes y resúmenes de caja usan el timezone configurado del negocio.

## Migración

Archivo generado:

- `apps/api/drizzle/0006_simple_genesis.sql`

## Validación ejecutada

```bash
npm run db:migrate -w @cellab/api
npm run typecheck -w @cellab/api
npm run typecheck -w @cellab/web
npm run typecheck
npm run build
```

Todas las validaciones pasaron correctamente.

## Nota de arquitectura

El comportamiento por defecto mantiene compatibilidad con la operación actual: `require_open_cash_for_money_operations` queda en `false`. Para operaciones más estrictas, el admin puede activarlo desde `/panel/configuracion`.
