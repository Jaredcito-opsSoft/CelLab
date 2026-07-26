# LocalPOS — Plan de limpieza remota para el piloto

Fecha: 2026-07-25

## Estado de autorización

`0014_tenant_foundation` está aplicada y verificada en Supabase. El propietario confirmó que todos los datos operativos actuales son descartables y que solo debe conservarse la cuenta administrativa real.

Este documento prepara la limpieza; no confirma que se haya ejecutado.

## Elementos protegidos

- Negocio CelLab en `businesses`.
- Identidad y configuración en `business_settings`.
- Las 15 entradas de `drizzle.__drizzle_migrations`.
- Usuario administrador `c6f0d352-0f5b-4793-80f0-932a58e56459`.
- Membership activa del administrador protegido.
- Estructura, enums, constraints, índices y migraciones.

Precondición: dentro de la misma transacción debe comprobarse que el usuario protegido existe, está activo, tiene rol admin y coincide con la identidad configurada. Si falla, ejecutar `ROLLBACK`.

## Limpieza automática autorizable

- 35 usuarios no protegidos y sus memberships.
- 17 productos.
- 16 clientes.
- 30 ventas y sus partidas, pagos y devoluciones.
- 10 reparaciones y sus eventos, piezas y pagos.
- 67 movimientos de inventario.
- 78 movimientos de caja.
- 28 sesiones de caja.
- 9 cajas `SMOKE-*`.
- 5 proveedores y 5 compras.
- Apartados, garantías y dependencias de prueba existentes.
- Auditoría vinculada a los datos eliminados.

No se usarán coincidencias parciales. La limpieza debe ejecutarse por el universo del único negocio, excluyendo explícitamente los IDs protegidos.

## Orden transaccional

1. Cerrar temporalmente la operación.
2. Tomar un respaldo final y verificar SHA-256.
3. Confirmar negocio único, ledger 15 y administrador protegido.
4. Crear tablas temporales con el negocio y usuario protegidos.
5. Eliminar hijos de garantías, devoluciones, ventas, apartados, compras y reparaciones.
6. Eliminar movimientos de inventario y caja.
7. Eliminar sesiones de caja.
8. Eliminar ventas, reparaciones, productos, clientes, proveedores y compras.
9. Eliminar auditoría de prueba.
10. Eliminar memberships y usuarios excepto el administrador protegido.
11. Normalizar la caja conservada.
12. Configurar módulos del piloto.
13. Validar invariantes antes de `COMMIT`.
14. Confirmar únicamente si todos los controles pasan.

## Estado de cajas

| Código | Activa | Predeterminada | Sesiones | Abiertas | Evidencia |
|---|---:|---:|---:|---:|---|
| `CAJA-01` | Sí | Sí | 17 | 1 | Caja histórica de pruebas |
| `SMOKE-01` | Sí | No | 2 | 0 | Smoke |
| `SMOKE-02` | Sí | No | 2 | 0 | Smoke |
| `SMOKE-03`–`SMOKE-09` | No | No | 7 | 0 | Smoke/carga |

Plan:

- Eliminar las sesiones y movimientos, incluida la sesión abierta, porque no representan operación real.
- Eliminar `SMOKE-01`–`SMOKE-09`.
- Reutilizar `CAJA-01` y normalizarla a `MAIN-01`, nombre `Caja principal`, activa y predeterminada.
- Resultado: una caja y cero sesiones abiertas.

## Módulos

Estado actual:

| Módulo | Estado |
|---|---|
| `core_pos` | Activo |
| `cash` | Activo |
| `inventory_basic` | Activo |
| `pos_advanced` | Activo |
| `layaways` | Activo |
| `repairs` | Activo |
| `public_tracking` | Activo |
| `suppliers` | Activo |
| `purchases` | Inactivo |
| `repair_parts` | Inactivo |
| `warranties` | Inactivo |
| `advanced_reports` | Activo |

Configuración inicial recomendada:

- Activos: `core_pos`, `cash`, `inventory_basic`.
- Inactivos: `pos_advanced`, `layaways`, `repairs`, `public_tracking`, `suppliers`, `purchases`, `repair_parts`, `warranties`, `advanced_reports`.

La desactivación debe comenzar por los módulos dependientes para respetar las reglas del backend.

## Folios

Recomendación: conservar los contadores actuales y no reutilizar folios. La interfaz quedará sin ventas previas, pero se mantiene trazabilidad técnica y se evita reutilizar identificadores.

## Validación previa al commit

- Negocios: 1.
- Settings: 1.
- Ledger: 15.
- Usuarios: 1.
- Admins activos: 1.
- Memberships: 1.
- Usuarios sin membership: 0.
- Productos, clientes, ventas y reparaciones: 0.
- Movimientos de inventario y caja: 0.
- Proveedores y compras: 0.
- Caja activa/default: `MAIN-01`.
- Sesiones abiertas: 0.
- Módulos núcleo activos y avanzados inactivos.

Después del commit se validarán healthchecks, login nuevo, sesión, settings, módulos, usuarios, inventario vacío, caja principal y reportes básicos vacíos. No se registrará una venta ficticia en Supabase.

## Rollback

Si cualquier invariante falla antes del commit, ejecutar `ROLLBACK`.

Si el problema se detecta después, cerrar el acceso, restaurar el respaldo final en una base nueva, validar ledger/conteos/administrador y reconfigurar la API únicamente después de healthchecks y login.

## Estado esperado

```text
Negocios: 1
Usuarios reales: 1
Caja activa predeterminada: MAIN-01
Sesiones abiertas: 0
Usuarios de prueba: 0
Productos: 0
Clientes: 0
Ventas: 0
Reparaciones: 0
Movimientos: 0
Proveedores: 0
Compras: 0
```

## Estado de ejecución

Plan ejecutado y validado el 2026-07-25.

- Ventana iniciada: 2026-07-25 21:31:16, hora de México.
- Respaldo post-0014 creado y restaurado antes de la limpieza.
- Dry run aprobado: 36 usuarios/36 memberships, con 35 eliminaciones y una identidad protegida.
- Limpieza confirmada en una única transacción `SERIALIZABLE`.
- Caja final: `MAIN-01`, `Caja principal`, activa y predeterminada.
- Sesiones abiertas: 0.
- Módulos activos: `core_pos`, `cash`, `inventory_basic`.
- Módulos restantes: registrados pero desactivados.
- Ledger: 15 migraciones.
- API remota: healthchecks, login, sesión y lecturas operativas aprobadas.
- Baseline limpio creado y restaurado localmente.

El detalle verificable se conserva en `docs/localpos-pilot-clean-baseline.md`.
