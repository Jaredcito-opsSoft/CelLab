# Hito 5.1.2 — Smoke test funcional, validación real y correcciones menores

Fecha: 2026-06-26

## Base usada

- Proyecto Supabase autorizado: `kfnkkncpbhmlrlaczfhy`.
- Base PostgreSQL real vía `DATABASE_URL` en `.env` raíz.
- `.env` permanece ignorado por Git.
- `.env.example` existe con placeholders, sin secretos reales.

## Alcance

Este hito fue de estabilización. No se agregaron módulos grandes, dashboard senior, caja diaria, reportes avanzados ni multi-tenant completo.

Se ejecutó smoke test funcional real por HTTP contra la API local conectada a Supabase real.

Run ID: `SMOKE-1782439400843`

Registros de prueba creados:

- Producto: `88267ca7-eb61-4d5b-b523-b4416109e67f`
- Venta principal: `0a7f0189-891b-478b-877a-0bbaef38f999`
- Reparación: `ba411be5-d805-4be2-8acf-b94c110a8773`

Los registros quedan en la base como evidencia de smoke test y usan prefijo/nombres `SMOKE` o `Smoke Test`.

## Migraciones y seed

- Migraciones reales ya aplicadas en Hito 5.1.1.
- `db:seed` se ejecutó dos veces en este hito.
- Resultado: idempotente.
  - 1 negocio en `business_settings`.
  - 1 usuario admin seed.
  - 1 usuario technician de smoke test, creado/actualizado por prueba para validar permisos.

## Validaciones técnicas

Ejecutado y aprobado:

- `pnpm --filter @cellab/api typecheck`
- `pnpm --filter @cellab/web typecheck`
- `pnpm typecheck`
- `pnpm build`

Lint:

- No existe script `lint` en `package.json`.

## Checklist funcional probado

### Entorno

