# LocalPOS — Auditoría tenant-ready

Fecha de auditoría: 2026-07-23
Rama: `codex/auditoria-tenant-ready`
Checkpoint de origen: `ef2fdd6957253ea277ab362b6ddffa205c3c6615`
Base utilizada: `localpos_tenant_audit` en PostgreSQL Docker local
Migraciones verificadas: `0000` a `0013` (14 registros)

## 1. Resumen ejecutivo

LocalPOS está listo para continuar como piloto **single-business** de CelLab Tuxtla. No está listo para registrar un segundo negocio dentro de la misma instalación.

La base presenta preparación parcial: 19 de 31 tablas físicas tienen `business_id` obligatorio y foreign key a `business_settings`. Sin embargo, la identidad autenticada no conoce un negocio, la API obtiene el primer registro de `business_settings`, y entidades centrales como usuarios, clientes, productos, proveedores, reparaciones, folios y auditoría son globales.

La prueba controlada confirmó que dos usuarios ficticios reciben el mismo negocio actual y comparten catálogo, clientes, reparaciones, reportes y auditoría. También fue posible modificar con el usuario A un cliente marcado como perteneciente al negocio B. Los registros B de ventas y cajas sí quedaron ocultos, pero también quedaron inaccesibles para el supuesto usuario B: no existe membresía ni selección de negocio en la sesión.

**Dictamen:** multi-giro/configurable está parcialmente implementado; multi-tenant no está implementado. CelLab puede operar de forma segura mientras la instalación y la base sean exclusivas para un solo negocio.

## 2. Alcance y limitaciones

La auditoría revisó:

- esquema Drizzle y migraciones `0000`–`0013`;
- cobertura, obligatoriedad, foreign keys e índices de `business_id`;
- autenticación, JWT, roles y desactivación de usuarios;
- rutas y consultas operativas;
- folios y restricciones únicas;
- reportes, rastreo público y auditoría;
- RLS de PostgreSQL;
- prueba API controlada con dos configuraciones de negocio y datos ficticios.

No se realizaron:

- migraciones nuevas;
- tabla de membresías;
- refactor de autenticación o rutas;
- implementación multi-tenant o de sucursales;
- cambios funcionales a la demo;
- pruebas contra `localpos_demo`;
- acceso a Supabase remoto;
- despliegue en red local o nube.

La clasificación usada es:

- **A:** seguro para el piloto CelLab single-business.
- **B:** parcialmente preparado para multi-tenant.
- **C:** debe corregirse antes de registrar un segundo negocio.
- **D:** riesgo crítico de fuga o mezcla si se usa con varios negocios.

## 3. Diferencia entre multi-giro y multi-tenant

### Multi-giro/configurable

Permite activar o desactivar funciones de acuerdo con el giro. LocalPOS ya puede operar como POS simple y habilitar módulos como taller, proveedores, compras, apartados, garantías y reportes avanzados mediante `business_settings` y `business_modules`.

### Multi-tenant

Permite que una instalación atienda varios negocios y garantiza que usuarios, clientes, productos, inventario, ventas, cajas, reparaciones, reportes y auditoría permanezcan separados.

La presencia de `business_id` en algunas tablas no basta. El tenant debe provenir de una sesión validada, todas las entidades operativas deben pertenecer directa o derivadamente al mismo negocio y cada consulta debe imponer ese límite.

## 4. Estado actual single-business

El supuesto arquitectónico vigente es: una base y una API atienden un negocio.

- El negocio actual se obtiene con `select ... from business_settings limit 1`.
- El seed oficial utiliza un UUID fijo para CelLab.
- No existe selección de negocio.
- No existe relación usuario-negocio.
- Los roles son globales.
- La mayoría de servicios ignoran cualquier segundo registro de `business_settings`.
- Las tablas con `business_id` reciben el ID del primer negocio.

Este modelo es coherente para el piloto de CelLab si se conserva una instalación exclusiva. Insertar una segunda empresa en la misma base crea estados inaccesibles o mezclados.

