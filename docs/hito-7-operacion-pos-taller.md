# Hito 7 — Operación real POS + taller

Fecha: 2026-06-28  
Producto: LocalPOS / CelLab Tuxtla

## Objetivo

Conectar la operación real de venta, taller, inventario, tickets, rastreo público y reportes básicos sin rediseñar por completo el panel ni romper los módulos existentes.

## Auditoría inicial

El sistema ya contaba con una base avanzada construida en hitos anteriores:

- Panel protegido con JWT, roles `admin` y `technician`.
- PostgreSQL + Drizzle.
- CRUD de clientes, productos y reparaciones.
- Folios `REP-*` y `VTA-*`.
- Ventas transaccionales con descuento de stock.
- Cancelación de ventas con devolución de stock.
- Movimientos de inventario para ventas, cancelaciones, entradas y ajustes.
- Reparaciones con eventos, pagos, conceptos/piezas y consumo de inventario.
- Rastreo público por folio + teléfono.
- Tickets HTML imprimibles de venta y reparación.

## Cambios implementados en este hito

### 1. Reportes básicos reales

Se agregó el endpoint autenticado:

- `GET /api/operations/reports/basicfrom=YYYY-MM-DD&to=YYYY-MM-DD`

Entrega:

- ventas completadas por rango;
- ingresos POS por rango;
- reparaciones pendientes actuales;
- reparaciones entregadas por rango;
- productos con bajo stock;
- movimientos recientes de inventario.

La vista `/panel/reportes` dejó de ser placeholder y ahora consume datos reales con filtro de fechas.

### 2. Reparaciones con estado de pago

El detalle de reparación ahora devuelve y muestra `paymentStatus` derivado:

- `pending` cuando no hay pagos activos;
- `partial` cuando hay pagos pero aún existe saldo;
- `paid` cuando el saldo queda en cero.

Esto no agrega columna nueva: se calcula desde `totalCents`, `paidCents` y `balanceCents`.

### 3. Tickets de reparación más operativos

La vista de reparación ahora permite imprimir dos notas HTML desde el navegador:

- Recepción de equipo.
- Entrega de reparación.

La nota de entrega incluye garantía; la nota de recepción se mantiene enfocada en datos iniciales del equipo.

### 4. Rastreo público más completo y seguro

El endpoint público de rastreo ahora devuelve `receivedAt`, y la UI muestra fecha de recepción además de última actualización.

La respuesta pública sigue limitada a datos seguros:

- folio;
- estado;
- equipo;
- fecha de recepción;
- última actualización;
- notas públicas;
- garantía si aplica;
- nombre del negocio.

No expone pagos, costos, utilidad, notas internas, inventario ni datos administrativos.

## Archivos modificados

- `apps/api/src/modules/operations/operations.routes.ts`
- `apps/api/src/modules/public/public.routes.ts`
- `apps/web/src/pages/PanelPage.tsx`
- `apps/web/src/modules/repairs/RepairViews.tsx`
- `apps/web/src/components/RepairTracker.tsx`
- `apps/web/src/styles/panel.css`

## Validaciones

- API typecheck: aprobado con `npm run typecheck -w @cellab/api`.
- Web typecheck: aprobado con `npm run typecheck -w @cellab/web`.
- Typecheck raíz: aprobado con `npm run typecheck`.
- Build producción: aprobado con `npm run build`.

## Nota de alcance

No se rediseñó el panel ni se modificaron rutas críticas existentes. El hito cerró brechas funcionales sobre la arquitectura actual.