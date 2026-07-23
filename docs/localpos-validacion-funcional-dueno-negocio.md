# Validación funcional de LocalPOS como dueño de negocio

Fecha de validación: 2026-07-22
Rama: `codex/implementacion-real-localpos`
Commit base del árbol de trabajo: `8d92f14106f4e8308447f8ebde8d5004a40669ee`

## Entorno controlado

Toda la Fase 2 y la estabilización de Fase 3 se ejecutaron exclusivamente contra:

- API: `http://127.0.0.1:3001`
- PostgreSQL Docker: `127.0.0.1:55432`
- Base aislada: `localpos_audit`
- Contenedor: `localpos-migration-audit-20260722`

No se utilizó Supabase remoto. No se hizo `push`, `pull`, cambio de rama ni se ejecutaron pruebas contra datos reales.

Estado de salud posterior a los cambios:

- `GET /health/live`: `200 OK`
- `GET /health/ready`: `200 OK`, base de datos `ready`
- versión local reportada: `phase3-isolated-db`

## Migraciones confirmadas

La tabla `drizzle.__drizzle_migrations` contiene 14 registros cuyos hashes coinciden con los archivos `0000` a `0013`:

1. `0000_military_vision`
2. `0001_goofy_richard_fisk`
3. `0002_easy_iron_fist`
4. `0003_square_power_man`
5. `0004_faulty_energizer`
6. `0005_ancient_cassandra_nova`
7. `0006_simple_genesis`
8. `0007_panoramic_meteorite`
9. `0008_hard_midnight`
10. `0009_overjoyed_moonstone`
11. `0010_swift_ezekiel`
12. `0011_organic_daredevil`
13. `0012_late_songbird`
14. `0013_secure_supabase_data_api`

La Fase 3 no necesitó una migración nueva.

## Correcciones aplicadas en Fase 3

### Privacidad de costos

- `admin` y `manager` conservan acceso a costos.
- `staff`, `technician` y `viewer` ya no reciben `costCents` en catálogo ni búsquedas de productos.
- Los detalles de venta, devoluciones, apartados y conceptos de reparación omiten snapshots de costo y métricas de margen para roles no gerenciales.
- El filtrado se realiza en backend; la UI solo acompaña la restricción.
- `smoke:permissions` verifica visibilidad por los cinco roles y la privacidad del detalle de reparación.

### Caja principal inicial

- El seed oficial crea `MAIN-01 / Caja principal` si una instalación no tiene caja predeterminada.
- Si `MAIN-01` ya existe sin ser principal, la activa y la marca como predeterminada.
- No borra ni reemplaza otras cajas.
- El seed se ejecutó dos veces contra `localpos_audit`; quedó una sola caja principal y no se duplicó.

### Reportes

- Los reportes gerenciales JSON y CSV ahora requieren `advanced_reports`.
- Con el módulo apagado responden `403 MODULE_DISABLED`.
- Los reportes básicos continúan disponibles como núcleo, incluso para `viewer`.
- La navegación conserva “Reportes” para mostrar el resumen básico; la vista gerencial solo se monta para `admin`/`manager` cuando el módulo está activo.

### Reparaciones

Se definió una secuencia mínima:

- `received` → `diagnosis`
- `diagnosis` → `awaiting_authorization` o `in_repair`
- `awaiting_authorization` → `diagnosis` o `in_repair`
- `in_repair` → `testing` o `ready`
- `testing` → `in_repair` o `ready`
- `ready` → `testing` o `delivered`
- cancelación desde estados no terminales únicamente por `admin` o `manager`

Se permiten actualizaciones sin cambio de estado. No se reescribió el historial existente. El salto directo `received → delivered` devuelve `409 INVALID_REPAIR_TRANSITION`.

### Pruebas y rate limit

- `managerial-reports.test.ts` forma parte de `npm test`.
- Es una prueba de contrato pura y termina sin abrir conexiones PostgreSQL.
- Se agregó `SMOKE_TEST_MODE`, desactivado por defecto.
- El límite de login solo se omite cuando `SMOKE_TEST_MODE=true` y `NODE_ENV` no es `production`.
- Producción conserva el límite de 10 intentos por 15 minutos.
- Los nuevos smokes se niegan a ejecutar si `API_URL` no es `http://127.0.0.1:3001` o si `DATABASE_URL` no apunta a `127.0.0.1:55432/localpos_audit`.

## Validaciones técnicas finales

| Validación | Resultado |
|---|---|
| `npm test` | Aprobado: 9 pruebas, 4 suites y validación de codificación |
| `npm run typecheck` | Aprobado: web y API |
| `npm run build` | Aprobado: web y API |
| `git diff --check` | Aprobado; solo advertencias esperadas LF/CRLF |
| Seed oficial ejecutado dos veces | Aprobado, caja principal idempotente |

## Smokes finales

Todos se ejecutaron en un mismo lote contra la API 3001 y `localpos_audit`.