## 5. Modelo de negocios y configuración

No existe una tabla `businesses` separada. `business_settings` cumple simultáneamente dos funciones:

1. identidad del negocio;
2. configuración operativa y visual.

`business_modules` sí referencia de forma obligatoria a `business_settings` y su clave única es `(business_id, module_key)`.

Limitaciones:

- no hay estado, slug, plan o ciclo de vida independiente del negocio;
- no hay membresías;
- no hay sucursales;
- no hay tenant activo en la sesión;
- configuración, perfil público y módulos usan el primer negocio encontrado;
- no hay restricción que obligue a tener exactamente un solo registro.

Recomendación futura: crear una entidad `businesses`, mantener `business_settings` como relación 1:1 y definir membresías usuario-negocio. No es necesario para el piloto de una sola empresa.

## 6. Cobertura de `business_id`

Los 19 campos existentes son `NOT NULL` y tienen foreign key a `business_settings`. `layaway_items` y `sale_return_items` no tienen un índice que comience por `business_id`; en el resto sí existe un índice directo o compuesto.

Las foreign keys individuales no garantizan que dos registros relacionados pertenezcan al mismo negocio. Por ejemplo, una `sale_item` puede guardar un `business_id` distinto al de su `sale` porque no hay foreign key compuesta `(business_id, sale_id)`.

| Tabla o recurso | `business_id` | Obligatorio / FK / índice | Unicidad y herencia | Riesgo y acción futura | Clase |
|---|---:|---|---|---|:---:|
| `business_settings` | No aplica | Es la entidad usada como negocio | PK por `id`; admite varios registros | Separar identidad y settings antes de multi-tenant | A |
| `business_modules` | Sí | Sí / sí / sí | Única por negocio y módulo | Obtener negocio desde sesión | B |
| `cash_movements` | Sí | Sí / sí / sí | La sesión/referencia no valida negocio de forma compuesta | FKs compuestas o validación transaccional | B |
| `cash_registers` | Sí | Sí / sí / sí | Código y caja predeterminada únicos por negocio | Bien encaminada; usar tenant de sesión | B |
| `cash_sessions` | Sí | Sí / sí / sí | Caja abierta única por caja, no valida par negocio-caja | Validar relación compuesta | B |
| `inventory_movements` | Sí | Sí / sí / sí | Producto y usuario siguen globales | Hacer tenant-aware producto y actor | B |
| `layaways` | Sí | Sí / sí / sí | Folio global; cliente y usuario globales | Folio y relaciones por negocio | B |
| `layaway_items` | Sí | Sí / sí / no | Herencia no garantizada contra apartado/producto | Índice y FKs compuestas | B |
| `layaway_payments` | Sí | Sí / sí / sí | Herencia no garantizada contra apartado | FK compuesta | B |
| `product_compatibilities` | Sí | Sí / sí / sí | Única por negocio/producto/marca/modelo | Producto también debe tener negocio | B |
| `purchases` | Sí | Sí / sí / sí | Folio global; proveedor, reparación y usuarios globales | Tenantizar relaciones y folio | B |
| `repair_items` | Sí | Sí / sí / sí | Reparación y producto globales | Tenantizar padre y producto | B |
| `repair_payments` | Sí | Sí / sí / sí | Reparación y receptor globales | Tenantizar padre y actor | B |
| `sale_items` | Sí | Sí / sí / sí | No fuerza mismo negocio que venta/producto | FKs compuestas | B |
| `sale_payments` | Sí | Sí / sí / sí | No fuerza mismo negocio que venta/usuario | FKs compuestas | B |
| `sale_returns` | Sí | Sí / sí / sí | Folio global; venta y usuario no se validan por negocio | Folio y FKs compuestas | B |
| `sale_return_items` | Sí | Sí / sí / no | No fuerza mismo negocio que devolución/partida/producto | Índice y FKs compuestas | B |
| `sale_return_payments` | Sí | Sí / sí / sí | No fuerza mismo negocio que devolución/usuario | FKs compuestas | B |
| `sales` | Sí | Sí / sí / sí | Folio global; cliente y usuario globales | Folio y relaciones por negocio | B |
| `warranty_claims` | Sí | Sí / sí / sí | Folio global; reparación, cliente y usuarios globales | Tenantizar relaciones y folio | B |
| `categories` | No | No / no / no | Nombre único global | Agregar negocio y unicidad compuesta | C |
| `folio_counters` | No | No / no / no | Contador único por `scope` global | Usar `(business_id, scope)` | C |
| `purchase_items` | No | No / no / no | Deriva de compra, sin defensa propia | Agregar negocio o FK compuesta | C |
| `repair_events` | No | No / no / no | Deriva de reparación global | Agregar negocio o padre tenant-aware | C |
| `warranty_claim_events` | No | No / no / no | Deriva del reclamo, sin defensa propia | Agregar negocio o FK compuesta | C |
| `suppliers` | No | No / no / no | Nombre activo único global | Agregar negocio y filtrar rutas | D |
| `users` | No | No / no / no | Correo y rol globales | Crear membresías y roles por negocio | D |
| `clients` | No | No / no / no | Teléfono activo único global | Agregar negocio y filtrar rutas | D |
| `products` | No | No / no / no | SKU y código de barras globales | Agregar negocio y filtrar stock/catalogo | D |
| `repairs` | No | No / no / no | Folio global y rastreo global | Agregar negocio y filtrar rutas públicas/privadas | D |
| `audit_logs` | No | No / no / no | Bitácora compartida por instalación | Agregar negocio inmutable al evento | D |
| Sesiones/tokens | No existe tabla | JWT sin tenant | No hay membresía ni negocio activo | Incluir membresía validada y tenant activo | D |
| Reportes | Recurso virtual | Mezcla tablas scoped y globales | Catálogo y reparaciones son globales | Aplicar tenant a todas las fuentes | D |

