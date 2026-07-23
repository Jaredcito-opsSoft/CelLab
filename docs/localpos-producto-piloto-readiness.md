# LocalPOS — Readiness honesto de producto piloto

Fecha de revisión: 22 de julio de 2026

Producto: LocalPOS

Negocio piloto: CelLab Tuxtla

Corte verificable: rama `main`, commit `abca46e`

## Propósito y criterio de verdad

Este documento define qué puede ofrecerse comercialmente en **LocalPOS Piloto** sin confundir código futuro con producto disponible.

La verificación usa esta jerarquía:

1. código presente en `main`;
2. schema y migraciones presentes en `main`;
3. rutas y UI presentes en `main`;
4. smokes y documentos cerrados presentes en `main`;
5. roadmap, únicamente como intención futura.

Una función no se considera confirmada porque exista en otra rama, en un archivo local sin integrar o en una conversación. El corte confirmado incluye los Hitos 10, 11 y 12 mergeados, además del núcleo operativo anterior que permanece en `main`.

## Resumen ejecutivo

**LocalPOS Piloto debe venderse como un POS simple y modular**, orientado a mejorar cuatro tareas:

- registrar ventas;
- controlar la caja operativa;
- conocer existencias y movimientos básicos;
- consultar reportes simples del negocio.

El producto tiene una base real para un piloto acompañado en un negocio pequeño, con una sola configuración de negocio y una operación sencilla. CelLab Tuxtla puede activar además el flujo especializado de reparaciones.

No debe presentarse todavía como ERP, sistema contable, solución fiscal, plataforma multiempresa, POS completo para cadenas ni sistema de inventario especializado.

### Veredicto

| Área | Estado | Decisión |
| --- | --- | --- |
| Núcleo POS simple | Confirmado en `main` | Apto para piloto controlado |
| Permisos y administración | Confirmado en `main` | Apto con capacitación y usuarios definidos |
| Modularidad | Confirmada en `main` | Útil para ocultar funciones que el negocio no necesita |
| Proveedores y compras | Confirmados como opcionales | Activar solo si el piloto requiere recepción de mercancía |
| Hitos 13, 14 y 15 | No confirmados en `main` | Roadmap post-piloto |
| Infraestructura productiva avanzada | No confirmada en `main` | No prometer; preparar antes de producción pública |

Recomendación: iniciar un piloto acompañado después de configurar el entorno, ejecutar migraciones y smokes sobre el candidato exacto, acordar soporte y definir un procedimiento manual de respaldo como condición previa.

## 1. Confirmado en `main`

### 1.1 Núcleo comercial recomendado

#### Ventas

- Venta rápida con carrito.
- Búsqueda y selección de productos.
- Cantidades, subtotal, descuento y total.
- Métodos de pago simples: efectivo, transferencia o tarjeta.
- Cliente opcional.
- Folio de venta `VTA-*`.
- Historial y detalle.
- Ticket HTML imprimible con datos del negocio.
- Descuento transaccional de stock.
- Movimiento de inventario por venta.
- Cancelación total según permisos autorizados, con restitución de stock.

**Límite:** una venta usa un solo método de pago. Pagos mixtos y devoluciones parciales no están confirmados en `main`.

#### Caja operativa

- Apertura de sesión con fondo inicial.
- Entradas y salidas manuales controladas.
- Registro de movimientos derivados de la operación soportada.
- Efectivo esperado, efectivo contado y diferencia.
- Cierre e historial de caja.
- Política configurable para exigir caja abierta.

**Límite:** no vender como catálogo de cajas físicas, multi-register o solución validada para 3–10 terminales. El modelo confirmado debe ofrecerse como caja operativa simple del negocio.

#### Inventario básico

- Productos con SKU, nombre, costo, precio, stock y stock mínimo.
- Alta, edición y archivado lógico.
- Alertas de bajo stock.
- Entradas y ajustes controlados.
- Kardex básico con stock anterior, stock nuevo, usuario y referencia.
- Movimientos por venta, cancelación, recepción de compra y uso de piezas cuando corresponda.

**Límite:** no incluye códigos de barras empaquetados, categorías operativas avanzadas, compatibilidades, lotes, caducidades, series, almacenes ni importación masiva.

#### Clientes

- Alta, consulta, edición y archivado.
- Búsqueda por nombre o teléfono.
- Asociación opcional con venta.
- Uso dentro del flujo de reparaciones.

**Límite:** no es un CRM y no incluye campañas, segmentación ni automatizaciones.

#### Reportes simples

- Ventas e ingresos por rango.
- Reparaciones pendientes y entregadas cuando el módulo está activo.
- Productos con bajo stock.
- Movimientos recientes de inventario.

