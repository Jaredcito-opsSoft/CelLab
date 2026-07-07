# Hito 11 - Usuarios, roles, permisos y auditoria inicial

Fecha: 2026-07-05

## Objetivo

Formalizar la administracion de usuarios de LocalPOS / CelLab Tuxtla con roles ampliados, permisos backend por accion y una primera tabla de auditoria para cambios sensibles.

## Alcance

- Se amplio `user_role` a `admin`, `manager`, `staff`, `technician` y `viewer`.
- Se agrego `users.last_login_at`.
- Se creo `audit_logs` para registrar actor, rol, accion, entidad, resumen y metadata.
- Se agrego CRUD operativo de usuarios bajo `/api/operations/users`, solo para `admin`.
- Se agrego lectura de auditoria bajo `/api/operations/audit-logs`, solo para `admin`.
- `requireAuth` ahora valida usuario activo y rol vigente en base de datos en cada request.
- Se agregaron permisos backend por accion en ventas, caja, inventario, reparaciones, productos, clientes y configuracion.
- Se agrego UI administrativa de usuarios y auditoria dentro de `/panel/configuracion`.
- Se restringio la lectura y escritura de costos/margenes de reparacion a `admin` y `manager`.

## Matriz inicial de roles

| Rol | Intencion | Permisos principales |
| --- | --- | --- |
| admin | Dueno/superadmin operativo | Todo, usuarios, configuracion, anulaciones, archivados criticos |
| manager | Encargado | Caja, inventario, productos y operacion diaria sin CRUD de usuarios |
| staff | Mostrador/cajero | Ventas, clientes, recepcion y pagos de reparacion |
| technician | Taller | Reparaciones, diagnostico, eventos y conceptos de servicio |
| viewer | Consulta | Lectura de panel/reportes sin mutaciones |

## Backend

Archivos principales:

- `apps/api/src/db/schema.ts`
- `apps/api/drizzle/0007_panoramic_meteorite.sql`
- `apps/api/src/lib/roles.ts`
- `apps/api/src/lib/audit.ts`
- `apps/api/src/middlewares/auth.ts`
- `apps/api/src/modules/users/users.routes.ts`
- `apps/api/src/modules/audit/audit.routes.ts`
- `apps/api/src/modules/operations/operations.routes.ts`
- `apps/api/src/modules/sales/sales.routes.ts`
- `apps/api/src/modules/cash/cash.routes.ts`
- `apps/api/src/modules/inventory/inventory.routes.ts`
- `apps/api/src/modules/settings/business-settings.routes.ts`
- `apps/api/src/main.ts`
- `apps/api/src/scripts/smoke-permissions.ts`
- `apps/api/package.json`

## Frontend

Archivos principales:

- `apps/web/src/modules/users/UserAdminView.tsx`
- `apps/web/src/pages/PanelPage.tsx`
- `apps/web/src/modules/cash/CashViews.tsx`
- `apps/web/src/modules/inventory/InventoryViews.tsx`
- `apps/web/src/modules/repairs/RepairViews.tsx`
- `apps/web/src/modules/sales/SalesViews.tsx`
- `apps/web/src/styles/panel.css`

## Auditoria inicial

Acciones registradas:

- Usuarios: crear, actualizar, activar/desactivar, reset de contrasena.
- Configuracion: actualizar datos del negocio.
- Productos/inventario: crear, actualizar, archivar, entradas, salidas y ajustes.
- Ventas: crear y cancelar.
- Caja: abrir, movimiento manual y cerrar.
- Reparaciones: crear, actualizar, cambiar estado, eventos, pagos, conceptos y anulaciones.
- Clientes: crear, actualizar y archivar.

## Proteccion de costos y margenes

- `admin` y `manager` pueden ver costos, utilidad y margen en reparaciones.
- `staff`, `technician` y `viewer` reciben costos/margenes enmascarados desde backend.
- Si `technician` agrega un concepto manual y envia `costCents`, el backend ignora ese costo y guarda costo manual en 0.
- La UI oculta costos de productos, costo manual, utilidad y margen a roles no gerenciales.

## Compatibilidad

- Usuarios existentes con `admin` o `technician` siguen siendo validos.
- El rol default del schema sigue siendo `technician` para no romper seeds o datos antiguos.
- Las rutas publicas y operativas existentes se conservan.
- La UI oculta o deshabilita acciones segun rol, pero el bloqueo real vive en backend.

## No implementado

- No se agrego recuperacion por correo, invitaciones ni MFA.
- No se implemento multiempresa, sucursales ni usuarios por sede.
- No se agrego una suite automatizada completa con fixtures transaccionales; queda como parte de Hito 18/hardening.
- No se creo auditoria exhaustiva de lecturas, solo de mutaciones sensibles.

## Validacion

- `npm run db:generate -w @cellab/api`: aprobado, genero `0007_panoramic_meteorite`.
- `npm run db:migrate -w @cellab/api`: aprobado, migraciones aplicadas correctamente.
- `npm run typecheck -w @cellab/web`: aprobado.
- `npm run typecheck -w @cellab/api`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado.
- `API_URL=http://127.0.0.1:3000 npm run smoke:permissions -w @cellab/api`: aprobado contra API local + base migrada.
- Smoke visual autenticado en `/panel/configuracion`:
  - Desktop 1366x768: usuarios y auditoria visibles, sin overflow horizontal, sin errores de consola, sin mojibake.
  - Movil 390x844: usuarios y auditoria visibles, sin overflow horizontal, sin errores de consola, sin mojibake.
- Barrido de mojibake en `apps/api/src`, `apps/web/src`, `docs` y `.codex`: sin hallazgos.

## Pendientes

- En Hito 18, agregar pruebas automatizadas de permisos para:
  - `staff` no cancela ventas.
  - `technician` no registra pagos ni toca caja.
  - `viewer` no muta datos.
  - Solo `admin` crea usuarios y lee auditoria.
  - `technician` no puede persistir costos manuales ni ver margenes.