Conteo:

- tablas físicas: A = 1, B = 19, C = 5, D = 6;
- auditoría extendida, incluyendo sesiones/tokens y reportes: A = 1, B = 19, C = 5, D = 8.

## 7. Usuarios, autenticación y roles

1. La API obtiene el negocio actual buscando el primer `business_settings`.
2. El JWT contiene `sub` (usuario), `role`, `email` y `name`.
3. El JWT **no contiene `businessId` ni membership ID**.
4. `requireAuth` vuelve a consultar `users` por ID y confirma que siga activo.
5. El frontend no envía `businessId` en los DTO operativos revisados.
6. No se detectaron rutas que confíen en un `businessId` libre del body, query o path.
7. Un usuario no pertenece formalmente a ningún negocio.
8. Los roles son globales en `users`.
9. Un usuario no puede representar membresías diferentes por negocio.
10. No existe tabla de membresías.
11. Un usuario desactivado queda bloqueado aunque conserve un JWT válido.
12. Cambiar IDs en URLs puede revelar o modificar datos globales; en tablas scoped el resultado depende de que cada ruta incluya el filtro.

El problema principal no es que el navegador pueda elegir un tenant arbitrario, sino que **ninguna identidad autenticada tiene tenant**. Todos los usuarios comparten el negocio que devuelve `limit(1)`.

Regla futura: resolver `{ userId, businessId, membershipId, role }` en backend; nunca aceptar el tenant operativo como autoridad desde el navegador.

## 8. Aislamiento de rutas y consultas

