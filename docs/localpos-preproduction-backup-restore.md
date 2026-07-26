# LocalPOS — Gate de respaldo, restauración y migración 0014

Fecha de ejecución: 2026-07-25
Rama: `codex/preprod-backup-restore-0014-audit`
SHA de aplicación: `399272648351f39ca9099fd74d6deb6120b7ac2a`

## Alcance y seguridad

El origen fue el proyecto Supabase de CelLab autorizado para el piloto. El gate inicial se ejecutó con consultas de solo lectura. La migración remota `0014_tenant_foundation` fue autorizada y aplicada el 2026-07-25 después de validar respaldo, restauración y ensayo local.

No se ejecutaron seeds, smokes de escritura, limpieza, despliegues ni cambios manuales de esquema. Los smokes y el ensayo destructivo de limpieza permanecieron exclusivamente en PostgreSQL Docker local.

## Preflight del origen

- PostgreSQL: 17.6.
- Base y usuario: confirmados mediante conexión SQL.
- Negocios en `business_settings`: 1.
- Ledger Drizzle: 14 entradas.
- Migraciones presentes: `0000`–`0013`.
- Migración ausente: `0014_tenant_foundation`.
- Los 14 hashes coinciden con los archivos locales. En Windows fue necesario normalizar CRLF a LF para comparar `0007`–`0013`; los archivos no se modificaron.

La conexión Session Pooler usa TLS 1.3 con `TLS_AES_256_GCM_SHA384`. `pg_stat_ssl` muestra el tramo interno pooler→PostgreSQL y por ello reporta `ssl = false`; `psql \conninfo` confirmó el cifrado real cliente→pooler.

## Inventario inicial

| Recurso | Filas |
|---|---:|
| `business_settings` | 1 |
| `users` | 36 |
| `categories` | 0 |
| `products` | 17 |
| `clients` | 16 |
| `repairs` | 10 |
| `sales` | 30 |
| `sale_items` | 32 |
| `sale_payments` | 32 |
| `sale_returns` | 2 |
| `inventory_movements` | 67 |
| `cash_registers` | 10 |
| `cash_sessions` | 28 |
| `cash_movements` | 78 |
| `business_modules` | 10 |
| `suppliers` | 5 |
| `purchases` | 5 |
| `audit_logs` | 219 |
| `folio_counters` | 5 |
| Ledger Drizzle | 14 |

Métricas adicionales:

- Usuarios activos: 32.
- Productos activos: 17.
- Cajas activas: 3.
- Sesiones abiertas: 1.
- Ventas activas/no canceladas: 23.
- `businesses`: no existía antes de 0014.
- `business_memberships`: no existía antes de 0014.

## Respaldo

