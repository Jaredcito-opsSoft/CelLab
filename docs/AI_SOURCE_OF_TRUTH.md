# LocalPOS / CelLab Tuxtla - Fuente de verdad operativa

Fuente original: `C:\Users\LG\Downloads\Auditoria_Fuente_de_Verdad_LocalPOS_CelLab.docx`

Este archivo fue convertido desde el documento de auditoria para uso como referencia de la skill. Cuando haya contradicciones, obedecer el codigo actual del repositorio y usar este documento como contrato tecnico y memoria operativa.

LOCALPOS / CELLAB TUXTLA

Auditoria tecnica y fuente de verdad operativa

Guia tipo skill para agentes de IA que trabajen sobre el repositorio, la documentacion y los proximos hitos del sistema.

| Campo | Valor |
| --- | --- |
| Proyecto | LocalPOS con CelLab Tuxtla como negocio piloto |
| Repositorio auditado | https://github.com/Jaredcito-opsSoft/CelLab |
| Fecha de auditoria | 4 de julio de 2026 |
| Version del documento | 1.0 |
| Alcance | Codigo accesible en GitHub, documentacion tecnica local, hitos funcionales y requerimientos actuales. |
| Limite importante | No se ejecuto el repositorio, no se conecto a Supabase ni se hizo smoke visual en navegador durante esta auditoria. |

> Veredicto ejecutivo / El sistema ya tiene una base operativa real para ventas, inventario, reparaciones, caja, reportes basicos, configuracion del negocio, rastreo publico y permisos iniciales. La prioridad no debe ser agregar modulos grandes todavia: primero hay que estabilizar la fuente de verdad, limpiar codificacion UTF-8, ordenar el panel, separar modulos backend grandes, crear usuarios/roles formales y agregar auditoria transversal.


# Indice operativo

1. Como debe usar este documento un agente de IA

2. Jerarquia de fuente de verdad

3. Estado actual confirmado

4. Que tenemos, que no tenemos y que esta bien

5. Auditoria tecnica por capas

6. Deudas, riesgos y contradicciones detectadas

7. Correcciones obligatorias antes de escalar

8. Roadmap tecnico recomendado

9. Reglas de implementacion para agentes

10. Checklists de QA y smoke test

11. Prompts base para Codex/Antigravity/ChatGPT

12. Anexos de fuentes revisadas


# 1. Como debe usar este documento un agente de IA

Este documento funciona como memoria tecnica persistente. Antes de proponer cambios, un agente debe leer esta guia, identificar el hito objetivo, respetar las reglas de no ruptura y contrastar cualquier implementacion contra el codigo real del repositorio.


## 1.1 Objetivo tipo skill

- Mantener el contexto de LocalPOS aunque el agente no tenga memoria de conversaciones anteriores.
- Evitar que el agente reescriba de cero un sistema que ya tiene base funcional.
- Distinguir entre lo implementado, lo documentado, lo pendiente y lo aspiracional.
- Servir como contrato tecnico para siguientes hitos: UX del panel, usuarios/roles, proveedores, inventario avanzado, reparaciones profesionales, reportes y auditoria.
- Reducir regresiones como las ocurridas en Hito 9A/9A-R: mojibake, JSX danado, CSS riesgoso y navegacion confusa.

## 1.2 Regla principal para agentes

> Regla madre / No agregar funcionalidades grandes si antes no se entiende la fuente de verdad actual. No tocar migraciones, seguridad, endpoints transaccionales, caja, inventario o calculos monetarios sin revisar las rutas, el esquema y los smoke tests relacionados.


## 1.3 Modo de trabajo recomendado

1. Leer README, package.json, esquema Drizzle y rutas API reales.

2. Leer el hito o documento relacionado con el cambio solicitado.

3. Confirmar si el cambio es UI, backend, base de datos, seguridad o flujo de negocio.

4. Hacer cambios pequenos, verificables y reversibles.

5. Ejecutar typecheck web, typecheck API, typecheck general y build.

6. Si toca flujos operativos, hacer smoke manual o automatizado con datos controlados.

7. Documentar el hito con: objetivo, alcance, archivos tocados, cambios, no implementado, validacion y pendientes.


# 2. Jerarquia de fuente de verdad

Cuando haya contradicciones entre documentos, codigo o memoria conversacional, el agente debe obedecer esta jerarquia:

