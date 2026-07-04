# Hito 5.1.1 — Aplicación real, smoke test, hardening y estabilización operativa

Fecha: 2026-06-25

## Estado general

Este hito se ejecutó como estabilización previa al Hito 6. No se agregaron módulos grandes ni rediseño de panel. Se revisó la base construida en Hitos 4, 5 y 5.1: reparaciones, rastreo público, POS-lite, inventario operativo, migraciones y permisos críticos.

Estado final: **cerrado en código y validación local; pendiente de aplicación real de migraciones por falta de `DATABASE_URL` en el entorno actual**.

## DATABASE_URL

- `.env` en raíz: no existe.
- `apps/api/.env`: no existe.
- Variable `DATABASE_URL` en entorno: no disponible.
- `.gitignore` sí ignora `.env` y `.env.local`.
- `.env.example` fue sanitizado para usar placeholders y no credenciales reales.

No se imprimió ni se documentó ningún valor real de conexión.

## Migraciones auditadas

Migraciones pendientes/relevantes:

- `apps/api/drizzle/0003_square_power_man.sql`
- `apps/api/drizzle/0004_faulty_energizer.sql`

Revisión:

- No contienen `DROP TABLE`.
- No contienen `TRUNCATE`.
- No contienen `DELETE FROM`.
- No eliminan columnas.
- Agregan tablas, columnas, índices, constraints y valores enum.
- Las columnas nuevas críticas tienen `DEFAULT` o permiten `NULL`, por lo que son compatibles con datos existentes.

## Resultado de db:migrate

Comando esperado:

```bash
pnpm --filter @cellab/api db:migrate
```

Resultado en este entorno: **no ejecutable por falta de `DATABASE_URL`**.

Acción requerida en entorno real:

1. Crear `.env` local o configurar variables del entorno de despliegue.
2. Definir `DATABASE_URL` apuntando a PostgreSQL real.
3. Ejecutar:

```bash
pnpm --filter @cellab/api db:migrate
pnpm --filter @cellab/api db:seed
```

4. Ejecutar smoke test operativo con un usuario admin.

## Seguridad y permisos revisados

Rutas críticas protegidas correctamente:

- `POST /api/operations/inventory/stock-entry` → `admin`
- `POST /api/operations/inventory/stock-exit` → `admin`
- `POST /api/operations/inventory/adjust` → `admin`
- `POST /api/operations/repair-items/:id/void` → `admin`
- `POST /api/operations/repair-payments/:id/void` → `admin`
- `POST /api/operations/sales/:id/cancel` → `admin`
- `PATCH /api/operations/business-settings` → `admin`

Rastreo público:

- Usa rate limit.
- Valida folio y teléfono.
- Normaliza teléfono por últimos 10 dígitos.
- Respeta `tracking_enabled`.
- Responde mensaje genérico cuando no encuentra o no coincide.
- No expone notas internas, pagos, historial privado ni datos sensibles.

## Correcciones realizadas en este hito

1. `.env.example` sanitizado:
   - Se reemplazaron valores sensibles por placeholders.
   - Se agregó nota para no subir credenciales reales.
   - Se reforzó que `SUPABASE_SERVICE_ROLE_KEY` no debe exponerse en frontend.

2. Panel:
   - Se corrigió `sectionFromPath()` para reconocer recarga directa en `/panel/inventario/movimientos`.
   - La ruta ya no cae al dashboard al refrescar o abrir directamente.

## Smoke test local ejecutado

Se ejecutaron validaciones de compilación y tipos:

- `pnpm --filter @cellab/api typecheck`
- `pnpm --filter @cellab/web typecheck`
- `pnpm typecheck`
- `pnpm build`

Resultado final:

- pnpm --filter @cellab/api typecheck aprobado.
- pnpm --filter @cellab/web typecheck aprobado.
- pnpm typecheck aprobado.
- pnpm build aprobado.

El hito queda estable en código. La aplicación real de migraciones sigue pendiente hasta configurar DATABASE_URL.

## Smoke test manual pendiente con base real

Cuando exista `DATABASE_URL`, probar:

### Inventario

1. Crear producto `Pantalla prueba A05`.
2. Registrar entrada de 5 unidades.
3. Registrar salida manual de 1 unidad.
4. Registrar ajuste controlado.
5. Intentar salida mayor al stock y confirmar bloqueo.
6. Revisar `/panel/inventario/movimientos`.