- `.env` existe en raíz.
- `DATABASE_URL` está presente y funciona.
- `JWT_SECRET` existe.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` existen para seed local.
- `.env` está ignorado por Git.
- `.env.example` no contiene secretos reales detectados.

### Login y configuración

- Login admin correcto.
- Login technician de prueba correcto.
- `GET /api/auth/session` devuelve rol admin válido.
- `GET /api/operations/business-settings` carga configuración del negocio.
- Technician no puede editar configuración (`403`).

### Productos e inventario

- Producto de prueba creado con costo y precio.
- Entrada de stock de 5 unidades registrada.
- Stock quedó en 5.
- Movimiento `stock_entry` registrado con stock anterior/nuevo correcto.
- Technician no puede registrar entrada de stock (`403`).
- Salida manual de 1 unidad registrada.
- Stock quedó en 4.
- Ajuste `set` a 6 unidades registrado.
- Movimiento de ajuste dejó `previous_stock = 4`, `new_stock = 6`.
- Intento de salida mayor al stock rechazado (`409`).
- No se creó movimiento cuando la operación falló.
- Stock no quedó negativo.

### POS-lite

- Venta creada correctamente.
- Folio `VTA-00001` generado.
- Venta descontó stock.
- Movimiento `sale` registrado con referencia a venta.
- Detalle de venta carga items y `business_settings` para nota.
- Cancelación admin regresó stock.
- Movimiento `sale_cancel` registrado.
- Technician no puede cancelar venta (`403`).

### Reparaciones

- Cliente smoke creado.
- Reparación creada correctamente.
- Folio `REP-00001` generado.
- Reparación editada con marca, modelo, color, falla, condición, accesorios, diagnóstico, nota pública, nota interna, cotización, garantía y tracking.
- Cambio de estado generó evento.
- Pago/anticipo registrado.
- Saldo calculado correctamente antes de anulación.
- Pago aparece en detalle.
- Technician no puede anular pagos (`403`).
- Admin puede anular pagos.

### Piezas usadas, utilidad y margen

- Pieza usada desde inventario descontó stock.
- Movimiento `service_usage` registrado con referencia a reparación.
- Costo snapshot correcto.
- Costo total correcto.
- Utilidad bruta correcta.
- Margen bruto calculado.
- Concepto manual `Mano de obra` agregado sin afectar inventario.
- Resumen económico antes de anular:
  - ingreso: `55000`
  - costo: `18000`
  - utilidad: `37000`
  - margen bps: `6727`
- Technician no puede anular piezas (`403`).
- Admin anuló pieza usada.
- Stock regresó correctamente.
- Movimiento `service_usage_void` registrado.
- Pieza anulada no cuenta en totales activos.
- Resumen económico después de anular pieza:
  - ingreso: `20000`
  - costo: `0`
  - utilidad: `20000`

### Rastreo público

- Folio correcto + teléfono correcto encuentra reparación.
- Folio correcto + teléfono con `+52` encuentra reparación.
- Folio correcto + teléfono con espacios encuentra reparación.
- Folio correcto + teléfono con guiones encuentra reparación.
- Folio correcto + teléfono incorrecto devuelve mensaje genérico.
- Folio inexistente devuelve mensaje genérico.
- `tracking_enabled = false` oculta reparación.
- Respuesta pública no expone:
  - notas internas,
  - pagos,
  - piezas,
  - costos,
  - utilidad,
  - margen.

### Nota imprimible de reparación

Validación realizada por auditoría de código/CSS:

- Existe bloque `.repair-print-note`.
- Existe CSS `@media print` para ocultar sidebar, header, botones y vista operativa.
- El bloque imprimible no contiene `internalNotes`.
- El bloque imprimible no contiene costos, utilidad ni margen.
- La nota imprime datos útiles al cliente: negocio, folio, fecha, cliente, equipo, falla, condición, accesorios, diagnóstico público, total, pagado, saldo y garantía.

Pendiente recomendado: abrir en navegador y validar visualmente con Ctrl+P antes de usar notas reales en mostrador.

## Permisos backend validados

Admin puede:

- ajustar inventario,
- registrar entradas,
- registrar salidas,
- anular pagos,
- anular piezas,
- cancelar ventas,
- consultar configuración.

Technician no puede:

- editar configuración,
- registrar entrada de inventario,
- anular pagos,
- anular piezas,
- cancelar ventas.

La seguridad crítica está en backend, no solo en botones ocultos.

## Bugs encontrados y corregidos

### Pago anulado seguía contando como depósito en ciertos casos

En `GET /api/operations/repairs/:id`, el cálculo de `paidCents` usaba `depositCents` como fallback cuando los pagos activos sumaban 0. Eso podía hacer que un pago/anticipo anulado siguiera apareciendo como pagado.

Corrección:

- Si existen registros de pagos, se usa solo la suma de pagos activos.
- `depositCents` queda como fallback únicamente para reparaciones antiguas sin registros en `repair_payments`.

Archivo corregido:

- `apps/api/src/modules/operations/operations.routes.ts`

Validado en smoke test:

- Pago anulado dejó `paidCents = 0`.

## Bugs pendientes

- La validación visual real de impresión con Ctrl+P queda recomendada antes de operación diaria.
- Hay textos antiguos con mojibake visibles en algunos archivos de UI/seed heredados. No se corrigieron masivamente para no ampliar alcance ni introducir riesgo antes del Hito 6.
- Los datos de smoke test quedan en base real como evidencia; si se requiere limpieza posterior, hacerla con un script específico y aprobado.

## Estado final

Hito 5.1.2 aprobado funcionalmente por API contra Supabase real.

LocalPOS queda listo para avanzar al Hito 6 — Dashboard / Panel UI/UX Senior, con recomendación de realizar una última revisión visual manual de impresión y navegación en navegador.
## Nota posterior — Hito 6

El Hito 6 agregó el endpoint read-only `GET /api/operations/dashboard/summary` para alimentar el nuevo centro de mando del panel. Este cambio no reemplaza los smoke tests del Hito 5.1.2; complementa la lectura operativa del dashboard sin modificar flujos transaccionales de ventas, reparaciones o inventario.