- Archivo: `localpos-preprod-before-0014-20260725-012516.dump`.
- Ubicación: `%LOCALAPPDATA%\LocalPOS\preprod-backups\`.
- Formato: PostgreSQL custom.
- Esquemas: `public`, `drizzle`.
- Tamaño: 174,881 bytes.
- SHA-256: `AA38E6A85005F8A2BBA1298B2C4C91298FA3C0F0ACB82E0640E6496CD4738145`.
- `pg_dump`: PostgreSQL 17.10.
- Duración: 22.52 segundos.
- Manifiesto externo: `localpos-preprod-before-0014-20260725-012516.manifest.txt`.

El dump y su manifiesto están fuera del repositorio y no contienen cadenas de conexión, contraseñas, JWT ni claves API.

## Restauración aislada

- Contenedor: `localpos-restore-0014`.
- PostgreSQL: 17.
- Puerto local: 55433, porque 55432 estaba ocupado por una auditoría aislada anterior.
- Base pristine: `localpos_restore_pristine`.
- Base de smokes: `localpos_restore_smoke_test`.
- Base de limpieza: `localpos_cleanup_rehearsal`.
- Entradas en el TOC del dump: 315.
- Duración de restauración pristine: 1.37 segundos.
- Warnings: 0.
- Errores: 0.

## Comparación origen/restauración

Los 20 conteos de datos coinciden exactamente. También coinciden:

| Objeto | Supabase | Restauración |
|---|---:|---:|
| Secuencias | 1 | 1 |
| Enums | 14 | 14 |
| Índices | 121 | 121 |
| Foreign keys | 78 | 78 |
| Constraints | 160 | 160 |

Las huellas agregadas de IDs/password hashes de usuarios y configuración del negocio también coincidieron antes y después de 0014. No se mostró ni almacenó ningún password hash.

## API antes de 0014

La API se inició contra `localpos_restore_pristine`, todavía sin migrar:

- `/health/live`: 200.
- `/health/ready`: 200.
- No se ejecutó seed.
- No se crearon datos.

## Aplicación de 0014 en la copia

La migración se aplicó con el comando oficial:

```text
npm run db:migrate -w @cellab/api
```

Destino verificado:

- Host: `127.0.0.1`.
- Puerto: 55433.
- Base: `localpos_restore_pristine`.
- URL sin `supabase`.
- Ledger previo: 14.
- Dump SHA-256 intacto.

Resultado:

- Ledger posterior: 15.
- Última migración: `1784839402621` (`0014_tenant_foundation`).
- `businesses`: 1.
- `business_settings`: 1.
- `users`: 36.
- `business_memberships`: 36.
- UUID CelLab preservado: `00000000-0000-4000-8000-000000000001`.
- Usuarios sin membership: 0.
- Memberships huérfanas: 0.
- Roles distintos al rol legado: 0.
- Estados activos incoherentes: 0.
- Admins activos: 2.
- Los 20 grupos con `business_id` apuntan al UUID de CelLab.
- Ningún conteo operativo disminuyó.
- Las huellas agregadas de IDs/password hashes y settings no cambiaron.

## API después de 0014

- `/health/live`: 200.
- `/health/ready`: 200.
- Login nuevo: 200.
- `/api/auth/session`: 200.
- Membership presente y rol `admin`.
- `business.id`: UUID fijo de CelLab.
- Settings y módulos pertenecen al negocio autenticado.
- Usuarios, inventario, ventas y caja: 200.

## Aplicación remota de 0014

Destino confirmado:

- Supabase CelLab mediante `DATABASE_URL_MIGRATION`.
- Ledger previo: 14 entradas.
- Única migración pendiente: `0014_tenant_foundation`.
- Respaldo verificado con SHA-256 `AA38E6A85005F8A2BBA1298B2C4C91298FA3C0F0ACB82E0640E6496CD4738145`.
- Restauración y ensayo local aprobados.

La migración se aplicó con:

```text
npm run db:migrate -w @cellab/api
```

Resultado remoto:

- Ledger posterior: 15.
- `businesses`: 1.
- `business_settings`: 1.
- `business_memberships`: 36.
- `users`: 36.
- Usuarios sin membership: 0.
- Memberships huérfanas: 0.
- Roles incoherentes: 0.
- Estados activos incoherentes: 0.
- Admins activos: 2.
- UUID CelLab preservado.
- Conteos operativos y huellas agregadas de IDs/password hashes sin cambios.
- Todos los `business_id` operativos apuntan al negocio CelLab.

La validación API contra Supabase respondió `200` en healthchecks, login, sesión, settings, módulos, usuarios, productos, inventario, ventas, caja y dashboard. El login actualizó únicamente la marca temporal de acceso del administrador, como establece el flujo normal.

La lectura de módulos ejecuta `ensureBusinessModules()` y agregó idempotentemente dos filas faltantes del registro vigente. Por ello `business_modules` pasó de 10 a 12; no se alteraron las configuraciones existentes ni se creó información comercial.
## Pruebas y smokes

Validaciones base:

- `npm test`: 10/10.
- Codificación: 99 archivos.
- `npm run typecheck`: aprobado web/API.
- `npm run build`: aprobado web/API.
- `git diff --check`: aprobado.

Smokes:

| Smoke | Resultado | Observación |
|---|---|---|
| `tenant-foundation` | Aprobado | 29 escenarios. Se aisló porque deja negocios temporales para probar tenant safety. |
| `permissions` | Aprobado | Privacidad de costos y permisos por rol. |
| `modules` | Aprobado | Activación, dependencias y auditoría. |
| `release` | Aprobado | Salud, auth y operación principal. |
| `pos-complete` | Aprobado | Pago mixto, devolución y apartado. |
| `multi-register` | Aprobado | Dos cajas simultáneas y cierres independientes. |
| `cash-concurrency` | Aprobado | Nueve terminales y nueve ventas concurrentes. |
| `reports` | Aprobado | Reportes simples/avanzados, viewer y CSV. |

`smoke:tenant-foundation` no debe encadenarse antes de los smokes operativos en la misma copia: crea negocios temporales y expone que `cash.service.ts#getBusiness()` todavía toma el primer `business_settings`. Esto no afecta al piloto single-business, pero debe corregirse antes de declarar operación multiempresa real.

