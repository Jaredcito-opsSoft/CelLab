# Hito 3 — POS-lite transaccional

## Alcance implementado

LocalPOS incorpora venta rápida, historial, detalle, cancelación administrativa, movimientos de inventario y nota imprimible sin modificar las tablas operativas anteriores.

La migración incremental es `0002_easy_iron_fist.sql`.

## Modelo

Nuevas tablas:

- `sales`: encabezado, negocio, cliente opcional, operador, importes, pago, estado y folio.
- `sale_items`: negocio, venta, producto y snapshot inmutable de nombre y precio.
- `inventory_movements`: negocio, producto, usuario, tipo, existencias anterior/nueva y referencia.

Los importes se almacenan como enteros en centavos para mantener la convención del MVP y evitar errores de punto flotante. Los enums y constraints de PostgreSQL limitan estados, métodos de pago, tipos de movimiento, cantidades e importes.

## Integridad transaccional

Crear una venta ejecuta en una transacción:

1. Resuelve el negocio activo.
2. Valida productos y duplicados.
3. Calcula importes desde precios del servidor.
4. Genera `VTA-00001` con `folio_counters`.
5. Inserta encabezado y snapshots.
6. Descuenta stock con una condición atómica `stock >= quantity`.
7. Inserta un movimiento `sale` por producto.

Si una actualización de stock no afecta filas, toda la venta se revierte.

Cancelar una venta cambia condicionalmente `completed → cancelled`, devuelve cada existencia e inserta movimientos `sale_cancel` en una sola transacción. Sólo `admin` puede cancelar.

Las altas con existencia inicial y las ediciones de stock del CRUD previo ahora generan movimientos `stock_entry` y `manual_adjustment`.

## API

- `GET /api/operations/sales`
- `GET /api/operations/sales/:id`
- `POST /api/operations/sales`
- `POST /api/operations/sales/:id/cancel`
- `GET /api/operations/inventory-movements`

## Panel

- `/panel/ventas`: catálogo, carrito, cliente, descuento, pago y confirmación.
- `/panel/ventas/historial`: búsqueda y estado de ventas.
- `/panel/ventas/:id`: detalle, impresión y cancelación para admin.

La nota usa nombre, logotipo, teléfono, dirección, moneda y mensajes de `business_settings`. El CSS de impresión produce una nota de 80 mm con `Ctrl+P`.

## Despliegue

```bash
pnpm --filter @cellab/api db:migrate
pnpm dev
```

No se ejecutó la migración contra una instancia real desde el workspace porque las credenciales de producción no forman parte del repositorio.
