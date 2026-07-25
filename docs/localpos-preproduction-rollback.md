# Rollback de preproducción LocalPOS

Este procedimiento aplica al piloto single-business. Debe completarse con los
IDs reales de despliegue y respaldo antes de abrir tráfico operativo.

## Principio obligatorio

**Bajar la versión del código no revierte automáticamente una migración de
base de datos.**

No ejecutar SQL inverso improvisado ni restaurar sobre producción sin una
decisión explícita sobre pérdida de datos y ventana de mantenimiento.

## Registro previo requerido

| Elemento | Valor |
| --- | --- |
| SHA candidato | `134458caf22416db75c6e04fdbcf987fe46a2ef9` |
| Último despliegue Vercel aprobado | Pendiente |
| Último despliegue Render aprobado | Pendiente |
| Respaldo previo a migración | Pendiente |
| SHA-256 del respaldo | Pendiente |
| Ledger previo | 14 registros (`0000`–`0013`) |
| Migración candidata | `0014_tenant_foundation.sql` |
| Responsable de decisión | Pendiente |
| RPO aceptado | Pendiente |

## Rollback de código

1. Cerrar temporalmente el acceso de operadores si existe riesgo de escritura.
2. Preservar logs, request IDs, SHA y hora del incidente.
3. Identificar el último despliegue verificado, no solo el commit anterior.
4. Si falla únicamente la web, promover el despliegue Vercel anterior.
5. Si falla la API sin cambios de base, promover el despliegue Render anterior.
6. Confirmar que web y API usan URLs compatibles.
7. Validar `/health/live` y `/health/ready`.
8. Ejecutar lecturas controladas antes de reabrir.

No conectar Vercel o Render a despliegue automático mientras el gate continúe
bloqueado.

## Incidente durante migración

1. Detener inmediatamente el runner de migraciones.
2. No reintentar automáticamente.
3. Conservar el nombre de la migración, sentencia fallida y logs sin secretos.
4. Bloquear nuevas escrituras.
5. Consultar el ledger y verificar si la migración registró un commit parcial.
6. No alterar manualmente `drizzle.__drizzle_migrations`.
7. Decidir entre una corrección compatible hacia adelante o restauración.

## Restauración de base

1. Confirmar autorización y pérdida potencial desde el timestamp del respaldo.
2. Verificar de nuevo el SHA-256 y el catálogo con `pg_restore --list`.
3. Mantener producción sin escrituras.
4. Restaurar primero en una base temporal y verificar que el procedimiento es
   reproducible.
5. Restaurar `public` y `drizzle` usando la conexión administrativa aprobada.
6. Comprobar ledger, constraints, índices y conteos de:
   - `business_settings`;
   - `users`;
   - `products`;
   - `clients`;
   - `sales`;
   - `repairs`;
   - `cash_registers`;
   - `cash_sessions`.
7. Iniciar la API contra la base restaurada.
8. Aprobar `/health/live` y `/health/ready`.
9. Validar login y lecturas seguras sin crear ventas ni alterar inventario.
10. Reabrir únicamente con aprobación del responsable.

## Criterios para abandonar el rollback

- El respaldo no es legible.
- El hash no coincide.
- Los conteos restaurados difieren sin explicación.
- El ledger es ambiguo.
- La API no alcanza readiness.
- Se desconoce cuánto dato operativo se perdería.

En cualquiera de estos casos se conserva el incidente bloqueado y se evita
improvisar cambios sobre la base.