| Método / endpoint o grupo | Archivo | Filtro actual | Resultado/riesgo | Clase | Corrección futura |
|---|---|---|---|:---:|---|
| `POST /api/auth/login`, `GET /session` | `auth.routes.ts`, `auth.ts` | Usuario global por email/ID | La sesión no conoce negocio | D | Resolver membresía y tenant activo |
| CRUD `/operations/users` | `users.routes.ts` | Usuarios globales | Un admin ve y administra todos los usuarios | D | Scope por membresía/negocio |
| GET/PATCH `/business-settings` | `business-settings.routes.ts` | Primer negocio | Todos leen/editan el mismo registro | D | Buscar por tenant de sesión |
| GET/PATCH `/modules` | `modules.service.ts`, `modules.routes.ts` | Módulos del primer negocio | Usuario B recibe módulos A | D | Tenant de sesión |
| CRUD `/clients` | `operations.routes.ts` | Sin negocio | Lectura y modificación cruzada confirmada | D | `business_id` y filtro en todas las mutaciones |
| CRUD `/products`, categorías | `operations.routes.ts`, `catalog.routes.ts` | Sin negocio; compatibilidades usan el primero | Catálogo y stock compartidos | D | Tenantizar producto/categoría y transacciones |
| Inventario y movimientos | `inventory.routes.ts` | Movimiento por primer negocio; producto global | Movimiento scoped sobre stock global | D | Producto y movimiento con mismo negocio |
| GET/POST ventas | `sales.routes.ts`, `sales.service.ts` | Venta por primer negocio | Encabezado filtrado; catálogo/cliente/usuario global | B | Tenant desde sesión y FKs compuestas |
| Devoluciones/cancelación | `sales.service.ts` | Venta scoped, algunos hijos por relación | Riesgo si hijos tienen negocio discordante | B | Validación/FKs compuestas |
| Apartados | `layaways.routes.ts` | Apartado por primer negocio | Cliente y producto globales | B | Tenantizar todas las relaciones |
| CRUD proveedores | `suppliers.routes.ts` | Sin negocio | Catálogo de proveedores compartido | D | `business_id` y filtros |
| Compras | `purchases.routes.ts` | Compra por primer negocio | Proveedor, producto y reparación globales | B | Relaciones tenant-aware |
| Reparaciones y eventos | `operations.routes.ts` | Sin negocio | Lectura/modificación cruzada posible | D | `business_id` en reparación y eventos |
| Garantías | `warranties.routes.ts` | Reclamo por primer negocio | Reparación/cliente/usuarios globales | B | Validar mismo negocio en todas las relaciones |
| GET/PATCH cajas | `cash.routes.ts` | En general negocio + caja | Segundo negocio queda inaccesible sin tenant en sesión | B | Tenant de sesión |
| GET `/cash/sessions/:id` | `cash.routes.ts`, `cash.service.ts` | Detalle por ID de sesión sin negocio | IDOR potencial entre negocios | D | Añadir `business_id` al detalle |
| Reportes simples/dashboard | `operations.routes.ts` | Combina ventas scoped con clientes/productos/reparaciones globales | Mezcla de métricas | D | Scope en todas las fuentes |
| Reporte gerencial/CSV | `reports.routes.ts` | Ventas/retornos scoped; inventario y reparaciones globales | Mezcla confirmada de catálogo; riesgo de costos ajenos | D | Scope integral y tests negativos |
| GET `/audit-logs` | `audit.routes.ts`, `audit.ts` | Sin negocio | Bitácora B visible por A y B | D | Guardar y filtrar `business_id` |
| POST `/public/repairs/track` | `public.routes.ts` | Folio global + teléfono; primer perfil | Reparación marcada B apareció como CelLab A | D | Resolver negocio por dominio/slug y filtrar |

No se encontró caché persistente por tenant. Los `Map` observados son estructuras locales por petición o registros estáticos de módulos.

## 9. Folios y restricciones únicas

Todos los contadores usan `folio_counters(scope, value)` y se incrementan dentro de la transacción de negocio. Esto evita duplicados concurrentes en una sola instalación, pero el contador es global.

