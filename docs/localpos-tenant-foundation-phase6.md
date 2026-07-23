# LocalPOS — Fundamento tenant-safe, Fase 6

## 1. Objetivo

Esta fase separa la identidad del negocio, la configuración y el acceso de los
usuarios. El objetivo es que cada sesión autenticada tenga un negocio y una
membresía validados en PostgreSQL, sin convertir todavía toda la operación en
multi-tenant.

> Fase 6 implementa el fundamento tenant. LocalPOS todavía no está autorizado
> para alojar un segundo negocio real.

CelLab Tuxtla continúa siendo una instalación single-business con base
exclusiva.

## 2. Estado anterior

Antes de esta fase:

- `business_settings` representaba identidad y configuración a la vez;
- `users.role` era la autoridad global;
- el JWT no incluía negocio ni membresía;
- configuración y módulos resolvían el primer `business_settings`;
- los usuarios no tenían una relación explícita con un negocio;
- 19 tablas operativas ya almacenaban `business_id`, pero referenciaban
  `business_settings.id`.

## 3. Primary key compartida

Se adoptó una relación uno a uno con primary key compartida:

```text
businesses.id = business_settings.id = UUID del negocio
```

El UUID preservado para CelLab es:

```text
00000000-0000-4000-8000-000000000001
```

`business_settings.id` dejó de autogenerarse y ahora referencia
`businesses.id` con `ON DELETE RESTRICT`. No se agregó una segunda columna
`business_id` a settings y no se modificaron las 19 foreign keys operativas.

## 4. Tabla `businesses`

La entidad canónica de identidad contiene:

- `id`;
- `name`;
- `slug` único;
- `status`: `active` o `inactive`;
- timestamps.

`businesses.name` es el nombre canónico. `business_settings.business_name`
permanece por compatibilidad y ambos valores se actualizan en una transacción
desde el PATCH de configuración.

## 5. Tabla `business_memberships`

La relación entre identidad y negocio contiene:

- `id`;
- `business_id`;
- `user_id`;
- `role`;
- `active`;
- timestamps.

Restricciones:

- negocio y usuario usan `ON DELETE RESTRICT`;
- una membresía por combinación negocio–usuario;
- índices por usuario, negocio y usuario/estado.

Semántica:

- `users.active`: bloqueo global de la identidad;
- `business_memberships.active`: acceso al negocio específico;
- `businesses.status`: disponibilidad completa del negocio.

## 6. Compatibilidad con `business_settings`

Se conservó el contrato actual de configuración. El GET y PATCH autenticados
usan exclusivamente `request.auth.businessId`; ya no usan `limit(1)`.

El navegador no puede elegir el negocio mediante body, query, header o
parámetro. Un `businessId` adicional en un payload no sustituye el contexto de
la sesión.

## 7. Compatibilidad temporal con `users.role`

`business_memberships.role` es la autoridad operativa del backend.

`users.role` sigue siendo obligatorio y se mantiene sincronizado durante el
modo single-business para no romper código histórico, seeds ni herramientas.
Debe retirarse en una fase posterior, cuando todas las superficies consuman
únicamente la membresía.

El estado que administra la vista de usuarios es el de la membresía. Desactivar
el acceso a CelLab no desactiva globalmente `users.active`.

## 8. Migración y backfill

La migración incremental es:

```text
0014_tenant_foundation
```

No se modificaron las migraciones `0000`–`0013`.

Comportamiento:

- base vacía: crea únicamente estructura;
- un settings existente: preserva su UUID y crea una membresía por usuario,
  copiando rol, estado y timestamps;
- varios settings sin usuarios: crea los negocios sin inventar membresías;
- usuarios sin settings: aborta;
- varios settings con usuarios globales: aborta con un error de mapeo ambiguo.

Los slugs no CelLab son deterministas y agregan el UUID para evitar colisiones.
El escenario ambiguo se validó dentro de una transacción: el error revirtió
también las tablas y constraints creadas por `0014`.

## 9. Seeds

El seed oficial crea o asegura, en orden:

