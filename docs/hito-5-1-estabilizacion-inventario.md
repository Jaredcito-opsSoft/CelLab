# Hito 5.1 — Estabilización, rastreo seguro e inventario operativo

Fecha: 2026-06-25

## Implementado

### Migración y modelo

- Se generó la migración `0004_faulty_energizer.sql`.
- Se agregaron tipos de movimiento:
  - `service_usage_void`
- Se agregó referencia de inventario:
  - `repair`
- `repair_items` ahora conserva economía por concepto:
  - `cost_cents_snapshot`
  - `cost_total_cents`
  - `gross_profit_cents`
  - `gross_margin_bps`
  - `voided_at`
  - `voided_by_user_id`
  - `void_reason`

### Inventario operativo LocalPOS

Endpoints nuevos:

- `POST /api/operations/inventory/stock-entry`
- `POST /api/operations/inventory/stock-exit`
- `POST /api/operations/inventory/adjust`
- `GET /api/operations/inventory`

Compatibilidad conservada:

- `GET /api/operations/inventory-movements`

Reglas:

- Solo `admin` puede modificar stock desde inventario.
- `technician` puede consultar movimientos.
- No se permite stock negativo.
- Todo cambio genera `inventory_movements`.
- Entradas pueden actualizar costo unitario del producto.

### Taller y refacciones

- Al agregar una pieza/concepto a reparación se guarda snapshot de precio, costo, utilidad y margen.
- Si el concepto afecta inventario, genera movimiento `service_usage` con `reference_type = repair`.
- Se agregó `POST /api/operations/repair-items/:id/void` para anular conceptos.
- Si el concepto anulado afectó inventario, se regresa stock y se genera movimiento `service_usage_void`.
- La anulación queda registrada en `repair_events`.

### Rastreo público

- El rastreo conserva respuesta genérica cuando folio/teléfono no coinciden.
- Se normaliza teléfono usando últimos 10 dígitos para soportar `+52`, espacios y guiones.
- `tracking_enabled = false` no expone la reparación.
- Frontend valida mínimo 10 dígitos antes de consultar.

### Panel

- Nueva vista `/panel/inventario/movimientos`.
- Vista de movimientos con producto, tipo, stock anterior/nuevo, referencia, usuario y fecha.
- Formulario admin para entradas, salidas y ajustes de stock.
- Productos muestran costo y permiten capturarlo.
- Detalle de reparación muestra resumen económico: ingresos, costo, utilidad y margen.
- Admin puede anular conceptos desde el detalle.

## Migración real

Se intentó ejecutar:

```bash
pnpm --filter @cellab/api db:migrate
```

Resultado: bloqueado porque el entorno local no tiene `DATABASE_URL` configurada. No se aplicó contra una base real para evitar usar una URL dummy.

Para aplicar en el entorno real:

1. Configurar `DATABASE_URL` en el entorno de API.
2. Ejecutar `pnpm --filter @cellab/api db:migrate`.
3. Probar smoke test:
   - crear producto con stock,
   - hacer entrada/salida/ajuste,
   - agregar pieza a reparación descontando stock,
   - anular concepto y confirmar devolución de stock,
   - consultar rastreo público con folio + teléfono.

## Validación local

- `pnpm --filter @cellab/api typecheck` aprobado.
- `pnpm --filter @cellab/web typecheck` aprobado.
## Actualización Hito 5.1.1

- Se auditó que las migraciones 0003 y 0004 no contienen operaciones destructivas.
- Se confirmó que no hay `DATABASE_URL` disponible en el entorno actual, por lo que la aplicación real de migraciones sigue pendiente.
- Se sanitizó `.env.example` para evitar credenciales reales en archivos versionables.
- Se corrigió la ruta directa `/panel/inventario/movimientos` en el panel.
## Actualización — Aplicación real completada

Fecha: 2026-06-26

- `DATABASE_URL` fue configurado para el proyecto Supabase autorizado `kfnkkncpbhmlrlaczfhy`.
- `db:migrate` se ejecutó correctamente.
- `db:seed` se ejecutó correctamente.
- Se verificaron tablas, columnas y enums de Hitos 4, 5 y 5.1 en la base real.
- Typecheck y build pasan después de la aplicación real.
## Actualización — Smoke test funcional 5.1.2

Fecha: 2026-06-26

- Inventario operativo probado contra base real.
- Entradas, salidas, ajustes y bloqueo de stock negativo aprobados.
- POS-lite probado con venta/cancelación y movimientos `sale`/`sale_cancel`.
- Reparaciones probadas con pieza usada, movimiento `service_usage`, anulación y `service_usage_void`.
- Se corrigió cálculo de pagos anulados para que no sigan contando como depósito.