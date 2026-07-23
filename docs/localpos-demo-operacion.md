# Operación local de la demo LocalPOS

> Advertencia: estos comandos son exclusivamente para PostgreSQL local. Nunca uses el seed demo ni los comandos de reset contra producción, Supabase o una base con información real.

## Requisitos

- Node.js 20 o superior.
- Dependencias instaladas con `npm install`.
- Docker con el contenedor PostgreSQL local en ejecución.
- Puerto PostgreSQL local `55432`.
- Nombre de base exacto `localpos_demo`.

Los ejemplos usan PowerShell y el contenedor local `localpos-migration-audit-20260722`. Ajusta solamente el nombre del contenedor si cambia.

## 1. Confirmar PostgreSQL local

```powershell
docker ps --filter "name=localpos-migration-audit-20260722"
docker exec localpos-migration-audit-20260722 psql -U postgres -d postgres -tAc "select datname from pg_database where datname='localpos_demo'"
```

La base debe llamarse `localpos_demo`. No continúes si el host no es local o el nombre no contiene `demo`.

## 2. Construir DATABASE_URL local

Usa la contraseña local del contenedor sin escribirla en archivos versionados:

```powershell
$containerEnv = docker inspect --format '{{json .Config.Env}}' localpos-migration-audit-20260722 | ConvertFrom-Json
$dbPassword = (($containerEnv | Where-Object { $_ -like 'POSTGRES_PASSWORD=*' }) -split '=', 2)[1]
$env:DATABASE_URL = 'postgresql://postgres:' + [uri]::EscapeDataString($dbPassword) + '@127.0.0.1:55432/localpos_demo'
```

## 3. Crear y migrar la base

```powershell
docker exec localpos-migration-audit-20260722 createdb -U postgres localpos_demo
npm run db:migrate -w @cellab/api
```

Si la base ya existe, `createdb` avisará que existe y puedes continuar.

## 4. Credenciales locales de demo

Todos los usuarios usan la contraseña indicada en `DEMO_PASSWORD`. Para este workspace puede utilizarse:

```powershell
$env:DEMO_PASSWORD = 'DemoLocalPOS-2026!'
$env:ADMIN_EMAIL = 'admin@demo.localpos.test'
$env:ADMIN_PASSWORD = $env:DEMO_PASSWORD
```

Usuarios:

| Rol | Correo |
|---|---|
| Administrador | `admin@demo.localpos.test` |
| Gerente | `gerente@demo.localpos.test` |
| Cajero/staff | `caja@demo.localpos.test` |
| Consulta/viewer | `consulta@demo.localpos.test` |

Estas credenciales son ficticias y solo deben existir en la base local de demo.

## 5. Aplicar seeds

Perfil POS principal:

```powershell
$env:DEMO_PROFILE = 'pos'
npm run db:seed -w @cellab/api
npm run db:seed:demo -w @cellab/api
```

Perfil CelLab/taller:

```powershell
$env:DEMO_PROFILE = 'cellab'
npm run db:seed:demo -w @cellab/api
```

El seed demo es idempotente, no usa `TRUNCATE`, `DROP` ni borrados generales, y se bloquea si la base no es local o su nombre no contiene `demo`.

## 6. Levantar API

```powershell
$env:PORT = '3001'
$env:APP_URL = 'http://127.0.0.1:5173'
$env:RELEASE_VERSION = 'localpos-demo'
$env:SMOKE_TEST_MODE = 'false'
npm run dev -w @cellab/api
```

URLs:

- API: `http://127.0.0.1:3001`
- Liveness: `http://127.0.0.1:3001/health/live`
- Readiness: `http://127.0.0.1:3001/health/ready`

## 7. Levantar web

En otra terminal:

```powershell
$env:VITE_API_URL = ''
$env:VITE_DEV_API_TARGET = 'http://127.0.0.1:3001'
npm run dev -w @cellab/web -- --host 127.0.0.1
```

URLs:

- Landing: `http://127.0.0.1:5173/`
- Panel: `http://127.0.0.1:5173/panel`
- Rastreo: `http://127.0.0.1:5173/rastreo`

## 8. Resetear únicamente la base demo

Primero detén la API para liberar conexiones. Verifica tres veces el nombre antes de borrar:

```powershell
$databaseName = 'localpos_demo'
if ($databaseName -ne 'localpos_demo' -or $databaseName -notlike '*demo*') { throw 'Reset bloqueado' }
docker exec localpos-migration-audit-20260722 dropdb -U postgres --if-exists localpos_demo
docker exec localpos-migration-audit-20260722 createdb -U postgres localpos_demo
```

Después repite migraciones y seeds de las secciones 3–5.

## 9. Healthchecks

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/health/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/health/ready
```

Ambos deben responder `200`. Readiness debe indicar `database: ready`.

## 10. Detener procesos

- En terminal interactiva: `Ctrl+C`.
- Si se iniciaron en segundo plano, identifica primero el PID propietario del puerto:

```powershell
Get-NetTCPConnection -LocalPort 3001,5173 -State Listen | Select-Object LocalPort,OwningProcess
```

Detén únicamente los procesos de esta demo después de confirmar su comando y PID.

## Problemas comunes

### Puerto 3000 ocupado

La demo usa API `3001`; no es necesario detener el proceso externo del puerto 3000. Mantén `VITE_API_URL=http://127.0.0.1:3001`.

### Puerto 5173 ocupado

Vite elegirá otro puerto. Lee la URL mostrada en la terminal o inicia con `--port 5174` y abre esa dirección.

### Rate limit durante smokes

Solo para una API local de pruebas:

```powershell
$env:SMOKE_TEST_MODE = 'true'
```

Reinicia la API. Este modo no omite el límite cuando `NODE_ENV=production`. Para la demostración normal usa `false`.

### `MODULE_DISABLED`

El perfil POS apaga deliberadamente funciones avanzadas POS, taller, apartados, garantías, proveedores, compras y reportes avanzados. Activa el perfil correcto o usa Configuración con un usuario administrador.

### El seed demo se bloquea

Comprueba:

- host `127.0.0.1` o `localhost`;
- base cuyo nombre contenga `demo`;
- `NODE_ENV` distinto de `production`;
- `DEMO_PASSWORD` con al menos 10 caracteres.

### Aparecen datos smoke

No presentes esa base. Detén la API, resetea exclusivamente `localpos_demo`, aplica migraciones y ejecuta los seeds otra vez.
