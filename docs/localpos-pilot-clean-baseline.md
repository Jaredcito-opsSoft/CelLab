# LocalPOS — Línea base limpia del piloto

Fecha: 2026-07-25

Rama de ejecución: `codex/preprod-backup-restore-0014-audit`

SHA de código y documentación previa: `73dce20e4afdbb4994f3868f4669f952689a7867`

## Alcance y controles

La operación dejó el proyecto Supabase autorizado como base inicial single-business de CelLab Tuxtla. No se modificaron migraciones, schema, backend, frontend, PWA, contratos API ni lógica monetaria.

No se ejecutaron seeds, smokes de escritura remotos, despliegues, push, merge, `TRUNCATE`, `DROP SCHEMA` ni `DROP DATABASE`. Las credenciales, hashes y datos personales no se imprimieron ni se registraron en este documento.

## Respaldo previo a la limpieza

Antes de borrar se generó un respaldo posterior a `0014`:

| Dato | Resultado |
|---|---|
| Archivo | `localpos-post-0014-before-cleanup-20260725-213304.dump` |
| Ubicación | Carpeta externa de respaldos LocalPOS |
| Formato | PostgreSQL custom |
| Tamaño | 184,037 bytes |
| SHA-256 | `0D77984F0736D0BEF52DBC5555681E670A07F91DD98823EB27BCEE2085AEA1F1` |
| `pg_dump` | 17 |
| PostgreSQL origen | 17.6 |
| Ledger | 15 migraciones |
| Duración | 13.99 segundos |

La restauración en PostgreSQL 17 terminó en 1.26 segundos. Coincidieron 15 entradas del ledger, todos los conteos de tablas, 128 índices, 439 constraints y 15 enums. La API restaurada respondió `200` en `/health/live` y `/health/ready`.

## Dry run

| Tabla | Actuales | Eliminadas | Conservadas |
|---|---:|---:|---:|
| `audit_logs` | 219 | 219 | 0 |
| `business_memberships` | 36 | 35 | 1 |
| `business_modules` | 12 | 0 | 12 |
| `business_settings` | 1 | 0 | 1 |
| `businesses` | 1 | 0 | 1 |
| `cash_movements` | 78 | 78 | 0 |
| `cash_registers` | 10 | 10 | 0 |
| `cash_sessions` | 28 | 28 | 0 |
| `categories` | 0 | 0 | 0 |
| `clients` | 16 | 16 | 0 |
| `folio_counters` | 5 | 5 | 0 |
| `inventory_movements` | 67 | 67 | 0 |
| `layaway_items` | 1 | 1 | 0 |
| `layaway_payments` | 2 | 2 | 0 |
| `layaways` | 1 | 1 | 0 |
| `product_compatibilities` | 0 | 0 | 0 |
| `products` | 17 | 17 | 0 |
| `purchase_items` | 5 | 5 | 0 |
| `purchases` | 5 | 5 | 0 |
| `repair_events` | 32 | 32 | 0 |
| `repair_items` | 9 | 9 | 0 |
| `repair_payments` | 7 | 7 | 0 |
| `repairs` | 10 | 10 | 0 |
| `sale_items` | 32 | 32 | 0 |
| `sale_payments` | 32 | 32 | 0 |
| `sale_return_items` | 2 | 2 | 0 |
| `sale_return_payments` | 2 | 2 | 0 |
| `sale_returns` | 2 | 2 | 0 |
| `sales` | 30 | 30 | 0 |
| `suppliers` | 5 | 5 | 0 |
| `users` | 36 | 35 | 1 |
| `warranty_claim_events` | 0 | 0 | 0 |
| `warranty_claims` | 0 | 0 | 0 |

El dry run verificó que el negocio, sus settings, el usuario protegido y su membership no aparecieran en las sentencias de eliminación.

## Transacción de limpieza

La limpieza se ejecutó una sola vez mediante una transacción con aislamiento `SERIALIZABLE`:

1. Bloqueo y validación del negocio, settings, ledger, usuario y membership protegidos.
2. Captura interna de los campos inmutables del administrador para compararlos antes de confirmar, sin imprimirlos.
3. Eliminación en orden de dependencias derivado de las claves foráneas.
4. Eliminación de cajas de prueba y creación de la caja inicial.
5. Normalización de módulos.
6. Validación de invariantes y conteos.
7. Confirmación atómica.

