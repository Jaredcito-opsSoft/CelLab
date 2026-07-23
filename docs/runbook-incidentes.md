# Runbook de incidentes del piloto

## API no disponible

Comprobar `/health/live` y `/health/ready`. Si live falla, revisar proceso/contenedor. Si ready falla, revisar conectividad y pool PostgreSQL. No aumentar `DB_POOL_MAX` sin comprobar el límite total del proveedor y el número de réplicas.

## Venta o cobro con resultado incierto

No reintentar. Guardar hora, caja, operador, importe y `x-request-id`; consultar historial de ventas, movimientos de caja e inventario. Solo crear otra venta cuando se confirme que la primera no existe.

## Diferencia de caja o stock

Cerrar temporalmente la operación afectada, exportar evidencia y revisar movimientos trazables. No editar tablas directamente. Usar ajustes autorizados con nota y usuario responsable.

## Severidad y comunicación

- P0: pérdida/corrupción de datos o exposición de información; detener operación.
- P1: ventas, caja o inventario indisponibles; modo manual con folios provisionales controlados.
- P2: función secundaria o problema visual; continuar con seguimiento.

El registro mínimo incluye inicio, impacto, responsable, request IDs, decisiones, recuperación y acción preventiva.
