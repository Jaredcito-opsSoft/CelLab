# Reportes gerenciales — lanzamiento piloto

## Objetivo

Entregar al administrador y al gerente una lectura económica operativa de LocalPOS basada en datos históricos reales, sin alterar ventas, caja, inventario, reparaciones ni el esquema de PostgreSQL.

## API

- `GET /api/operations/reports/managerial?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/operations/reports/managerial.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`

Ambos endpoints requieren autenticación y rol `admin` o `manager`. El rango es inclusivo, respeta la zona horaria configurada del negocio y admite un máximo de 366 días. Sin fechas, devuelve el día local actual.

## Indicadores incluidos

- Ventas brutas, descuentos, devoluciones, ventas netas, costo vendido neto, utilidad bruta y margen.
- Cobros, reembolsos y neto por efectivo, transferencia y tarjeta.
- Productos principales por unidades e ingreso netos; máximo 10.
- Existencias, productos con stock bajo, capital actual a costo y valor potencial a precio de venta.
- Productos activos sin venta en el rango, priorizados por capital inmovilizado; máximo 20.
- Reparaciones abiertas y entregadas; importe facturado, costos históricos de piezas y utilidad bruta de las entregadas en el rango.
- Apartados activos, vencidos y saldo pendiente.
- Cortes cerrados y diferencias de caja.
- Ventas canceladas.

## Criterios contables operativos

- Los costos de ventas y devoluciones provienen de `cost_cents_snapshot`; nunca se recalculan con el costo actual del producto.
- Los costos de reparación provienen de `repair_items.cost_total_cents` no anulados.
- No se inventan ni calculan impuestos porque LocalPOS aún no tiene un modelo fiscal.
- La utilidad mostrada es utilidad bruta operativa, no utilidad contable neta.
- El importe de reparación es lo facturado en reparaciones entregadas, no necesariamente lo cobrado durante el mismo rango.
- Las cancelaciones se ubican por `updated_at`, ya que el esquema actual no posee `cancelled_at` para ventas.

## Rendimiento

Las consultas son agregadas y acotadas; no existe lectura N+1. Se filtra por `business_id` en las tablas que ya lo soportan y se conservan límites explícitos en rankings. Para el piloto no se agregaron migraciones. Antes de crecer a historiales muy grandes se recomienda medir con `EXPLAIN (ANALYZE, BUFFERS)` y agregar índices compuestos según los planes reales de consulta.

## No implementado

- Impuestos, facturación o contabilidad formal.
- Comparación automática contra un periodo anterior.
- Reportes por sucursal o caja física; todavía no existe ese modelo.
- Costos indirectos, nómina, renta o utilidad neta contable.
- Materialized views; no se justifican aún para el volumen piloto.

## Validación

- Contratos sin base de datos para fechas, rango máximo y entradas inválidas.
- Typecheck de API.
- `git diff --check`.