| Smoke | Resultado | Cobertura principal |
|---|---|---|
| `smoke:permissions` | Aprobado | Roles, mutaciones y privacidad de costos |
| `smoke:modules` | Aprobado | Dependencias, módulos core y auditoría |
| `smoke:purchases` | Aprobado | Compra, recepción, stock, costo y movimiento |
| `smoke:pos-complete` | Aprobado | Pago mixto, devolución parcial y apartado |
| `smoke:multi-register` | Aprobado | Dos cajas, ventas, devolución, aislamiento y cierre |
| `smoke:cash-concurrency` | Aprobado | Nueve terminales, nueve ventas y folios únicos |
| `smoke:release` | Aprobado | Salud, auth y operación principal de solo lectura |
| `smoke:warranty` | Aprobado | `GAR-*`, vigencia, permisos, estados, eventos, cierre y privacidad pública |
| `smoke:reports` | Aprobado | Básicos, módulo avanzado, rol viewer y CSV |

## Matriz funcional final

| Módulo | Flujo probado | Rol usado | Resultado | Estado final | Demo principal |
|---|---|---|---|---|---|
| Salud y PostgreSQL | Liveness y readiness | Público | Aprobado | Funcional para demo principal | Sí |
| Usuarios y permisos | Alta de usuarios y restricciones por rol | Admin y roles ampliados | Aprobado | Funcional para demo principal | Sí |
| Clientes | Alta y consulta | Admin/staff | Aprobado | Funcional para demo principal | Sí |
| Caja simple | Caja principal, apertura, movimientos y cierre | Admin | Aprobado | Funcional para demo principal | Sí |
| POS simple | Venta, folio, ticket e historial | Staff/admin | Aprobado | Funcional para demo principal | Sí |
| Inventario básico | Alta, entrada, ajuste, venta, kardex y stock bajo | Admin/staff | Aprobado | Funcional para demo principal | Sí |
| Reportes simples | Ingreso, ventas, reparaciones, stock bajo y movimientos | Todos los roles lectores | Aprobado | Funcional para demo principal | Sí |
| Privacidad de costos | Catálogo y taller sin costos para roles operativos | Cinco roles | Aprobado | Funcional para demo principal | Sí |
| Proveedores y compras | Proveedor, orden, recepción y `purchase_receipt` | Admin/staff | Aprobado | Funcional pero demo secundaria | No |
| Reparaciones | `REP-*`, secuencia técnica, pagos, piezas y entrega | Technician/staff/admin | Aprobado | Funcional pero demo secundaria | No |
| Rastreo público | Folio y teléfono sin datos internos | Público | Aprobado | Funcional pero demo secundaria | No |
| Pagos mixtos | Efectivo más tarjeta | Admin | Aprobado | Funcional pero demo secundaria | No |
| Devoluciones parciales | `DEV-*`, reembolso y retorno de inventario | Admin/manager | Aprobado | Funcional pero demo secundaria | No |
| Apartados | `APA-*`, reserva, abono, liquidación y entrega | Admin/staff | Aprobado | Funcional pero demo secundaria | No |
| Cajas físicas | Dos cajas y cierres independientes | Admin | Aprobado | Funcional pero demo secundaria | No |
| Concurrencia local | Nueve cajas y ventas simultáneas | Admin | Aprobado localmente | Funcional pero demo secundaria | No |
| Garantías | `GAR-*`, vigencia, estados, eventos y cierre | Admin/technician | Aprobado | Funcional pero demo secundaria | No |
| Reportes gerenciales | JSON, costos, márgenes, caja y CSV | Admin/manager | Aprobado con módulo | Funcional pero demo secundaria | No |

## Liberado para la demo principal

La demostración principal puede enfocarse de forma honesta en:

- login y usuarios básicos;
- clientes;
- apertura y cierre de caja;
- venta simple;
- ticket e historial;
- inventario básico y kardex;
- stock bajo;
- reportes operativos simples.

Esta sigue siendo la propuesta comercial del piloto: ordenar ventas, caja, inventario básico y reportes simples.

## Disponible solo como demo secundaria

- proveedores y compras;
- reparaciones y rastreo público;
- pagos mixtos;
- devoluciones parciales;
- apartados;
- cajas físicas;
- garantías;
- reportes gerenciales activables.

Estos flujos tienen validación funcional, pero no deben desplazar el mensaje simple del piloto ni presentarse como cobertura universal para cualquier giro.

## Fuera de la demo o no vender todavía

- multiempresa o multi-tenant real;
- facturación fiscal;
- respaldo automático y restauración operativa probada;
- certificación de 100 a 500 ventas diarias sostenidas;
- integraciones externas no confirmadas;
- promesa de operación productiva sin checklist de infraestructura, respaldo y monitoreo.

## Pendientes antes de preparar la demo

1. Crear el seed de datos demostrativos únicamente cuando se autorice la siguiente fase.
2. Crear la guía de demo limpia únicamente cuando se autorice.
3. Hacer un recorrido visual final de reportes simples/avanzados y estados de reparación.
4. Mantener el piloto en la base aislada hasta definir infraestructura de despliegue y respaldo.

No se creó `seed-demo.ts`, no se creó `localpos-demo-limpia.md` y no se modificó multi-tenant.