| Identificador | Generación / restricción actual | Clasificación actual | Cambio tenant-ready |
|---|---|---|---|
| `VTA-*` | `scope='sale'`; `sales.folio` único global | Único globalmente | Contador y unique `(business_id, folio)` |
| `REP-*` | `scope='repair'`; `repairs.folio` único global | Único globalmente | Agregar negocio y unique compuesto |
| `COM-*` | `scope='purchase'`; `purchases.folio` único global | Único globalmente | Contador y unique compuesto |
| `DEV-*` | `scope='sale_return'`; `sale_returns.folio` único global | Único globalmente | Contador y unique compuesto |
| `APA-*` | `scope='layaway'`; `layaways.folio` único global | Único globalmente | Contador y unique compuesto |
| `GAR-*` | `scope='warranty_claim'`; `warranty_claims.folio` único global | Único globalmente | Contador y unique compuesto |
| SKU | `products.sku` único global | Incorrecto para varios negocios | Unique `(business_id, sku)` |
| Código de barras | Único global mientras producto está activo | Puede ser global o por negocio según política; hoy bloquea reutilización | Definir política y tenantizar catálogo |
| Código de caja | Único `(business_id, code)` | Correcto por negocio | Conservar |
| Correo de usuario | Único global | Válido si identidad es global | Separar identidad de membresía |
| Teléfono de cliente | Único global mientras activo | Incorrecto para varios negocios | Unique `(business_id, phone)` |
| Nombre de categoría | Único global | Incorrecto | Unique por negocio |
| Nombre de proveedor | Único global mientras activo | Incorrecto | Unique por negocio |
| Folio público de reparación | Único global | Funciona single-business, no resuelve tenant | Negocio/slug + folio o token público opaco |

Dos negocios no pueden utilizar cada uno `VTA-00001`; el segundo obtendría el siguiente número global o chocaría si intenta reutilizarlo. No hay riesgo de colisión dentro del flujo actual, pero sí una definición incorrecta para numeración independiente.

## 10. Reportes y auditoría

Los reportes no están completamente aislados:

- ventas, devoluciones, apartados y caja suelen filtrar por el primer negocio;
- inventario consulta `products` global;
- reparaciones consulta `repairs` global y solo limita algunas partidas por negocio;
- dashboard y reportes básicos cuentan clientes, productos y reparaciones globales;
- CSV gerencial hereda las mismas fuentes;
- ambos usuarios ficticios obtuvieron el reporte de CelLab y el producto marcado B fue contado.

La auditoría es global:

- `audit_logs` no contiene `business_id`;
- `recordAuditLog` solo guarda actor, acción, entidad y metadata;
- el listado no filtra negocio;
- el evento marcado B fue visible para ambos usuarios.

RLS:

- la migración `0013` habilita RLS en las 31 tablas;
- no crea políticas tenant-aware;
- revoca acceso a roles `anon` y `authenticated` si existen;
- esto protege la Data API directa por denegación, pero **no implementa aislamiento**;
- la API que usa propietario/superusuario o un rol `BYPASSRLS` depende totalmente de filtros de aplicación.

Durante la auditoría, un rol PostgreSQL ordinario no pudo ejecutar el seed por RLS. Para probar la API aislada se usó un rol local temporal con `BYPASSRLS`, equivalente al comportamiento esperado de una conexión backend privilegiada. No se modificó la aplicación.

## 11. Pruebas controladas entre negocios

Se crearon exclusivamente en `localpos_tenant_audit`:

- dos filas ficticias de `business_settings`;
- dos usuarios admin globales;
- un producto, cliente, venta, caja, reparación y evento de auditoría marcados como B;
- módulos mínimos habilitados solo para el primer negocio.

La arquitectura permitió insertar dos configuraciones, pero no permitió asociar usuarios, clientes, productos o reparaciones a cada una. Por eso varias pruebas son evidencia de una limitación single-business, no un fallo de preparación de datos.