| Prioridad | Fuente | Como interpretarla | Accion del agente |
| --- | --- | --- | --- |
| 1 | Codigo actual del repositorio | Es la realidad ejecutable: rutas, esquema, servicios, UI y package scripts. | Si el codigo contradice un documento viejo, tratar el documento como historico. |
| 2 | Migraciones y esquema Drizzle | Definen las tablas, enums, constraints, indices y relaciones que soportan la operacion. | No inventar tablas existentes; proponer migraciones incrementales. |
| 3 | Smoke tests aprobados y docs de hito cerrados | Validan que un flujo ya funciono en un momento concreto. | Usarlos como evidencia, pero volver a validar despues de cambios. |
| 4 | Documentos maestros y requerimientos | Definen direccion estrategica, producto vendible y siguientes modulos. | Usarlos para roadmap, no como prueba de implementacion. |
| 5 | Conversacion o memoria informal | Ayuda a entender intencion del negocio. | No usarla para afirmar que algo existe en codigo. |


## 2.1 Fuentes revisadas

- Repositorio GitHub Jaredcito-opsSoft/CelLab: README, package.json, apps/api, apps/web y rutas principales revisadas mediante conector GitHub.
- Documentacion local: project_documentation.md, hito-3 a hito-9A-R, documento maestro LocalPOS, arquitectura y requerimientos.
- No se valido ejecucion real en Supabase ni navegador en esta auditoria; cualquier despliegue debe ejecutar smoke test antes de operacion real.

## 2.2 Regla contra alucinaciones tecnicas

- No afirmar que existe un modulo si no esta en schema, rutas, UI o docs cerradas.
- No crear prompts que pidan multiempresa real si el modelo actual sigue siendo single-business.
- No decir que existe CRUD de usuarios si solo hay login, sesion y seed/admin inicial.
- No asumir que un control visual equivale a seguridad; la seguridad critica debe estar en backend.
- No tratar CelLab como nombre del producto: CelLab es piloto; LocalPOS es el producto.

# 3. Estado actual confirmado


## 3.1 Identidad del producto