`smoke:reports` exige exactamente `127.0.0.1:55432`. Se usó temporalmente un proxy local hacia PostgreSQL 17 en 55433. El contenedor anterior fue reiniciado y su base `localpos_audit` permaneció intacta con 15 migraciones.

## Procedimiento de restauración

1. Verificar SHA-256 del dump.
2. Usar PostgreSQL/`pg_restore` 17.
3. Crear una base vacía.
4. Restaurar con `--no-owner --no-privileges`.
5. Comparar conteos, objetos y ledger.
6. Iniciar API y comprobar healthchecks.
7. Aplicar migraciones pendientes en orden solo después de confirmar el destino.

## Rollback propuesto para producción

Si 0014 falla en producción:

1. Cerrar el acceso operativo.
2. Detener API y frontend que dependan de 0014.
3. No modificar el dump validado.
4. Crear una base nueva y restaurar el dump previo.
5. Comparar SHA, conteos y ledger.
6. Reconfigurar la API hacia la base restaurada.
7. Verificar `/health/live`, `/health/ready`, login y operación principal.
8. Reabrir únicamente tras aprobar el smoke.

## Resultado del gate técnico

`0014` quedó aplicada y verificada en Supabase. La limpieza remota permanece separada hasta ejecutar el plan transaccional autorizado, conservar la cuenta administrativa real y normalizar caja, sesión y módulos del piloto.

## Respaldo posterior a 0014 y línea base limpia

La limpieza autorizada se ejecutó el 2026-07-25 únicamente después de crear y restaurar el respaldo posterior a `0014`:

- Dump: `localpos-post-0014-before-cleanup-20260725-213304.dump`.
- Formato: custom de PostgreSQL 17.
- Tamaño: 184,037 bytes.
- SHA-256: `0D77984F0736D0BEF52DBC5555681E670A07F91DD98823EB27BCEE2085AEA1F1`.
- Restauración: aprobada en PostgreSQL 17.
- Ledger restaurado: 15 migraciones.
- Conteos restaurados: 1 negocio, 36 usuarios y 36 memberships, idénticos al origen.
- API sobre la restauración: `/health/live` y `/health/ready` respondieron `200`.

Después de limpiar y validar el origen se creó el punto de recuperación del piloto:

- Dump: `localpos-pilot-clean-baseline-20260725-214800.dump`.
- Tamaño: 138,597 bytes.
- SHA-256: `F96DA4169FB3EB890BC85E628EAC3E9AAA963CB0EE8BF6E878D8F8FF232F1B75`.
- Restauración: aprobada en `localpos_pilot_clean_baseline_restore`.
- API restaurada: healthchecks, login y sesión respondieron `200`.
- Estado: 15 migraciones, 1 negocio, 1 configuración, 1 usuario, 1 membership, 1 caja y cero datos operativos.

Ambos dumps y sus manifiestos permanecen fuera del repositorio. No contienen secretos en sus nombres ni en la documentación.