| Prueba | Resultado | Clasificación |
|---|---|---|
| Usuario A obtiene configuración | Recibió CelLab/primer negocio | No comprobable como tenant; arquitectura single-business |
| Usuario B obtiene configuración | También recibió CelLab/primer negocio | Fuga/selección incorrecta confirmada |
| A consulta producto marcado B | Visible | Fuga confirmada |
| B consulta producto marcado B | Visible, igual que A | Datos globales confirmados |
| A consulta cliente marcado B | Visible | Fuga confirmada |
| A modifica cliente marcado B | Modificación exitosa | Modificación cruzada confirmada |
| A consulta venta con `business_id` B | `404` | Filtrado por el primer negocio |
| B consulta su supuesta venta B | `404` | Registro B inaccesible; no existe tenant B en sesión |
| A modifica caja B | `404` | Bloqueado por filtro de negocio |
| B modifica caja B | `404` | Registro B inaccesible |
| A/B listan cajas | Ambos recibieron solo Caja principal A | Misma sesión lógica de negocio |
| A/B consultan reparación marcada B | Ambos la ven | Fuga confirmada |
| Rastreo público de reparación marcada B | La encontró y mostró `businessName=CelLab Tuxtla` | Asociación pública incorrecta confirmada |
| A/B consultan reporte gerencial | Ambos reciben negocio A e inventario global | Mezcla confirmada |
| A/B consultan auditoría marcada B | Ambos ven el evento | Fuga confirmada |
| Reutilizar folio B en A | No se ejecutó mutación; constraint es global | Incorrectamente definido para tenant |

No se probaron datos reales ni se tocó `localpos_demo`.

## 12. Hallazgos A/B/C/D

### A — 1

- `business_settings` permite operar correctamente una instalación single-business y soporta el piloto.

### B — 19

- Tablas transaccionales que ya contienen `business_id` obligatorio y FK: módulos, ventas y sus hijos, devoluciones, apartados, compras, garantías, cajas, movimientos e items/pagos de reparación.
- Están parcialmente preparadas, pero requieren tenant de sesión y consistencia compuesta entre padre e hijos.

### C — 5

- `categories`;
- `folio_counters`;
- `purchase_items`;
- `repair_events`;
- `warranty_claim_events`.

Estas pueden derivar negocio de un padre o requieren una columna directa, pero deben reforzarse antes del segundo negocio.

### D — 8

- `users` y contexto de sesión;
- `clients`;
- `products`;
- `suppliers`;
- `repairs`;
- `audit_logs`;
- reportes;
- rastreo público/configuración por primer negocio.

Son fuentes directas de mezcla, fuga o modificación cruzada.

## 13. Riesgos críticos

1. **Tenant ausente en autenticación.** Ningún usuario representa un negocio.
2. **Selección no determinista por `limit(1)`.** No hay `order by`; un segundo registro puede alterar cuál negocio atiende la API.
3. **Datos maestros globales.** Cliente, catálogo, stock, proveedor y reparación son compartidos.
4. **Modificación cruzada confirmada.** Un admin A modificó el cliente marcado B.
5. **Reportes mixtos.** Un reporte scoped puede incorporar inventario y reparaciones globales.
6. **Auditoría sin tenant.** El historial puede revelar acciones de otra empresa.
7. **Rastreo público global.** Folio/teléfono no se resuelven dentro de un negocio y el perfil mostrado puede ser incorrecto.
8. **Detalle de sesión de caja por ID.** `/cash/sessions/:id` no impone negocio.
9. **Relaciones inconsistentes.** FKs simples permiten que encabezado e hijos declaren negocios distintos.
10. **RLS no tenant-aware.** Deniega Data API directa, pero no limita a la conexión privilegiada de la API.

## 14. Cambios mínimos antes del segundo negocio

Orden obligatorio recomendado:

1. Crear `businesses`.
2. Relacionar `business_settings` 1:1 con `businesses`.
3. Crear `business_memberships(user_id, business_id, role, active)`.
4. Resolver tenant activo en login/sesión y añadirlo al contexto backend.
5. Agregar `business_id` a clientes, categorías, productos, proveedores, reparaciones y auditoría.
6. Agregar o derivar de forma segura el negocio en eventos e items faltantes.
7. Migrar unicidades a claves compuestas por negocio.
8. Cambiar folios a contador `(business_id, scope)`.
9. Reescribir todas las consultas para exigir tenant, incluidas mutaciones por ID.
10. Añadir FKs/constraints compuestas para consistencia padre-hijo.
11. Corregir reportes, CSV, dashboard y auditoría.
12. Resolver perfil/rastreo público por dominio, slug o identificador de negocio.
13. Añadir smokes negativos A/B para cada módulo.
14. Definir estrategia RLS real o documentar que solo la API privilegiada accede a PostgreSQL.

