# Gate controlado de preproducción

Fecha de revisión: 2026-07-24

Rama: `codex/preproduction-supabase-gate`

SHA base: `134458caf22416db75c6e04fdbcf987fe46a2ef9`

## Dictamen

**BLOQUEADO**

No se autoriza aplicar migraciones ni desplegar mientras exista cualquier
control bloqueante. Este documento no contiene secretos, cadenas de conexión,
datos personales ni credenciales.

## Controles

| Control | Estado | Evidencia | Bloqueante |
| --- | --- | --- | ---: |
| Código base | Aprobado | Rama creada exactamente desde `origin/main` en el SHA indicado | No |
| Árbol rastreado | Verificado | Índice y archivos rastreados limpios; elementos locales no rastreados excluidos | No |
| Service-role histórica | Bloqueado | Existe una clave con formato real en el historial; su revocación no está confirmada | Sí |
| Variables runtime | Verificado | API: `DATABASE_URL` y `JWT_SECRET`; web: `VITE_API_URL`; SDK Supabase ausente | No |
| Proyecto PostgreSQL | Verificado | La referencia de la conexión corresponde al proyecto esperado | No |
| TLS PostgreSQL | Bloqueado | La sesión auditada reportó TLS inactivo y la URL no exige `sslmode=require` | Sí |
| Negocio único | Verificado | `business_settings`: 1 registro | No |
| Objetos operativos | Verificado | Tablas núcleo y ledger Drizzle presentes | No |
| Ledger Drizzle | Verificado | `0000`–`0013` coinciden con los blobs LF canónicos de Git | No |
| Delta de migración | Preparado | Solo `0014_tenant_foundation.sql` está pendiente | Sí, hasta completar backup |
| Respaldo previo | Bloqueado | No se creó usando una conexión sin TLS | Sí |
| Restauración aislada | Bloqueado | Depende de un respaldo aprobado | Sí |
| Healthcheck restaurado | Pendiente | Depende de restauración aislada | Sí |
| Migración productiva | Bloqueado | Revocación, TLS, backup y restore siguen pendientes | Sí |
| Vercel SPA | Preparado | `apps/web/vercel.json` agrega fallback a `index.html` | No |
| Render bind | Preparado | API escucha explícitamente en `0.0.0.0` y `process.env.PORT` | No |
| Variables Supabase sobrantes | Preparado | Retiradas de `.env.example`; no forman parte del runtime | No |
| Fin de línea de migraciones | Preparado | `.gitattributes` fija LF sin alterar migraciones históricas | No |
| Push o despliegue | Pendiente | No autorizado en este gate | Sí |

## Diagnóstico PostgreSQL de solo lectura

- PostgreSQL: 17.6.
- Base: `postgres`.
- Esquemas portables de la aplicación: `public` y `drizzle`.
- TLS observado: inactivo.
- Ledger: 14 registros.
- Migraciones canónicas disponibles: 15 (`0000`–`0014`).

### Conteos de origen

| Recurso | Total |
| --- | ---: |
| `business_settings` | 1 |
| `users` | 36 |
| `products` | 17 |
| `clients` | 16 |
| `sales` | 30 |
| `repairs` | 10 |
| `cash_registers` | 10 |
| `cash_sessions` | 28 |

Los conteos son evidencia de diagnóstico, no datos de prueba. No se insertaron,
actualizaron ni eliminaron registros.

## Comparación del ledger

El algoritmo fue confirmado en la versión instalada de `drizzle-orm`:
`readMigrationFiles` calcula SHA-256 sobre el contenido SQL. Los hashes se
compararon contra los blobs LF de Git, no contra el worktree CRLF de Windows.