### Reparaciones

1. Crear cliente.
2. Crear reparación y confirmar folio `REP`.
3. Completar diagnóstico, cotización, notas y garantía.
4. Registrar pago.
5. Agregar pieza desde inventario con descuento de stock.
6. Confirmar movimiento `service_usage`.
7. Confirmar costo snapshot, utilidad y margen.
8. Agregar concepto manual.
9. Anular pieza como admin.
10. Confirmar devolución de stock y movimiento `service_usage_void`.
11. Confirmar rechazo si technician intenta anular.
12. Imprimir nota y confirmar que no muestra notas internas.

### Rastreo público

1. Folio correcto + teléfono correcto.
2. Folio correcto + teléfono con `+52`.
3. Folio correcto + teléfono con espacios/guiones.
4. Folio correcto + teléfono incorrecto.
5. Folio inexistente.
6. Reparación con `tracking_enabled = false`.

### POS-lite

1. Crear producto con stock.
2. Crear venta y confirmar folio `VTA`.
3. Confirmar descuento de stock y movimiento `sale`.
4. Cancelar venta como admin.
5. Confirmar devolución de stock y movimiento `sale_cancel`.
6. Confirmar rechazo si technician intenta cancelar.

## Bugs encontrados

- `.env.example` contenía valores reales/sensibles. Corregido.
- `/panel/inventario/movimientos` no era reconocido por `sectionFromPath()` al abrir directamente. Corregido.
- No existe `DATABASE_URL` disponible en el entorno actual. Pendiente operativo.

## Pendientes técnicos

- Aplicar migraciones 0003 y 0004 contra PostgreSQL real.
- Ejecutar seed con credenciales reales seguras.
- Ejecutar smoke test manual con datos de prueba reales.
- Opcional: agregar un script automatizado de smoke test API cuando haya un entorno de staging estable.

## Recomendación para Hito 6

Avanzar al Hito 6 solo después de aplicar migraciones en la base real y completar el smoke test manual. Si el usuario todavía no tiene `DATABASE_URL`, se puede avanzar en diseño UI/UX del panel, pero marcando claramente que la validación operativa real sigue pendiente.
## Actualización — Migración aplicada en Supabase

Fecha: 2026-06-26

- Se confirmó que `.env` apunta al project ref autorizado: `kfnkkncpbhmlrlaczfhy`.
- Se ajustó la carga de variables del API y Drizzle para leer el `.env` de la raíz del monorepo aunque los scripts se ejecuten desde `apps/api`.
- `pnpm --filter @cellab/api db:migrate` ejecutado correctamente contra PostgreSQL real.
- La contraseña de base de datos quedó verificada porque la conexión autenticó, aplicó migraciones y permitió consultas de verificación.
- `pnpm --filter @cellab/api db:seed` ejecutado correctamente.
- Verificación SQL confirmada:
  - tablas principales presentes: `business_settings`, `users`, `clients`, `products`, `repairs`, `repair_items`, `repair_payments`, `sales`, `sale_items`, `inventory_movements`.
  - columnas de reparación presentes: `tracking_enabled`, `public_notes`, `warranty_until`.
  - columnas económicas de `repair_items` presentes: `cost_cents_snapshot`, `gross_profit_cents`, `gross_margin_bps`, `voided_at`.
  - enums de inventario presentes: `service_usage`, `service_usage_void`, referencia `repair`.
  - seed dejó 1 negocio y 1 usuario admin.
- Validaciones posteriores:
  - `pnpm typecheck` aprobado.
  - `pnpm build` aprobado.

Estado operativo: migraciones y seed aplicados correctamente en Supabase. Queda recomendado hacer smoke test manual desde UI antes del Hito 6.
## Actualización — Hito 5.1.2 funcional aprobado

Fecha: 2026-06-26

- Se ejecutó smoke test funcional real por API contra Supabase.
- Run ID: `SMOKE-1782439400843`.
- 40 checks aprobados.
- Se validaron login, business settings, productos, inventario, POS-lite, reparaciones, pagos, piezas usadas, anulación de piezas, permisos y rastreo público.
- Se corrigió el cálculo de pagos anulados en detalle de reparación.
- `pnpm typecheck` aprobado.
- `pnpm build` aprobado.