La identidad administrativa conservó su ID, email, nombre, password hash y estado. El login posterior actualizó únicamente `last_login_at` mediante el flujo normal.

## Estado final remoto

| Recurso | Estado |
|---|---|
| Ledger | 15 migraciones |
| Negocios | 1 |
| Configuraciones | 1 |
| Usuarios | 1 administrador activo |
| Memberships | 1 admin activa |
| Cajas | 1 |
| Caja principal | `MAIN-01`, activa y predeterminada |
| Sesiones abiertas | 0 |
| Productos y categorías | 0 |
| Clientes | 0 |
| Ventas, pagos, partidas y devoluciones | 0 |
| Reparaciones, piezas, pagos y eventos | 0 |
| Movimientos de inventario y caja | 0 |
| Proveedores y compras | 0 |
| Apartados y garantías | 0 |
| Folios | 0 |
| Auditoría de prueba | 0 |

Módulos activos:

- `core_pos`
- `cash`
- `inventory_basic`

Módulos desactivados:

- `advanced_reports`
- `layaways`
- `pos_advanced`
- `public_tracking`
- `purchases`
- `repair_parts`
- `repairs`
- `suppliers`
- `warranties`

## Validación remota de solo lectura

La API conectada al estado limpio respondió:

- `/health/live`: `200`.
- `/health/ready`: `200`.
- Login: `200`.
- Sesión, settings, módulos, dashboard, usuarios, productos, inventario, clientes, ventas, cajas y estado de caja: `200`.

Los conteos visibles fueron: un usuario, cero productos, cero movimientos de inventario, cero clientes, cero ventas y una caja `MAIN-01` cerrada.

## Validación local de escritura

Se creó un dump temporal del estado limpio y se restauró en PostgreSQL 17 local. En esa copia se ejecutaron:

- `npm test`: aprobado, 10/10.
- `npm run typecheck`: aprobado en web y API.
- `npm run build`: aprobado en web y API; PWA generada.
- `smoke:tenant-foundation`: aprobado, 29 escenarios, en una base aislada.
- `smoke:permissions`: aprobado.
- `smoke:modules`: aprobado.
- `smoke:release`: aprobado.
- `smoke:pos-complete`: aprobado.
- `smoke:multi-register`: aprobado.
- `smoke:cash-concurrency`: aprobado con 9 terminales y 9 ventas concurrentes.
- `smoke:reports`: aprobado.

El módulo `repairs` se habilitó únicamente en la copia desechable para el smoke que necesita crear una reparación. Ese cambio y todos los datos generados permanecieron fuera de Supabase.

## Smoke visual

Se verificaron landing, login, panel, venta rápida, inventario, clientes, caja, reportes y configuración. En escritorio y móvil se confirmaron:

- estados vacíos legibles;
- acciones directas para abrir caja, vender, consultar inventario y registrar producto/cliente;
- `MAIN-01` cerrada y lista para abrir;
- navegación móvil operativa;
- ausencia de datos smoke;
- ausencia de errores relevantes de consola, mojibake y respuestas `500`.

## Respaldo de línea base

| Dato | Resultado |
|---|---|
| Archivo | `localpos-pilot-clean-baseline-20260725-214800.dump` |
| Ubicación | Carpeta externa de respaldos LocalPOS |
| Formato | PostgreSQL custom |
| Tamaño | 138,597 bytes |
| SHA-256 | `F96DA4169FB3EB890BC85E628EAC3E9AAA963CB0EE8BF6E878D8F8FF232F1B75` |
| Ledger | 15 migraciones |
| Duración | 13.99 segundos |

El baseline fue restaurado en `localpos_pilot_clean_baseline_restore` en 1.33 segundos. La restauración confirmó un negocio, una configuración, un usuario, una membership, una caja y cero datos operativos. La API sobre esa copia respondió `200` en healthchecks, login y sesión.

## Recuperación

Ante un problema antes de cargar inventario real:

1. Cerrar el acceso operativo.
2. Verificar el SHA-256 del baseline.
3. Crear una base PostgreSQL 17 vacía.
4. Restaurar con `pg_restore --no-owner --no-privileges`.
5. Confirmar 15 migraciones y los conteos de esta línea base.
6. Apuntar temporalmente la API a la base restaurada.
7. Validar healthchecks, login, sesión, settings, módulos y caja.
8. Reabrir únicamente después del smoke.

## Dictamen

`BASE LIMPIA Y VALIDADA PARA DESPLIEGUE DE PREPRODUCCIÓN`
