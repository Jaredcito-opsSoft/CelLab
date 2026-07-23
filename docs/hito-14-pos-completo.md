# Hito 14 — POS completo

## Objetivo

Extender el POS existente con pagos mixtos, devoluciones parciales y apartados sin alterar ventas históricas, folios previos ni snapshots económicos.

## Implementado

- Una venta admite uno o varios pagos concretos en centavos. `sales.payment_method` conserva compatibilidad y usa `mixed` cuando corresponde.
- Cada pago genera su propio movimiento de caja y aparece desglosado en el detalle imprimible.
- Las devoluciones parciales usan folios `DEV-*`, validan cantidades previamente devueltas, restituyen stock, crean `sale_return` en inventario y salidas de caja por método.
- Una venta con devolución ya no puede usar la cancelación total heredada.
- Los apartados usan folios `APA-*`, cliente obligatorio, snapshots de productos, reserva transaccional de stock, anticipo, abonos, saldo y entrega.
- Cancelar un apartado libera inventario y contrarregistra los abonos; los pagos nunca se eliminan.
- Bloqueos transaccionales por venta/apartado protegen contra operaciones concurrentes.
- Permisos: staff cobra y entrega; manager/admin devuelve, anula abonos o cancela apartados; cancelación total de venta sigue siendo admin.

## Rutas

- `POST /api/operations/sales` acepta `payments[]` y conserva `paymentMethod` legacy.
- `POST /api/operations/sales/:id/returns`
- `GET|POST /api/operations/layaways`
- `GET /api/operations/layaways/:id`
- `POST /api/operations/layaways/:id/payments`
- `POST /api/operations/layaways/:id/payments/:paymentId/void`
- `POST /api/operations/layaways/:id/cancel`
- `POST /api/operations/layaways/:id/deliver`

## Validación

- Typecheck web aprobado.
- Smoke disponible en `apps/api/src/scripts/smoke-pos-complete.ts`; requiere API y base de prueba activas, y se ejecuta con `npx tsx apps/api/src/scripts/smoke-pos-complete.ts`.
- El smoke crea datos trazables y valida pago mixto, devolución, reserva, liquidación y entrega.

## Fuera de alcance

- Impuestos, facturación, devoluciones sin retorno físico, cambios entre productos y conversión de apartado a una segunda venta.
- Expiración automática: el estado está preparado, pero requiere un proceso programado posterior.