| Orden | Archivo local | Hash local canónico | Registro remoto | Coincide | Estado |
| ---: | --- | --- | ---: | ---: | --- |
| 0 | `0000_military_vision.sql` | `3de0e7ce0efc3a2514ef285bcd6b436e5484890884c55e88ef340c8498a34967` | 1 | Sí | Aplicada y coincidente |
| 1 | `0001_goofy_richard_fisk.sql` | `1142b68e51215e53366bff15edeb550abf4cfa5bf9796693ee066ca6d05c7375` | 2 | Sí | Aplicada y coincidente |
| 2 | `0002_easy_iron_fist.sql` | `da1a4b56da803b838446be6b431f67e978a710b90775bc9275e5b23940d26072` | 3 | Sí | Aplicada y coincidente |
| 3 | `0003_square_power_man.sql` | `9d99bbd4196cb865ce93b043cc01152e3727a8fa223ea1eb16a41e6821500eab` | 4 | Sí | Aplicada y coincidente |
| 4 | `0004_faulty_energizer.sql` | `dd3925f7212db2060c2d10e58562803fb2c3382f9b4edc3dce4c29cba5ccae9b` | 5 | Sí | Aplicada y coincidente |
| 5 | `0005_ancient_cassandra_nova.sql` | `18e231581df2b001718b41077025097cc8ce3368021be0492cb0590e5a22f0ae` | 6 | Sí | Aplicada y coincidente |
| 6 | `0006_simple_genesis.sql` | `7aec6d4b137074112d9c2eb1b108119c65a7f15a50ccfcbe1613fceadd6f8c16` | 7 | Sí | Aplicada y coincidente |
| 7 | `0007_panoramic_meteorite.sql` | `d6a6df31b552bf7bc998679de85c4bca8e7964e0a1a934cd63eaa79668707585` | 8 | Sí | Aplicada y coincidente |
| 8 | `0008_hard_midnight.sql` | `fd6fa8fd50ebbaef4734890dd1ec3c98aac710fe71f4a7a154ef9efd4823d0af` | 9 | Sí | Aplicada y coincidente |
| 9 | `0009_overjoyed_moonstone.sql` | `52fda6c150f9818927d8f661383e81fc3fb60b390b4aed8618bc76f91851470c` | 12 | Sí | Aplicada y coincidente |
| 10 | `0010_swift_ezekiel.sql` | `df869679f9788ddb86f7ed52ba83cdf43c368624b33c10d13a8405add940390f` | 13 | Sí | Aplicada y coincidente |
| 11 | `0011_organic_daredevil.sql` | `2035672bc5068c91489d74d8a1151577827b78d37c6bb2bf28a01959671c6446` | 14 | Sí | Aplicada y coincidente |
| 12 | `0012_late_songbird.sql` | `ef0a3388fcb451995e850ebc1fae9789447b4ba8ae6aa2cbbd3260ce820c7a0b` | 15 | Sí | Aplicada y coincidente |
| 13 | `0013_secure_supabase_data_api.sql` | `401ff76c59fb1756e6c9e7022b607e95907141d4f4d745c5ef467ba740b4c3f9` | 16 | Sí | Aplicada y coincidente |
| 14 | `0014_tenant_foundation.sql` | `a21e4eeae7a1125e5fcdbcb74a434a5e0a5f566edc4fb654cc942dc0aeb70086` | — | — | Pendiente |

Los saltos en el ID interno del ledger no implican migraciones intermedias
ausentes: el orden y los timestamps corresponden al journal `0000`–`0013`.

## Riesgo de fin de línea

El Git global de Windows usa `core.autocrlf=true`. El worktree convirtió
`0007`–`0014` a CRLF aunque sus blobs canónicos son LF. Ejecutar Drizzle desde
ese estado produciría hashes distintos. Se agregó una regla específica en
`.gitattributes` para que los SQL de migraciones se materialicen siempre con
LF. No se modificó el contenido de `0000`–`0013`.

## Acciones requeridas antes de desbloquear

1. Confirmar manualmente la revocación de la service-role histórica.
2. Sustituir localmente la conexión administrativa por una conexión directa
   con TLS obligatorio.
3. Repetir el diagnóstico y confirmar `pg_stat_ssl.ssl = true`.
4. Crear backup custom de `public` y `drizzle` fuera del repositorio.
5. Verificar catálogo, tamaño y SHA-256.
6. Restaurar en PostgreSQL Docker aislado y comparar conteos.
7. Levantar la API contra la restauración y aprobar `/health/live` y
   `/health/ready`.
8. Solo entonces solicitar autorización para aplicar `0014`.

## Configuración preparada, no desplegada

### Vercel

- Root Directory: `apps/web`.
- Install Command: `pnpm install --frozen-lockfile`.
- Build Command: `pnpm run build`.
- Output Directory: `dist`.
- Variable pública: `VITE_API_URL`.
- Ningún secreto backend o Supabase.

### Render

- Runtime: Node 22.
- Root Directory: raíz del repositorio.
- Build Command:
  `pnpm install --frozen-lockfile && pnpm --filter @cellab/api build`.
- Start Command: `node apps/api/dist/main.js`.
- Health Check Path: `/health/ready`.
- Auto Deploy: desactivado durante el gate.
- Sin comando pre-deploy de migraciones.