1. negocio CelLab con UUID fijo;
2. settings con el mismo UUID;
3. caja `MAIN-01`;
4. identidad administrativa, si existen credenciales de entorno;
5. membresía administrativa activa.

El seed se ejecutó dos veces en una base limpia. El resultado fue un negocio,
un settings, una identidad admin, una membresía admin y una caja principal, sin
duplicados.

El seed demo crea negocio, settings, cuatro identidades, cuatro membresías,
módulos y datos operativos. Los perfiles `pos` y `cellab` permanecen
idempotentes y bloqueados fuera de una base local cuyo nombre contenga `demo`.

## 10. Nuevo contrato JWT

Un login válido firma:

```text
sub
membershipId
businessId
role
email
name
```

Se conservan HS256, issuer `cellab-api`, audience `cellab-panel` y la duración
configurada por `JWT_EXPIRES_IN`.

El rol firmado procede de la membresía. Si hay cero membresías activas se
responde `NO_ACTIVE_BUSINESS_MEMBERSHIP`. Si hay más de una, se responde
`MULTIPLE_BUSINESSES_NOT_SUPPORTED`; no se elige una con `limit(1)`.

## 11. Validación de sesión

`requireAuth` verifica la firma y vuelve a consultar PostgreSQL en cada
petición. Valida la relación exacta entre:

- sujeto del token;
- membresía;
- negocio;
- identidad activa;
- membresía activa;
- negocio activo;
- rol actual válido.

El rol efectivo siempre se toma de la membresía actual. Un cambio de rol,
revocación de membresía o suspensión del negocio se aplica en la siguiente
petición.

Los JWT anteriores, sin `membershipId` o `businessId`, reciben `401` y requieren
un nuevo login. No existe fallback al primer negocio.

`GET /api/auth/session` devuelve usuario, membresía y negocio actuales sin
renovar el token.

## 12. CRUD de membresías

El CRUD administrativo conserva las URLs de usuarios, pero opera sobre las
membresías del negocio autenticado:

- listado limitado al negocio de la sesión;
- creación de identidad y membresía en una transacción;
- rol y estado tomados de la membresía;
- nombre y correo globales mientras se mantenga single-business;
- correo global duplicado responde `409`;
- auto-desactivación y auto-degradación de admin bloqueadas;
- siempre se conserva al menos un admin activo.

El reset de contraseña sigue afectando a la identidad global. Esta compatibilidad
debe revisarse antes de reutilizar una identidad en varios negocios reales.

Los eventos de auditoría conservan la tabla actual y agregan `businessId`,
`membershipId` y `userId` en metadata cuando corresponde.

## 13. Configuración y módulos tenant-aware

Configuración, registro/listado de módulos y `requireModule` reciben el
`businessId` autenticado. Se eliminó el helper que seleccionaba el primer
negocio.

Se conservaron:

- dependencias entre módulos;
- módulos core;
- permisos actuales;
- auditoría;
- código `MODULE_DISABLED`.

Los llamados internos ajustados solo pasan el contexto autenticado o el negocio
ya controlado por la operación.

## 14. Cambios de frontend

Se mantiene:

```text
localStorage["cellab-panel-token"]
```

Al abrir el panel con token:

1. se consulta `/api/auth/session`;
2. se muestra un estado de validación;
3. sidebar y permisos visuales usan el rol de la sesión;
4. el nombre en memoria procede del negocio de la sesión;
5. cualquier `401` elimina el token y vuelve al login con mensaje.

El frontend ya no usa el rol decodificado del JWT como fuente principal. No se
agregó refresh token ni selector de negocio.

La vista de usuarios denomina el estado como “acceso al negocio”. También
advierte que el reset de contraseña es global.

## 15. Pruebas

Se agregó:

```text
npm run smoke:tenant-foundation -w @cellab/api
```

El smoke rechaza hosts remotos, Supabase, producción y bases cuyo nombre no
contenga `tenant` o `test`. Validó 17 casos:

1. login activo;
2. usuario sin membresía;
3. membresía inactiva;
4. identidad inactiva;
5. negocio inactivo;
6. JWT sin negocio;
7. JWT sin membresía;
8. revocación posterior al login;
9. suspensión posterior al login;
10. rol actualizado en la siguiente petición;
11. body sin autoridad sobre el negocio;
12. varias membresías sin selección arbitraria;
13. contrato de `/session`;
14. configuración aislada;
15. módulos aislados;
16. listado de usuarios aislado;
17. protección del último admin.

Los contratos de esquema verifican además las nuevas entidades y enum.

## 16. Validación local de migraciones

Se usó únicamente PostgreSQL Docker en `127.0.0.1:55432`.

### Base limpia

- `0000`–`0014`: aprobadas;
- seed ejecutado dos veces: aprobado;
- UUID CelLab, slug, admin, membresía y `MAIN-01`: preservados;
- smoke tenant: 17/17 aprobado.

### Base existente simulada

- estado inicial con `0000`–`0013`;
- cinco usuarios: admin, manager, staff, technician y viewer;
- `0014`: aprobada;
- mismo UUID y cinco membresías: aprobados;
- roles, estados y hash de contraseña: preservados;
- caja existente: preservada;
- login y `/session` de los cinco roles: aprobados.

### Base ambigua simulada

- dos settings y un usuario global;
- `0014`: abortó con mensaje explícito;
- transacción: rollback completo;
- settings y usuario originales: preservados.

No se ejecutó backfill ni migración sobre Supabase o una base real.

## 17. Compatibilidad funcional y demos

Sobre una base local single-business aislada aprobaron:

- permissions;
- modules;
- purchases;
- pos-complete;
- multi-register;
- cash-concurrency;
- release;
- warranty;
- reports;
- tenant-foundation.

El perfil `pos` conservó módulos core y reparaciones apagadas. El perfil
`cellab` conservó reparaciones activas. Ambos permitieron login administrativo,
`/session` y carga de módulos.

## 18. Riesgos y entidades todavía globales

Esta fase no completa el aislamiento de datos operativos:

- clientes, productos, proveedores y varias consultas operativas todavía
  conservan supuestos single-business;
- las 19 foreign keys operativas siguen apuntando a `business_settings.id`;
- `audit_logs` aún no tiene `business_id`;
- correo y contraseña pertenecen a una identidad global;
- reset de contraseña es global;
- no existe selector de negocio;
- no existen sucursales, planes ni suscripciones;
- el RLS habilitado en las tablas nuevas no sustituye el control de aplicación
  y todavía no representa una política multi-tenant completa.

Por estas razones no debe registrarse un segundo negocio real en la misma base.

## 19. Condiciones antes del segundo negocio

Antes de alojar un segundo negocio real se requiere, como mínimo:

1. inventariar y filtrar todas las consultas operativas por
   `request.auth.businessId`;
2. eliminar resoluciones por “primer settings” de ventas, caja, inventario,
   reparaciones, compras, apartados, garantías, reportes y rutas públicas;
3. tenantizar auditoría o definir una estrategia segura equivalente;
4. resolver selección explícita de membresía;
5. definir políticas RLS y rol de conexión coherentes con el despliegue;
6. probar aislamiento negativo entre dos negocios en todos los módulos;
7. definir administración de identidad compartida y reset de contraseña;
8. probar backup, restore y rollback con datos representativos.

## 20. Rollback y dictamen

No existe una migración destructiva de reversa automática. En una instalación
real el rollback seguro es:

1. detener escrituras;
2. restaurar el respaldo previo a `0014`;
3. desplegar el checkpoint anterior;
4. invalidar sesiones emitidas por la versión tenant-aware;
5. verificar salud, login y operación antes de reabrir.

En bases descartables puede recrearse la base desde `0000`–`0013`.

Dictamen:

- fundamento de identidad, membresía y sesión tenant-aware: implementado;
- compatibilidad single-business de CelLab y demos: validada;
- segundo negocio real en la misma base: **no autorizado**;
- siguiente paso recomendado: tenantizar de forma incremental las superficies
  operativas, empezando por catálogos y consultas de lectura.