El repositorio se presenta como LocalPOS, un POS modular para negocios locales. CelLab Tuxtla es el primer negocio configurado y conserva landing publica y modulo de reparaciones. Aun existen namespaces internos @cellab/* y emisores JWT con nombre cellab, pero deben entenderse como deuda de generalizacion, no como nombre final del producto.


## 3.2 Stack actual

| Capa | Confirmado | Comentario de auditoria |
| --- | --- | --- |
| Monorepo | pnpm workspaces apps/*, scripts dev/build/typecheck. | Estructura suficiente para MVP. Falta script test y CI formal visible en package.json. |
| Frontend | React 19, Vite 6, TypeScript, React Router, lucide-react. | Panel y landing conviven en apps/web. PanelPage concentra demasiada responsabilidad. |
| Backend | Express 5, TypeScript, Zod, Drizzle ORM, postgres, helmet, cors. | Base correcta para API modular. operations.routes.ts sigue grande y mezcla varios dominios. |
| Base de datos | PostgreSQL con Drizzle y migraciones. | Modelo operativo real: negocio, usuarios, clientes, productos, reparaciones, ventas, inventario y caja. |
| Seguridad | JWT, BCrypt, rate limit en login y rastreo publico, helmet, CORS por APP_URL. | Bueno para piloto. Pendientes: issuer/audience genericos, roles extendidos, auditoria y estrategia de sesiones. |


## 3.3 Modulos actualmente existentes

| Modulo | Estado | Evidencia operativa | Nota |
| --- | --- | --- | --- |
| Autenticacion | Implementado | Login, sesion, JWT, bcrypt, rate limit. | Sin CRUD de usuarios desde panel. |
| Configuracion de negocio | Implementado | business_settings con nombre, tipo, telefono, direccion, moneda, color, mensajes, caja obligatoria y timezone. | Es single-business; no multiempresa real. |
| Clientes | Implementado | CRUD con borrado logico y busqueda. | Falta timeline/CRM avanzado. |
| Productos/inventario basico | Implementado | SKU, nombre, costo, precio, stock, stock minimo, activo, borrado logico. | Falta proveedores, ubicaciones, variantes, compatibilidad por modelo e importacion. |
| Movimientos de inventario | Implementado | sale, sale_cancel, stock_entry, manual_adjustment, service_usage, service_usage_void. | Buena trazabilidad, pero sin conteos ciclicos ni warehouse. |
| POS-lite | Implementado | Venta, folio VTA, carrito, descuento, pago, stock atomico, ticket, historial y cancelacion admin. | Faltan pagos mixtos, devoluciones, apartados, impuestos y cortes por cajero. |
| Reparaciones | Implementado | Folio REP, estados, diagnostico, cotizacion, pagos, piezas, garantia, tracking y notas imprimibles. | Faltan fotos, checklist, firma, autorizaciones formales y workflow de garantias. |
| Caja | Implementado | Apertura, cierre, movimientos, resumen, sesiones, expected cash, diferencias, integracion con ventas/reparaciones. | Falta caja por sucursal/cajero y permisos staff. |
| Reportes basicos | Implementado | Ventas por rango, ingresos, reparaciones pendientes/entregadas, stock bajo, movimientos recientes. | Falta utilidad, producto top, tecnico, margen, exportaciones. |
| Rastreo publico | Implementado | Folio + telefono, rate limit, tracking_enabled, respuesta sin datos sensibles. | Hay mojibake visible en public.routes.ts que debe corregirse. |


# 4. Que tenemos, que no tenemos y que esta bien


## 4.1 Que tenemos ahora

- Sistema operativo de mostrador: ventas rapidas, productos, clientes, caja y reparaciones.
- Modelo economico en centavos para evitar errores de punto flotante.
- Folios transaccionales para ventas y reparaciones mediante folio_counters.
- Control de stock atomico al vender y al usar piezas en reparaciones.
- Movimientos de inventario trazables para venta, cancelacion, entrada, ajuste y uso/anulacion en taller.
- Caja con una sesion abierta por negocio y movimientos relacionados a ventas, reparaciones, anulaciones y manuales.
- Politica configurable para exigir caja abierta antes de operar dinero.
- Rastreo publico seguro que no expone notas internas, costos, pagos ni historial privado.
- Panel protegido con roles admin/technician.
- Landing y WhatsApp dinamicos desde business_settings, segun documentacion de Hito 8.5.

## 4.2 Que no tenemos todavia

- CRUD completo de usuarios, cambio de contrasena, recuperacion, invitaciones, bloqueo/desbloqueo y ultimo acceso.
- Rol staff/cajero y matriz de permisos dinamica.
- audit_logs transversal para registrar cambios sensibles.
- Proveedores, ordenes de compra, recepcion de mercancia y cuentas por pagar.
- Inventario avanzado: ubicaciones, almacenes, sucursales, compatibilidad por modelo, codigos de barras/etiquetas, conteos ciclicos.
- POS completo: pagos mixtos, devoluciones parciales, cambios, apartados, cotizaciones, impuestos/facturacion.
- Taller profesional avanzado: evidencia fotografica, checklist de recepcion/entrega, firma digital, autorizacion de cotizacion y reclamos de garantia.
- CRM y comunicacion: historial completo por cliente, consentimientos, plantillas WhatsApp, recordatorios.
- Reporteria gerencial de utilidad, margen, tecnico, productos lentos, diferencias de caja, cancelaciones y exportacion CSV/PDF.
- Multiempresa/multisucursal real. Actualmente el sistema funciona como single-business con business_settings como configuracion central.
- Suite automatizada formal de pruebas y pipeline CI/CD visible desde package.json.

## 4.3 Que esta bien y debe preservarse

| Area | Fortaleza | No romper |
| --- | --- | --- |
| Transacciones | Ventas, cancelaciones, uso de piezas y movimientos de stock se manejan dentro de transacciones. | No separar pasos criticos sin conservar atomicidad. |
| Caja | No se borran movimientos; las correcciones son salidas/anulaciones trazables. | No mutar cajas cerradas ni recalcular historicos sin rastro. |
| Costos historicos | sale_items y repair_items guardan snapshots de costo/precio/utilidad. | No recalcular utilidad historica usando costo actual del producto. |
| Rastreo publico | Usa folio + telefono, rate limit y respuesta generica. | No exponer pagos, costos, notas internas ni datos sensibles. |
| Configuracion | Telefono, mensajes, color y moneda viven en business_settings. | No hardcodear datos de CelLab en componentes publicos. |
| Permisos backend | Rutas criticas usan requireRole(admin). | No confiar solo en ocultar botones del frontend. |


## 4.4 Que no esta bien o requiere correccion

- Todavia hay mojibake en README.md y en public.routes.ts, aunque Hito 9A-R afirma que el barrido final no tuvo hallazgos.
- El panel tiene navegacion plana estable, pero la informacion puede seguir sintiendose confusa por titulos pequenos, configuracion mezclada y ausencia de jerarquia visual por dominios.
- PanelPage.tsx concentra demasiadas vistas, tipos, navegacion, dashboard, clientes, productos, reparaciones, reportes y configuracion.
- operations.routes.ts sigue cargando dashboard, reportes, clientes, productos y reparaciones en un solo archivo grande.
- El enum de roles solo tiene admin/technician; staff/cajero no existe en schema.
- JWT sigue usando issuer/audience cellab-api/cellab-panel, lo cual contradice la generalizacion de LocalPOS.
- No hay audit_logs, por lo tanto no hay trazabilidad transversal de cambios sensibles.
- No hay evidencia de pruebas automatizadas formales en package.json; los scripts visibles son dev, build y typecheck.
- Categorias existen en schema, pero no se confirmo CRUD real de categorias en las rutas revisadas.
- La caja actual esta por negocio, no por caja fisica, usuario/cajero o sucursal.

# 5. Auditoria tecnica por capas


## 5.1 Repositorio y arquitectura

La arquitectura actual es adecuada para un MVP operativo: monorepo con apps/web y apps/api, frontend React/Vite, API Express/TypeScript, PostgreSQL/Drizzle y configuracion central de negocio. El nombre raiz del package sigue siendo cellab-tuxtla y los workspaces usan @cellab/*; esta deuda debe resolverse despues de cerrar Hito 10/11, no como primer cambio masivo.

- Mantener monorepo pnpm.
- No migrar framework frontend sin una razon fuerte.
- Separar responsabilidades gradualmente: panel por modulos, API por dominios.
- Agregar pruebas y CI antes de features grandes.

## 5.2 Base de datos

El schema actual ya contiene la columna business_id en ventas, inventario, caja y reparaciones economicas, pero el patron operativo sigue obteniendo el primer registro de business_settings. Esto prepara parcialmente el futuro multiempresa, pero todavia no lo implementa.

| Entidad | Estado | Observacion |
| --- | --- | --- |
| business_settings | Activa | Configuracion single-business; incluye caja obligatoria y timezone. |
| users | Activa | Roles admin/technician; falta CRUD e historial de acceso. |
| clients | Activa | Borrado logico; telefono unico activo. |
| categories | Parcial | Existe tabla, no se confirmo CRUD completo. |
| products | Activa | SKU unico, costo/precio, stock y minimo. |
| repairs / repair_events | Activa | Estados y timeline de taller. |
| repair_payments / repair_items | Activa | Pagos, piezas, utilidad, anulaciones. |
| sales / sale_items | Activa | Venta POS, snapshots, cancelacion. |
| inventory_movements | Activa | Kardex basico por producto y referencia. |
| cash_sessions / cash_movements | Activa | Corte de caja, movimientos y diferencias. |
| audit_logs | No existe | Debe agregarse antes de escalar usuarios, roles, sucursales y operaciones sensibles. |
| suppliers / purchases | No existe | Requerido para inventario real de negocio. |


## 5.3 API

- main.ts monta /api/public, /api/auth, /api/operations/business-settings, /api/operations/sales, /api/operations/inventory, /api/operations/inventory-movements, /api/operations/cash y /api/operations.
- auth.routes.ts tiene login con rate limit y sesion actual.
- public.routes.ts tiene profile publico y rastreo por folio + telefono.
- sales.routes.ts delega la logica transaccional a sales.service.ts, lo cual es positivo.
- cash.routes.ts delega calculos y reglas a cash.service.ts, tambien positivo.
- operations.routes.ts debe dividirse porque mezcla demasiados dominios: dashboard, reportes, clientes, productos y reparaciones.

## 5.4 Frontend / Panel

El panel ya cubre rutas operativas clave, pero PanelPage.tsx funciona como orquestador monolitico. Esto acelera el MVP, pero aumenta riesgo de regresiones al tocar navegacion, estilos, permisos visuales o configuracion.

| Ruta o seccion | Estado | Mejora recomendada |
| --- | --- | --- |
| /panel | Dashboard operativo | Jerarquia visual mas clara y acciones principales por rol. |
| /panel/ventas | Venta rapida | Flujo scanner/SKU, pagos mixtos y control de cambio futuro. |
| /panel/ventas/historial | Historial de ventas | Filtros por rango, metodo, usuario, estado y exportacion. |
| /panel/caja | Caja y turnos | Caja por cajero/sucursal en hito futuro. |
| /panel/reparaciones | Lista y recepcion | Mejorar buscador, filtros por estado y promesas de entrega. |
| /panel/reparaciones/:id | Detalle taller | Fotos, checklist, firma, autorizacion de cotizacion y garantia. |
| /panel/clientes | CRUD basico | Timeline, ventas/reparaciones por cliente. |
| /panel/inventario | Productos | Categorias, proveedores, codigos, compatibilidad y etiquetas. |
| /panel/inventario/movimientos | Kardex basico | Filtros por producto, usuario, tipo y exportacion. |
| /panel/reportes | Reporte basico | Margenes, utilidad, productos, tecnicos y caja. |
| /panel/configuracion | Configuracion mezclada | Dividir en Negocio, Tickets, Caja, Garantias, Usuarios y Avanzado. |


# 6. Deudas, riesgos y contradicciones detectadas


## 6.1 Contradicciones de documentacion vs codigo actual

| Tema | Documento dice | Codigo actual muestra | Decision |
| --- | --- | --- | --- |
| UTF-8/mojibake | Hito 9A-R dice que el barrido final no encontro hallazgos. | README.md y public.routes.ts mostraban textos con codificacion rota en palabras como publica, configuracion y diagnostico. | Tratar como deuda abierta y corregir con barrido focalizado. |
| Sidebar agrupado | Hito 9A implemento sidebar agrupado por dominio. | Hito 9A-R lo revirtio a lista plana estable. | No reintroducir agrupacion sin prueba responsive. Hito 10 puede redisenar, pero con smoke visual. |
| Roles | Roadmap pide staff/cajero. | Schema enum solo admin/technician. | No usar staff en UI/API hasta migracion y permisos backend. |
| Generalizacion | LocalPOS debe ser producto vendible. | Namespaces y JWT issuer/audience siguen cellab. | Planear refactor seguro despues de Hito 10/11. |
| Multiempresa | Documentos preparan business_id. | getBusiness toma el primer business_settings. | No mostrar multiempresa real hasta tener businesses/branches/warehouses. |


## 6.2 Riesgos tecnicos por prioridad

| Prioridad | Riesgo | Impacto | Mitigacion |
| --- | --- | --- | --- |
| Alta | Cambios UX grandes vuelven a romper TSX/CSS. | Panel inutilizable o build roto. | Trabajar por componentes pequenos, smoke visual y typecheck. |
| Alta | Sin audit_logs antes de mas usuarios. | No se puede saber quien cambio precio, stock, caja o reparacion. | Agregar audit_logs transversal antes de roles avanzados. |
| Alta | Monolitos PanelPage y operations.routes. | Regresiones al tocar funcionalidades sin relacion. | Extraer modulos por dominio gradualmente. |
| Media | Mojibake persistente. | Mala imagen profesional y confusion en UI/public. | Script de barrido UTF-8 y revision manual. |
| Media | Token en localStorage. | Exposicion si hay XSS. | Corto plazo: hardening XSS y expiracion. Mediano: cookie httpOnly o estrategia renovada. |
| Media | Sin pruebas automatizadas. | Regresiones no detectadas. | Agregar Vitest/API integration/Playwright smoke. |
| Media | business_settings single row. | Multiempresa falsa si se expone UI. | Mantener oculto hasta rediseñar modelo. |


# 7. Correcciones obligatorias antes de escalar


## 7.1 Hito recomendado inmediato: Hito 10 - Fuente de verdad + UX panel

Antes de crear proveedores, WhatsApp API, IA, multiempresa o facturacion, se recomienda cerrar un hito de orden y claridad. Este hito debe ser principalmente UI/UX, documentacion y limpieza focalizada, sin tocar logica transaccional salvo bugs evidentes.

1. Corregir mojibake en README.md, public.routes.ts y cualquier texto visible en apps/web/src y docs.

2. Separar configuracion en tabs o cards: Negocio, Tickets, Caja, Garantias, Usuarios, Avanzado.

3. Renombrar o eliminar bloques confusos: no exponer Base Multiempresa si no hay multiempresa real.

4. Mejorar titulos, subtitulos, ayudas y jerarquia visual del panel.

5. Conservar rutas, endpoints y reglas de negocio actuales.

6. Crear docs/hito-10-fuente-verdad-ux-panel.md con alcance, cambios, pruebas y pendientes.

7. Ejecutar typecheck web/API/general, build y smoke visual en rutas principales.


## 7.2 Hito siguiente: Hito 11 - Usuarios, roles y auditoria inicial

1. Extender enum user_role a admin, manager, staff, technician, viewer o decidir una matriz minima.

2. Crear CRUD de usuarios solo para admin.

3. Agregar activar/desactivar, reset de contrasena y ultimo acceso.

4. Revisar requireRole para aceptar roles nuevos y permisos por accion.

5. Crear audit_logs antes o durante este hito.

6. Agregar pruebas de permisos backend, no solo UI.


## 7.3 Correcciones pequenas de alta rentabilidad

- Agregar script npm test aunque inicialmente ejecute una suite minima.
- Agregar script smoke:api para flujos POS/caja/taller controlados.
- Agregar lint/format para evitar danos mecanicos de TSX.
- Separar operations.routes.ts por dominios sin cambiar paths publicos.
- Extraer PanelPage.tsx en rutas/componentes modulares.
- Agregar archivo docs/AI_SOURCE_OF_TRUTH.md o docs/skill-localpos.md basado en este documento.

# 8. Roadmap tecnico recomendado

| Hito | Nombre | Objetivo | No hacer en ese hito |
| --- | --- | --- | --- |
| 10 | Fuente de verdad + UX panel | Limpiar mojibake, ordenar configuracion, mejorar jerarquia y dejar skill tecnica para agentes. | No agregar features grandes ni migraciones riesgosas. |
| 11 | Usuarios, roles y auditoria | CRUD usuarios, staff/cajero, permisos backend, audit_logs. | No depender de botones ocultos. |
| 12 | Proveedores y compras | Suppliers, purchase_orders, recepcion de mercancia, costos por proveedor. | No mezclar con multiempresa. |
| 13 | Inventario avanzado | Codigos de barras, compatibilidad por modelo, ubicaciones, conteos, importacion CSV. | No romper kardex existente. |
| 14 | POS completo | Pagos mixtos, devoluciones, apartados, cotizaciones, ticket reprint. | No afectar ventas historicas. |
| 15 | Taller profesional | Fotos, checklist, firmas, autorizaciones, garantias/reclamos. | No exponer datos internos en publico. |
| 16 | CRM basico | Timeline cliente, historial, etiquetas, plantillas WhatsApp manuales. | No activar WhatsApp API sin consentimiento/plantillas. |
| 17 | Reportes gerenciales | Utilidad, margen, tecnico, productos lentos, caja, cancelaciones, exportaciones. | No mostrar margenes a roles no autorizados. |
| 18 | Hardening tecnico | Tests, CI, backups, staging, monitoreo, seguridad de sesiones. | No posponerlo si ya hay usuarios reales. |
| 19 | Multi-sucursal controlado | branches, warehouses, cajas por sucursal, usuarios por sede. | No mostrar Base Multiempresa antes del modelo real. |
| 20 | Integraciones | WhatsApp API, facturacion, pagos, IA asistiva, exportaciones. | No integrar servicios externos sin logs, permisos y configuracion. |


## 8.1 Orden recomendado realista

La secuencia mas segura es: Hito 10 -> Hito 11 -> Hito 18 minimo -> Hito 12/13 -> Hito 14/15 -> Hito 17 -> Hito 19/20. Esto evita construir integraciones sobre una base con permisos incompletos y panel confuso.


# 9. Reglas de implementacion para agentes


## 9.1 Reglas de no ruptura

- No cambiar rutas publicas sin compatibilidad: /, /panel/*, /api/public/*, /api/auth/*, /api/operations/*.
- No cambiar nombres de estados de reparacion sin migracion y mapeo.
- No modificar calculos de caja sin pruebas de apertura, venta, pago, cancelacion, anulacion y cierre.
- No modificar stock sin crear inventory_movements correspondiente.
- No borrar ventas, pagos, movimientos o reparaciones; usar estados, voidedAt o deletedAt segun corresponda.
- No exponer internalNotes, costos, utilidad, margen, pagos o datos privados en rastreo publico.
- No subir credenciales, JWT secret, service role, DATABASE_URL ni .env reales.
- No hacer refactor masivo de nombres @cellab/* en el mismo hito que features funcionales.

## 9.2 Reglas de implementacion backend

- Toda entrada debe validarse con Zod.
- Toda operacion monetaria debe usar centavos enteros.
- Toda operacion que cambie stock/dinero debe ser transaccional.
- Toda nueva accion sensible debe tener requireAuth y permisos backend.
- Todo nuevo campo historico economico debe considerar snapshot.
- Si se agrega tabla, crear migracion incremental y documentar rollback manual si aplica.
- Si se agrega modulo, mantener endpoints existentes y preferir rutas nuevas bajo /api/operations/<dominio>.

## 9.3 Reglas de implementacion frontend

- No concentrar nuevas vistas dentro de PanelPage.tsx si pueden ir a modules/<dominio>.
- Usar textos claros de negocio, no tecnicismos crudos como enum salvo en modo avanzado.
- Los botones ocultos por rol son solo UX; el backend debe rechazar igualmente.
- Toda pantalla con tabla debe tener estado vacio, estado cargando, error y busqueda/filtros si aplica.
- Las vistas imprimibles deben probarse con Ctrl+P y no mostrar informacion interna.
- Toda mejora responsive debe validarse en escritorio, tablet angosta y movil.

## 9.4 Prompt base que debe leer un agente

    Eres un agente de desarrollo trabajando sobre LocalPOS / CelLab Tuxtla.
    Antes de modificar codigo, trata este documento como fuente de verdad.
    Prioridad de verdad: codigo actual > schema/migraciones > smoke tests cerrados > docs de hito > memoria conversacional.
    No reescribas el sistema. Haz cambios incrementales, auditables y reversibles.
    No rompas ventas, caja, inventario, reparaciones, rastreo publico ni permisos backend.
    Si detectas contradicciones, reportalas y corrige solo lo necesario para el hito actual.
    Al terminar, ejecuta typecheck web, typecheck API, typecheck general y build.
    Si tocaste flujos de dinero, stock, reparaciones o public tracking, agrega smoke test manual o automatizado.
    Documenta el hito en /docs con objetivo, alcance, archivos, cambios, validaciones, no implementado y pendientes.

# 10. Checklists de QA y smoke test


## 10.1 Checklist minimo antes de entregar cualquier hito

- npm run typecheck -w @cellab/web
- npm run typecheck -w @cellab/api
- npm run typecheck
- npm run build
- Abrir /panel y confirmar login.
- Revisar consola del navegador sin errores criticos.
- Probar ruta directa al modulo modificado.
- Confirmar que no hay mojibake nuevo.
- Confirmar que no se agregaron secretos en repo.

## 10.2 Smoke test operativo recomendado

| Flujo | Pasos minimos | Resultado esperado |
| --- | --- | --- |
| Autenticacion | Login admin / GET /api/auth/session / Intento con credenciales malas | Admin entra, sesion valida, credenciales malas rechazan sin filtrar datos. |
| POS | Crear producto con stock / Crear venta / Ver folio VTA / Validar descuento stock / Cancelar como admin | Venta atomica, movimientos sale/sale_cancel, tecnico no cancela. |
| Caja | Abrir caja / Venta efectivo / Pago reparacion / Movimiento manual / Cerrar caja | expectedCash correcto, diferencia correcta, caja cerrada no muta. |
| Reparaciones | Crear cliente / Crear REP / Agregar diagnostico / Pago parcial / Pieza con inventario / Anular pieza/pago admin | Saldo correcto, stock se descuenta/devuelve, eventos quedan trazados. |
| Rastreo publico | Folio+telefono correcto / Telefono con +52 / Telefono incorrecto / tracking false | Solo muestra estado publico; no expone internos. |
| Configuracion | Cambiar telefono/mensaje/color / Ver landing/ticket / Probar technician | Admin edita; technician solo lectura; publico usa business_settings. |


## 10.3 Smoke visual obligatorio despues de Hito 10

- /panel
- /panel/ventas
- /panel/ventas/historial
- /panel/caja
- /panel/reparaciones
- /panel/inventario
- /panel/inventario/movimientos
- /panel/reportes
- /panel/configuracion
- Landing publica y rastreo por folio.
- Ctrl+P para nota de venta, nota de recepcion/entrega y corte de caja.

# 11. Prompts base para Codex / Antigravity / ChatGPT


## 11.1 Prompt para Hito 10

    Objetivo: implementar Hito 10 - Fuente de verdad, limpieza UTF-8 y UX operativa del panel de LocalPOS.
    Contexto:
    - LocalPOS ya tiene ventas, caja, inventario, reparaciones, reportes, configuracion y rastreo publico.
    - No reescribas el sistema.
    - No cambies endpoints ni reglas transaccionales.
    - CelLab Tuxtla es negocio piloto; LocalPOS es el producto.
    Tareas:
    1. Audita textos visibles y corrige mojibake en README.md, apps/api/src/modules/public/public.routes.ts, apps/web/src y docs si aplica.
    2. Reorganiza /panel/configuracion en secciones claras: Negocio, Tickets, Caja, Garantias, Usuarios, Avanzado.
    3. Elimina o renombra conceptos confusos de multiempresa si no hay modelo real.
    4. Mejora titulos, subtitulos, ayudas, estados vacios y jerarquia visual del panel.
    5. Mantener rutas actuales y permisos backend.
    6. No tocar migraciones salvo que sea estrictamente necesario y documentado.
    7. Ejecutar typecheck web, typecheck API, typecheck general y build.
    8. Hacer smoke visual manual de rutas principales.
    9. Crear docs/hito-10-fuente-verdad-ux-panel.md con: objetivo, alcance, archivos tocados, cambios, validaciones, no implementado y pendientes.
    Criterios de aceptacion:
    - Sin mojibake visible.
    - Panel mas claro sin romper responsive.
    - Configuracion no mezcla conceptos incompatibles.
    - Build y typecheck pasan.
    - No se rompen ventas, caja, inventario, reparaciones ni rastreo publico.

## 11.2 Prompt para Hito 11

    Objetivo: implementar Hito 11 - Usuarios, roles, permisos y auditoria inicial.
    No iniciar hasta que Hito 10 este estable.
    Tareas:
    1. Proponer migracion incremental para roles nuevos, por ejemplo admin, manager, staff, technician, viewer.
    2. Crear CRUD de usuarios en /panel/configuracion/usuarios o modulo separado.
    3. Agregar activar/desactivar usuario, reset de contrasena y ultimo acceso.
    4. Implementar permisos backend por accion; no confiar en UI.
    5. Crear audit_logs para cambios sensibles: usuarios, productos, stock, ventas, caja, reparaciones, configuracion.
    6. Agregar pruebas de permisos: staff no cancela ventas, technician no modifica costos, viewer no muta datos.
    7. Mantener compatibilidad con usuarios existentes.
    8. Documentar docs/hito-11-usuarios-roles-auditoria.md.
    Criterios de aceptacion:
    - Migracion reversible de manera controlada.
    - CRUD usuarios funciona solo para admin.
    - Acciones sensibles quedan auditadas.
    - Typecheck/build pasan.
    - Smoke de permisos aprobado.

# 12. Anexos de fuentes revisadas


## 12.1 Evidencia del repositorio

| Fuente | Hallazgo usado en auditoria |
| --- | --- |
| README.md | Declara LocalPOS, arquitectura actual, roles admin/technician, business_settings single-business y namespaces @cellab temporales. Tambien muestra mojibake visible. |
| package.json raiz | Monorepo pnpm con scripts dev, build y typecheck; sin script test visible. Node >=20. |
| apps/api/package.json | API Express/TypeScript/Drizzle/Zod/JWT/BCrypt/rate-limit/helmet/postgres. |
| apps/web/package.json | Frontend React/Vite/TypeScript/React Router/lucide-react. |
| apps/api/src/db/schema.ts | Confirma enums, tablas, relaciones, business_settings, usuarios, productos, reparaciones, ventas, inventario y caja. |
| apps/api/src/main.ts | Confirma rutas montadas de public, auth, settings, sales, inventory, cash y operations. |
| apps/api/src/modules/auth/auth.routes.ts | Login con bcrypt, JWT, issuer/audience cellab, rate limit. |
| apps/api/src/middlewares/auth.ts | requireAuth y requireRole solo contemplan admin/technician. |
| apps/api/src/modules/sales/sales.service.ts | Ventas transaccionales, folio VTA, snapshots, stock atomico, movimientos y caja. |
| apps/api/src/modules/cash/cash.service.ts | Caja abierta unica, expectedCash, cashWarning y bloqueo por politica. |
| apps/api/src/modules/public/public.routes.ts | Rastreo publico seguro con rate limit, pero tiene mojibake en etiquetas y mensajes. |
| apps/web/src/pages/PanelPage.tsx | Panel centralizado con nav plana, dashboard, clientes, productos, reparaciones, reportes y configuracion. |


## 12.2 Evidencia documental de hitos

| Documento | Uso en auditoria |
| --- | --- |
| hito-3-pos-lite.md | Define venta POS transaccional, folio VTA, stock atomico, cancelacion admin y ticket 80mm. |
| hito-5-1-1-aplicacion-real-smoke-test.md | Documenta seguridad, rutas admin, rastreo publico y migraciones/seed en Supabase. |
| hito-5-1-2-smoke-test-funcional.md | Valida API real contra Supabase y registra pendientes de impresion/mojibake antiguos. |
| hito-8-corte-caja-operacion.md | Define cash_sessions, cash_movements, reglas de caja, integracion con ventas y reparaciones. |
| hito-8-5-correcciones-funcionales-caja-ventas.md | Cierra politica de caja, timezone, cost snapshot, permisos y endpoint business-profile. |
| hito-8-5-1-smoke-test-funcional.md | Valida al 100% caja, ventas, reparaciones, permisos y business-profile. |
| hito-9a-ux-funcional-panel.md | Documenta UX, cashWarning, successSale, didactica de caja/inventario y pendientes de Hito 9B. |
| hito-9a-r-reparacion-regresion.md | Documenta regresion de UTF-8/TSX/CSS y estabilizacion del panel, pero queda contradiccion por mojibake actual. |
| LocalPOS Documento Maestro | Direccion estrategica: LocalPOS producto, CelLab piloto, no rewrite, business_id futuro, roadmap modular. |


## 12.3 Decision final de fuente de verdad

> Decision / El sistema debe avanzar como LocalPOS, no como una landing aislada de CelLab. CelLab Tuxtla es el piloto. La base actual es suficientemente valiosa para evolucionarla; no se recomienda reiniciar, migrar de stack o redisenar base de datos completa. El siguiente paso correcto es ordenar contexto, UX, usuarios, permisos y auditoria antes de construir integraciones o multiempresa.


# 13. Checklist rapido para el agente antes de responder o codificar

- Identifique si la solicitud toca dinero, stock, reparaciones, seguridad o datos publicos.
- Revise el modulo real: schema, route, service y componente frontend.
- Si es solo UX, no toque backend ni migraciones.
- Si toca permisos, implemente backend primero y UI despues.
- Si toca caja, ejecute smoke de caja abierta/cerrada/cancelacion/anulacion.
- Si toca inventario, cree o preserve inventory_movements.
- Si toca publico, verifique que no se expongan datos sensibles.
- Si toca textos, haga barrido de mojibake.
- Si agrega feature, documente no implementado y pendientes.
- Si hay contradiccion, documentela y obedezca el codigo actual.