No debe registrarse un segundo negocio comercial hasta completar y validar este bloque.

## 15. Cambios que pueden esperar después del piloto CelLab

Mientras CelLab sea la única empresa de su base/instalación pueden esperar:

- selector de negocio;
- membresías múltiples por usuario;
- sucursales;
- dominios personalizados;
- planes y facturación SaaS;
- invitaciones;
- administración central de tenants;
- RLS por tenant para acceso directo;
- transferencia de usuarios entre empresas;
- folios configurables por sucursal;
- analítica consolidada multiempresa.

Sí conviene mantener desde ahora la disciplina de no aceptar `businessId` libre en DTO y evitar nuevas tablas globales.

## 16. Arquitectura híbrida del piloto CelLab

Arquitectura provisional recomendada:

- una computadora de CelLab ejecuta frontend y API;
- celulares y tabletas acceden al frontend/API por la red local privada;
- el puerto de API es configurable;
- PostgreSQL puede alojarse en Supabase;
- la operación requiere internet mientras la base sea remota;
- no existe modo offline;
- los dispositivos nunca se conectan directamente a PostgreSQL;
- `DATABASE_URL`, JWT secret y credenciales permanecen solo en la API;
- el frontend usa la dirección LAN de la computadora anfitriona;
- se configura firewall para permitir solo los puertos de aplicación en la red privada;
- el puerto PostgreSQL no se expone a la LAN ni a Internet;
- migrar frontend y API a nube debe ser un cambio de despliegue y variables, no una reescritura funcional.

Para el piloto, la base debe ser exclusiva de CelLab. No compartir la misma base con otro cliente.

## 17. Plan técnico recomendado

### Etapa 1 — Piloto single-business

- conservar una base exclusiva;
- monitorear estabilidad y respaldos;
- cerrar preparación operativa y comercial;
- evitar cambios tenant de alto riesgo durante el arranque.

### Etapa 2 — Fundamento tenant

- introducir `businesses` y memberships;
- definir contexto tenant;
- migrar entidades maestras;
- implementar folios/unicidades por negocio.

### Etapa 3 — Aislamiento de aplicación

- filtrar todos los repositorios/rutas;
- asegurar mutaciones por ID;
- corregir reportes, auditoría y rastreo;
- añadir pruebas cruzadas automatizadas.

### Etapa 4 — Defensa en profundidad

- definir RLS tenant-aware si aplica;
- usar variables de sesión PostgreSQL o claims verificables solo desde backend;
- pruebas de penetración de IDOR;
- monitoreo y respuesta a incidentes por tenant.

### Etapa 5 — Segundo negocio controlado

- habilitar dos tenants ficticios en staging;
- ejecutar matriz A/B completa;
- verificar backup/restore;
- registrar el segundo negocio real solo después de aprobar el aislamiento.

## 18. Dictamen final

LocalPOS **no es multi-tenant actualmente**.

Su modelo híbrido contiene una base útil: 19 tablas transaccionales ya guardan `business_id`, módulos y cajas tienen unicidades correctas por negocio, y varias rutas de ventas/caja filtran encabezados. Sin embargo, el tenant no forma parte de la identidad y las entidades centrales siguen globales. La prueba API confirmó fugas y modificación cruzada.

CelLab Tuxtla puede continuar como piloto single-business siempre que:

- tenga base e instalación exclusivas;
- no se inserte un segundo `business_settings`;
- ningún otro cliente comparta la base;
- PostgreSQL no se exponga directamente;
- las credenciales permanezcan en la API.

Antes de incorporar un segundo negocio es imprescindible completar las acciones de la sección 14 y aprobar smokes de aislamiento entre tenants.
