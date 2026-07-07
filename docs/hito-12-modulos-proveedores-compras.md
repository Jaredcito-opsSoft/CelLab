# Hito 12 - Modularidad de negocio, proveedores y compras opcionales

Fecha: 2026-07-06

## Objetivo

Hacer que LocalPOS avance como POS modular para negocios locales, con CelLab Tuxtla como negocio piloto, sin obligar a todos los negocios a usar taller, proveedores, compras o piezas.

## Por que se hizo modular

Un negocio simple debe poder operar con venta rapida, caja, inventario basico, clientes, historial y reportes basicos. Los modulos avanzados se activan solo si el negocio los necesita. Desactivar un modulo no borra datos; al reactivarlo, la informacion existente vuelve a estar disponible.

## Modulos disponibles

Core/base:

- `core_pos`: venta rapida e historial.
- `cash`: caja y turnos.
- `inventory_basic`: productos, stock y kardex.

Opcionales:

- `repairs`: taller de reparaciones.
- `public_tracking`: rastreo publico de folios.
- `suppliers`: proveedores.
- `purchases`: compras y recepcion de mercancia.
- `repair_parts`: piezas/productos dentro de reparaciones.
- `advanced_reports`: reportes avanzados futuros.

## Modelo de datos

Se creo la tabla `business_modules` con:

- `business_id`
- `module_key`
- `enabled`
- `configured_by_user_id`
- timestamps
- indice por negocio, indice por modulo y unique `business_id + module_key`

Defaults para el negocio existente:

- `core_pos`, `cash`, `inventory_basic`, `repairs`, `public_tracking`, `repair_parts`: activos.
- `suppliers`, `purchases`, `advanced_reports`: apagados.

Tambien se agregaron:

- `suppliers`
- `purchase_status`
- `purchases`
- `purchase_items`
- movimiento de inventario `purchase_receipt`
- referencia de inventario `purchase`

## Backend

Nuevos endpoints:

- `GET /api/operations/modules`
- `PATCH /api/operations/modules/:moduleKey`
- `GET /api/operations/suppliers`
- `POST /api/operations/suppliers`
- `PATCH /api/operations/suppliers/:id`
- `DELETE /api/operations/suppliers/:id`
- `GET /api/operations/purchases`
- `GET /api/operations/purchases/:id`
- `POST /api/operations/purchases`
- `PATCH /api/operations/purchases/:id`
- `POST /api/operations/purchases/:id/items`
- `PATCH /api/operations/purchases/:id/items/:itemId`
- `POST /api/operations/purchases/:id/receive`
- `POST /api/operations/purchases/:id/cancel`

Middleware:

- `requireModule('suppliers')`
- `requireModule('purchases')`
- `requireModule('repairs')`

Si un modulo esta apagado, el backend responde `403 MODULE_DISABLED`.

## Reglas de UI

- Sidebar oculta modulos apagados.
- Dashboard oculta cards y acciones relacionadas con reparaciones si `repairs` esta apagado.
- URL directa a modulo apagado muestra una pantalla amable de "Modulo no activado".
- Configuracion incluye "Modulos del negocio" con switches, descripcion y dependencias.

## Proveedores

Modulo opcional bajo `suppliers`.

Permite:

- listar
- buscar desde API
- crear
- editar
- archivar
- conservar historial

Crear, editar y archivar requiere `admin` o `manager`.

## Compras

Modulo opcional bajo `purchases`.

Reglas:

- Requiere `inventory_basic` y `suppliers`.
- No afecta caja.
- No implementa pagos a proveedor.
- No implementa cuentas por pagar.
- No implementa impuestos ni facturacion.
- Recibir compra es transaccional: aumenta stock, actualiza costo de producto, crea `inventory_movements.purchase_receipt` y audita.

Estados:

- `draft`
- `ordered`
- `partially_received`
- `received`
- `cancelled`

Folios:

- `COM-00001`

## Piezas vinculadas a reparacion

Una compra puede vincularse opcionalmente a una reparacion solo si estan activos `repairs`, `repair_parts` y `purchases`.

Al recibir una compra vinculada:

- registra evento en la reparacion.
- no instala automaticamente la pieza.
- no descuenta doble inventario.
- no cambia el estado de reparacion como automatismo de negocio.

## Permisos

- `admin`: modulos, proveedores, compras, recepcion, cancelacion y costos.
- `manager`: proveedores, compras, recepcion y costos.
- `staff`: no gestiona compras, no recibe compras y los importes de compras se enmascaran desde API.
- `technician`: no gestiona compras, no recibe compras y los importes de compras se enmascaran desde API.
- `viewer`: lectura limitada por permisos existentes.

## Auditoria

Acciones auditadas:

- `module.enabled`
- `module.disabled`
- `supplier.created`
- `supplier.updated`
- `supplier.archived`
- `purchase.created`
- `purchase.updated`
- `purchase.item_added`
- `purchase.item_updated`
- `purchase.received`
- `purchase.cancelled`
- `inventory.purchase_receipt`
- `repair.part_received`

## No implementado

- ERP completo.
- pagos a proveedores.
- cuentas por pagar.
- impuestos.
- facturacion.
- multiempresa real.
- multisucursal.
- almacenes multiples.
- compras parciales por cantidad; la recepcion actual recibe todas las partidas pendientes.
- reportes avanzados de compras.

## Validaciones ejecutadas

- `npm run db:generate -w @cellab/api`: aprobado, genero `0008_hard_midnight`.
- `npm run db:migrate -w @cellab/api`: aprobado.
- `npm run smoke:permissions -w @cellab/api`: aprobado contra `http://127.0.0.1:3000`.
- `npm run smoke:modules -w @cellab/api`: aprobado contra `http://127.0.0.1:3000`.
- `npm run smoke:purchases -w @cellab/api`: aprobado contra `http://127.0.0.1:3000`.
- `npm run typecheck -w @cellab/api`: aprobado.
- `npm run typecheck -w @cellab/web`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado.
- Barrido focalizado de mojibake en archivos nuevos/modificados del hito: sin hallazgos.
- Smoke visual autenticado en `/panel/configuracion`: aprobado; muestra "Modulos del negocio", dependencias de compras, proveedores/compras en sidebar cuando estan activos, sin overflow horizontal, sin errores de consola y sin mojibake.

Nota de smoke de compras:

- `smoke:purchases` apaga `purchases` y `suppliers` al iniciar, valida bloqueo por modulo apagado, activa ambos modulos solo durante la prueba y los restaura apagados en `finally`.
- El smoke crea registros controlados de prueba: usuario staff, proveedor, producto, compra, partidas, movimiento de inventario y auditorias. Esos registros quedan como evidencia local de smoke; lo que no queda sucio es el estado de activacion de modulos.
- El smoke valida que un rol no gerencial pueda consultar la compra sin ver importes: `subtotalCents`, `unitCostCents` y `totalCents` en `0`.

## Smoke manual recomendado

1. Entrar a `/panel/configuracion`.
2. Ver "Modulos del negocio".
3. Confirmar que proveedores y compras pueden apagarse.
4. Confirmar que al apagarse desaparecen del sidebar.
5. Entrar manualmente a `/panel/proveedores` o `/panel/compras` con modulo apagado y ver "Modulo no activado".
6. Activar proveedores y compras.
7. Crear proveedor.
8. Crear compra.
9. Agregar producto.
10. Recibir compra y validar stock/kardex.