**Límite:** no vender utilidad gerencial avanzada, márgenes, BI, reportes fiscales ni reportes contables.

### 1.2 Identidad, configuración y UX

- Identidad LocalPOS en el panel, con CelLab como negocio piloto.
- Landing y panel estabilizados en los Hitos 9 y 10.
- Configuración del negocio mediante `business_settings`.
- Nombre, teléfono, dirección, moneda, mensajes y otros datos operativos configurables.
- Navegación del panel y módulos visibles según configuración.
- Diseño responsive trabajado como parte de la UX existente, sin prometer una app móvil nativa.

### 1.3 Usuarios, roles, permisos y auditoría inicial

- Roles `admin`, `manager`, `staff`, `technician` y `viewer`.
- CRUD administrativo de usuarios.
- Activación y desactivación.
- Restablecimiento administrativo de contraseña.
- Registro de último acceso.
- Permisos reales aplicados en backend.
- Restricción de acciones y datos sensibles por rol.
- Tabla y consulta inicial de `audit_logs`.
- Registro de mutaciones sensibles cubiertas por el alcance de Hitos 11 y 12.

**Límite:** no incluye MFA, recuperación por correo, SSO ni una matriz de permisos dinámica editable.

### 1.4 Reparaciones como módulo opcional

- Folios `REP-*`.
- Recepción de equipo y cliente.
- Diagnóstico, estados técnicos, notas y eventos.
- Pagos de reparación.
- Conceptos y piezas con movimiento de inventario.
- Impresión de recepción/entrega.
- Rastreo público limitado cuando el módulo correspondiente está activo.
- Campos básicos de garantía vinculados a la reparación.

**Límite:** los campos básicos de garantía no equivalen al módulo profesional de reclamos con folio `GAR-*`. Tampoco se incluyen fotografías, firma digital o autorizaciones remotas.

### 1.5 Modularidad de negocio

Los módulos confirmados en el registro de `main` son:

- `core_pos`;
- `cash`;
- `inventory_basic`;
- `repairs`;
- `public_tracking`;
- `suppliers`;
- `purchases`;
- `repair_parts`;
- `advanced_reports`, descrito expresamente como futuro y apagado por defecto.

El panel puede ocultar módulos desactivados y el backend bloquea rutas protegidas con `MODULE_DISABLED` donde fue integrado.

**Límite:** esto prepara una configuración modular, pero no implementa multiempresa ni presets comerciales automáticos por giro.

## 2. Validado con smokes/build

La evidencia integrada en `main` confirma:

- `smoke:permissions`: permisos backend por rol;
- `smoke:modules`: activación, desactivación, dependencias y bloqueo de módulos;
- `smoke:purchases`: compra, recepción, inventario, costos enmascarados y auditoría;
- typecheck web aprobado al cierre de los hitos;
- typecheck API aprobado al cierre de los hitos;
- typecheck general aprobado;
- build de producción aprobado;
- smoke visual documentado de configuración, módulos y navegación de Hito 12.

Los smokes prueban el alcance indicado en sus scripts. No constituyen evidencia de pagos mixtos, devoluciones parciales, apartados, garantías `GAR-*`, cajas físicas, reportes gerenciales avanzados, Docker, restauración o carga de múltiples terminales.

## 3. Piloto recomendado

### Promesa comercial

> LocalPOS Piloto ayuda a un negocio local a ordenar ventas, caja, inventario básico y reportes simples desde un panel configurable.

### Alcance base

- Una configuración de negocio.
- Acceso protegido y usuarios con roles.
- Venta rápida con un método de pago por venta.
- Productos, existencias y alertas básicas.
- Clientes.
- Caja operativa simple.
- Historial y tickets.
- Kardex básico.
- Reportes operativos simples.
- Configuración de identidad.
- Módulos no necesarios apagados.
- Acompañamiento inicial y capacitación breve, si forman parte del acuerdo comercial.

### Perfil recomendado

- Negocio de una sola ubicación.
- Una operación de caja sencilla.
- Inventario sin lotes, caducidades ni múltiples almacenes.
- Propietario disponible para retroalimentación.
- Operadores nominales con tareas claras.
- Sin dependencia inmediata de CFDI o contabilidad integrada.
- Catálogo inicial acotado.

### Giros razonables

- Tienda de accesorios.
- Papelería pequeña.
- Comercio familiar.
- Estética o barbería que vende productos.
- Taller de celulares mediante módulos opcionales.
- Punto de venta de alimentos simples, sin mesas, comandas o recetas.

### Condiciones previas

