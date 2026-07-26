# LocalPOS — Ensayo local de limpieza para piloto

Fecha: 2026-07-25
Base: `localpos_cleanup_rehearsal`
Origen: clon de `localpos_restore_pristine` después de 0014

## Controles previos

- Base local, no Supabase.
- PostgreSQL 17 en `127.0.0.1:55433`.
- Nombre verificado: `localpos_cleanup_rehearsal`.
- 1 negocio y 1 `business_settings`.
- 2 admins activos permanecerían.
- El UUID CelLab se preservó.
- La caja principal existente se conservó.

## Eliminación ensayada

Solo se incluyeron entidades `CONFIRMADO_SMOKE`.

| Recurso | Eliminadas |
|---|---:|
| Usuarios | 33 |
| Memberships | 33 |
| Productos | 9 |
| Clientes | 8 |
| Ventas | 15 |
| Sale items | 15 |
| Sale payments | 17 |
| Devoluciones | 2 |
| Reparaciones | 7 |
| Repair events | 23 |
| Repair items | 8 |
| Repair payments | 2 |
| Proveedores | 5 |
| Compras | 5 |
| Purchase items | 5 |
| Apartados | 1 |
| Layaway items | 1 |
| Layaway payments | 2 |
| Inventory movements | 37 |
| Cash movements | 25 |
| Cash sessions | 11 |
| Cash registers | 9 |
| Audit logs vinculados | 82 |

La operación se ejecutó dentro de una transacción y se confirmó únicamente en la copia local.

## Estado posterior

| Recurso | Restante |
|---|---:|
| Negocios | 1 |
| Settings | 1 |
| Usuarios | 3 |
| Admins activos | 2 |
| Productos | 8 |
| Clientes | 8 |
| Ventas | 15 |
| Reparaciones | 3 |
| Cajas | 1 |
| Sesiones abiertas | 1 |

## Validación funcional posterior

- `/health/live`: 200.
- `/health/ready`: 200.
- Login admin: 200.
- `/api/auth/session`: 200.
- Settings: 200.
- Módulos: 200.
- Usuarios: 200.
- Productos: 200.
- Inventario/movimientos: 200.
- Ventas: 200.
- Caja: 200.
- Reportes básicos: 200.
- `smoke:release`: aprobado.

## Pendientes que bloquean la limpieza remota

1. Confirmar si los 8 productos `TST/SMOKE` restantes se pueden eliminar.
2. Confirmar los 6 clientes, 15 ventas y 3 reparaciones probables de prueba.
3. Confirmar si el técnico inactivo `s***@localpos.test` se elimina.
4. Decidir si se conserva `CAJA-01` o se normaliza a `MAIN-01`.
5. Cerrar operativamente la sesión abierta.
6. Definir módulos activos del primer piloto; actualmente siguen activos `advanced_reports`, `layaways`, `pos_advanced`, `public_tracking`, `repairs` y `suppliers`.

No debe trasladarse la limpieza a Supabase hasta resolver estos puntos y tomar un respaldo final inmediatamente antes de la ventana de mantenimiento.

## Ejecución remota autorizada

Las decisiones pendientes del ensayo quedaron resueltas por autorización expresa del propietario: todo el contenido operativo era de prueba y solo debía conservarse la identidad administrativa real.

La ejecución remota:

- usó una sola transacción con aislamiento `SERIALIZABLE`;
- verificó negocio, settings, ledger, usuario y membership protegidos antes de borrar;
- siguió el orden real de claves foráneas;
- no utilizó `TRUNCATE`, `DROP`, seeds ni coincidencias parciales;
- reemplazó las cajas de prueba por una única `MAIN-01`;
- normalizó las 12 filas de módulos;
- validó todos los invariantes antes de confirmar;
- habría revertido la transacción completa ante cualquier diferencia.

Los smokes de escritura posteriores se ejecutaron exclusivamente sobre una restauración local del estado limpio. No se reintrodujeron datos de prueba en Supabase.