- Configurar un entorno de producción separado.
- Aplicar y verificar migraciones.
- Ejecutar typecheck, build y smokes del alcance activo.
- Definir responsable y procedimiento de respaldo.
- Probar impresión en el dispositivo real.
- Capacitar apertura, venta, ajuste y cierre de caja.
- Documentar precio, soporte, límites y tratamiento de datos.

## 4. Opcional activable

### Reparaciones

Recomendado para CelLab y talleres. Incluye recepción, estados, pagos, piezas, documentos y rastreo limitado. No debe aparecer en negocios que solo necesitan POS.

### Rastreo público

Solo debe activarse junto con reparaciones y después de revisar la configuración pública del negocio.

### Piezas para reparación

Permite usar productos dentro de una reparación y conservar el movimiento de inventario.

### Proveedores

Directorio con alta, edición, consulta y archivado. No administra cuentas por pagar.

### Compras

- Folios `COM-*`.
- Borrador y estados de compra.
- Partidas.
- Recepción transaccional.
- Aumento de stock.
- Actualización de costo.
- Movimiento `purchase_receipt`.
- Auditoría.

No afecta caja y no registra pagos al proveedor.

## 5. Parcial / no vender como completo

| Capacidad | Estado real en `main` | Forma honesta de comunicarlo |
| --- | --- | --- |
| Auditoría | Inicial | Registra acciones sensibles cubiertas; no es SIEM |
| Garantía de reparación | Campos básicos | No es gestión profesional de reclamos `GAR-*` |
| Responsive | Panel web adaptable | No es app móvil ni operación móvil completa |
| Modularidad | Toggles y dependencias | No son paquetes automáticos por giro ni multiempresa |
| Caja | Sesión operativa simple | No es multi-register ni operación validada de 3–10 cajas |
| Reportes | Indicadores básicos | No son reportes gerenciales, contables o fiscales |
| Compras | Recepción de mercancía | No incluye pagos, deuda, vencimientos o conciliación |
| Código de barras | No confirmado como Hito 13 en `main` | No ofrecer captura/etiquetado como paquete |
| Respaldo productivo | Responsabilidad operativa pendiente | No afirmar backup automatizado o restore drill |
| Despliegue | Build disponible | No afirmar Docker/CI avanzado/observabilidad productiva |

## 6. Roadmap post-piloto

Estas capacidades pueden existir en trabajo futuro, pero **no forman parte de la oferta confirmada**:

1. Hito 13: categorías, códigos de barras, compatibilidades y mejoras de inventario.
2. Hito 14: pagos mixtos, devoluciones parciales y apartados.
3. Hito 15: garantías profesionales con folio `GAR-*`.
4. Cajas físicas, sesiones por terminal y validación multi-register.
5. Reportes gerenciales de utilidad, margen, productos y exportaciones.
6. Hardening productivo: CI ampliado, pruebas transaccionales, contenedores, healthchecks, logs y preflight.
7. Backups automatizados y ensayo documentado de restauración.
8. Optimización y pruebas de carga.
9. Presets comerciales por giro.

El roadmap debe priorizarse después de observar el uso real del piloto. No debe implementarse completo antes de conseguir aprendizaje comercial.

## 7. No incluido

- Pagos mixtos.
- Devoluciones parciales.
- Apartados.
- Garantías profesionales con folio `GAR-*`.
- Catálogo de cajas físicas o multi-register.
- Operación garantizada para 3–10 terminales.
- Reportes gerenciales avanzados.
- Docker y orquestación productiva confirmados.
- CI avanzado o pruebas transaccionales integrales.
- Backups automáticos o restore drill confirmado.
- Multiempresa.
- Multisucursal.
- Múltiples almacenes.
- Lotes, caducidades o inventario regulado.
- Facturación o CFDI.
- Impuestos y contabilidad.
- Cuentas por pagar y pagos a proveedor.
- CRM completo.
- WhatsApp API automática.
- Inteligencia artificial.
- Operación offline.
- Aplicación móvil nativa.
- Restaurante con mesas, comandas o recetas.

## Riesgos y decisión final

### Riesgos a controlar

- Activar demasiados módulos y hacer complejo un producto que debe sentirse simple.
- Vender capacidades del roadmap como si estuvieran integradas en `main`.
- Usar smokes contra datos reales en lugar de un entorno controlado.
- Abrir un piloto sin procedimiento de respaldo, soporte e incidentes.
- Confundir reportes operativos con información contable.

### Decisión

LocalPOS puede avanzar a un **piloto acompañado y de alcance limitado**. La oferta debe concentrarse en:

> venta simple + caja operativa + inventario básico + reportes simples.

Proveedores, compras y reparaciones pueden activarse cuando el giro lo justifique. El resto debe permanecer explícitamente en roadmap o fuera de alcance hasta que exista evidencia integrada en `main` y validación específica.
