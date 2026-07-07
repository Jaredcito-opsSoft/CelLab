# Hito 10 - Skill de diseno minimalista monografico

Fecha: 2026-07-04

## Objetivo

Instalar y aplicar la skill de diseno para CelLab / LocalPOS, manteniendo el alcance frontend-only y respetando la fuente de verdad operativa del proyecto.

## Skill instalada

- Skill global: `C:\Users\LG\.codex\skills\cellab-minimalismo-monografico`
- Skill del proyecto: `.codex/skills/cellab-minimalismo-monografico`
- Referencia de direccion visual: `.interface-design/system.md`

La skill define un enfoque de minimalismo monografico operativo: superficies claras, tinta casi negra, gris tecnico, lineas sobrias y azul diagnostico como acento principal.

## Cambios aplicados

- Se ajustaron tokens visuales de la landing en `apps/web/src/styles/landing-redesign.css`.
- Se redujo el uso de acentos calidos decorativos en landing y panel.
- Se alineo el panel a la paleta de papel, tinta, linea tecnica y azul diagnostico.
- Se mantuvieron intactas rutas, backend, migraciones, permisos, ventas, caja, inventario y reparaciones.

## Criterio de diseno activo

- Landing: confianza de taller real, no plantilla SaaS generica.
- Panel: herramienta diaria para mostrador, caja, inventario y reparaciones.
- Estados y CTAs: sobrios, legibles y con color reservado para accion o diagnostico.
- Configuracion: agrupada por tarea de negocio, sin simular multiempresa.

## Validacion

- `npm run typecheck -w @cellab/web`
- `npm run typecheck -w @cellab/api`
- `npm run typecheck`
- `npm run build`

Resultado: aprobado.

## Smoke visual

- Landing desktop en `http://127.0.0.1:5175/`: H1 visible, CTAs visibles, sin overflow horizontal, sin errores de consola.
- Landing mobile `390x844`: H1 visible, navegacion/CTAs presentes, sin overflow horizontal, sin errores de consola.
- `/panel/configuracion` sin sesion: muestra login con campos de correo y contrasena, sin overflow horizontal, sin errores de consola.

## Smoke visual correctivo

Hallazgos detectados en navegador:

- El H1 del hero se exponia como `Diagnostico claro.Reparacion confiable.` sin espacio entre frases.
- Los controles del rastreador publico heredaban muy poco estilo base: inputs de 23px de alto y boton con ajuste deficiente en mobile.
- El SVG del telefono invadia demasiado el hero movil.
- Links cortos como `FAQ` quedaban con area tactil menor a lo recomendable.
- Las pestanas de marca tenian nombre accesible unido (`SamsungGalaxy...`), aunque visualmente estuvieran en dos lineas.

Correcciones aplicadas:

- Se separo el texto del hero y se agregaron labels accesibles a pestanas de marca.
- Se agregaron estilos base para `RepairTracker`: card, inputs, boton, estados de error y layout responsive.
- Se ajusto el telefono del hero en mobile con un override final de cascada.
- Se elevaron areas tactiles de nav/footer.

Resultado del re-smoke:

- Landing desktop `1280x720`: sin overflow, sin targets pequenos, sin errores de consola.
- Landing mobile `390x844`: sin overflow, inputs/boton del rastreador en 48px, sin targets pequenos, sin errores de consola.
- Panel login mobile `390x844`: sin overflow, inputs/boton en 46px, sin errores de consola.

## Segundo smoke visual correctivo

Hallazgos detectados:

- FAQ: al abrir/cerrar preguntas, el CSS trataba el texto de la pregunta como icono y el cuerpo no colapsaba de forma estable.
- Dashboard autenticado: `Resumen operativo` usaba una columna angosta de metricas, dejando cards de ingresos/equipos/listos demasiado comprimidas.
- Panel mobile: algunos inputs/acciones quedaban por debajo de 40px de alto.

Correcciones:

- FAQ ahora usa un wrapper interno para animar el cuerpo y ocultar respuestas cerradas con `grid-template-rows` estable.
- El icono `+/-` del FAQ se estiliza sobre `b`, no sobre el texto de la pregunta.
- `Resumen operativo` usa metricas en ancho completo con cards responsivas de minimo 220px.
- Acciones rapidas y paneles de actividad se acomodan en grids responsivos.
- Inputs/selects/acciones de texto del panel tienen altura minima operable.

Resultado:

- FAQ desktop `1280x720`: una respuesta abierta visible, respuestas cerradas ocultas, sin overflow, sin errores de consola.
- FAQ mobile `390x844`: respuesta abierta visible, sin overflow, sin errores de consola.
- Panel autenticado desktop: cards de resumen en ancho completo, sin overflow, sin errores de consola.
- Panel autenticado mobile: cards de resumen a 343px de ancho, sin targets pequenos, sin overflow, sin errores de consola.
- Rutas revisadas autenticadas: `/panel`, `/panel/ventas`, `/panel/ventas/historial`, `/panel/caja`, `/panel/reparaciones`, `/panel/inventario`, `/panel/inventario/movimientos`, `/panel/reportes`, `/panel/configuracion`.

## Pendiente visual

Seguir puliendo tablas densas y acciones secundarias por modulo en siguientes pases visuales, sin mezclarlo con cambios de negocio.

## Smoke visual - movimientos de inventario

Ruta revisada: `http://localhost:5173/panel/inventario/movimientos`.

Hallazgos:

- El formulario lateral dejaba el Kardex comprimido a media columna en desktop.
- El titulo interno de la tarjeta heredaba escala de hero y cortaba `Movimientos controlados de stock`.
- Las filas del historial partian fecha, usuario y producto de forma poco legible.
- En mobile, las filas con nombres/SKU largos crecian demasiado y la navegacion sticky mostraba barra horizontal visible.

Correcciones:

- La pantalla de movimientos ahora usa un solo carril: formulario compacto arriba y Kardex a ancho completo.
- Se agrego encabezado de Kardex con conteo de registros.
- Las filas tienen celdas semanticas para movimiento, stock, referencia y usuario.
- El stock se muestra como lectura operacional tabular, con color discreto para entradas/salidas.
- Mobile usa layout compacto por areas y oculta el scrollbar visual de la navegacion superior.

Resultado:

- Desktop `1280x720`: Kardex a 890px utiles, filas de 89px, sin overflow horizontal, sin errores de consola.
- Mobile `390x844`: ancho de documento estable en 375px, controles de 46-47px, filas compactadas de 279px a 210px, sin targets pequenos, sin errores de consola.

## Smoke visual - footer landing

Ruta revisada: `http://localhost:5173/`, seccion `#contacto`.

Cambios:

- Footer reorganizado como ficha minima de cierre: marca, CTA de cotizacion, promesa breve, navegacion, contacto y compromisos.
- Se agrego `scroll-margin-top` para que el ancla `#contacto` no quede oculta por el nav sticky.
- Se compacto la direccion publica para evitar repetir ciudad/estado cuando ya vienen dentro de la direccion configurada.
- Se mantuvo el cierre en paleta sobria con reticula tecnica discreta, sin nuevas librerias ni cambios de backend.

Resultado:

- Desktop `1280x720`: sin overflow horizontal, links de 40-48px, sin errores de consola.
- Mobile `390x844`: ancho estable de 375px, CTA a ancho completo, sin targets pequenos, sin errores de consola.

## Modo enfoque - panel operativo

Objetivo:

- Despejar la navegacion en flujos de mostrador para que venta, caja, taller e inventario usen mas pantalla.
- Mantener una salida visible y didactica para volver al menu lateral.

Alcance:

- Aplica a `ventas`, `historial de ventas`, `detalle de venta`, `caja`, `reparaciones`, `detalle de reparacion`, `inventario` y `movimientos stock`.
- No aplica a dashboard, clientes, rastreo, reportes ni configuracion por ser vistas mas administrativas o de consulta.
- La preferencia se guarda en `localStorage` como `cellab-panel-focus-mode`.

Cambios:

- Se agrego el boton `Modo enfoque / Mostrar menu` en el header del panel.
- En enfoque, el sidebar se oculta y el workspace ocupa todo el ancho.
- Venta rapida gana espacio para mas productos y carrito mas ancho.
- Caja, reparaciones, inventario y Kardex heredan el lienzo completo sin cambiar logica operativa.

Smoke:

- `/panel/ventas` desktop `1366x768`: POS paso de 1021px a 1286px utiles, sidebar oculto, sin overflow y sin errores de consola.
- `/panel/caja`, `/panel/reparaciones`, `/panel/inventario`: modo enfoque activo, sidebar oculto, boton visible, sin overflow y sin errores de consola.
- `/panel/ventas` mobile `390x844`: ancho estable de 375px, boton de salida a 342x50px, sin targets pequenos y sin errores de consola.

## Flujo rapido - recepcion de reparaciones

Objetivo:

- Reducir friccion cuando llega un cliente no registrado y el operador necesita abrir folio en menos de 2 minutos.
- Evitar el salto `Clientes -> Reparaciones` durante la captura de mostrador.

Cambios:

- `/panel/reparaciones` ahora integra busqueda de cliente y alta rapida dentro del formulario de recepcion.
- El cliente rapido solo pide nombre y telefono; correo/notas quedan opcionales para enriquecer despues desde Clientes.
- Si el operador captura nombre y telefono sin seleccionar cliente, el sistema crea el cliente antes de crear el folio.
- Al crear el folio, el panel abre automaticamente el detalle de la reparacion para continuar diagnostico, pagos o nota.

Guardrails:

- No cambia backend, migraciones, estados de reparacion ni reglas de caja.
- Usa los endpoints existentes `POST /api/operations/clients` y `POST /api/operations/repairs`.
- Mantiene el CRUD completo de clientes para edicion posterior.

Smoke:

- `/panel/reparaciones` desktop `1366x768`: bloque de cliente rapido visible, inputs de nombre/telefono usables, boton a ancho completo, sin overflow horizontal y sin errores de consola.
- `/panel/reparaciones` mobile `390x844`: tarjeta compacta de 370px, controles de 45-46px, sin resultados vacios antes de buscar, sin targets pequenos y sin errores de consola.
- Busqueda rapida: al escribir un cliente existente se muestran coincidencias; al seleccionar una, se ocultan resultados y queda el cliente listo para capturar folio.

Actualizacion:

- Se corrigio el error `Failed to construct FormData`: el formulario se captura antes de operaciones asincronas de cliente/folio.
- El formulario de recepcion crece a 520px en desktop y 560px en modo enfoque para que la captura de mostrador sea mas comoda.
- Smoke funcional: alta controlada de folio con anticipo 0 navego al detalle sin errores de consola.

## Flujo rapido - venta POS

Objetivo:

- Acercar `/panel/ventas` al ritmo de mostrador: buscar por SKU/ID/producto, elegir cantidad y calcular cambio sin pasos extra.
- Mantener las reglas transaccionales actuales de venta, stock y caja.

Cambios:

- Se agrego barra de captura rapida con `SKU / ID / producto`, cantidad y boton `Agregar`.
- El carrito permite editar cantidad con input numerico y botones mas grandes.
- En pago efectivo se agrego `Cliente paga`, lectura de `Cambio` y accesos `Exacto`, `+50`, `+100`.
- El calculo de cambio es solo UI; el backend sigue recibiendo la venta con el contrato actual.

Smoke:

- `/panel/ventas` desktop `1366x768`: agregar por SKU con cantidad 2 funciona, total y cambio se actualizan, sin overflow, sin botones menores a 40px y sin errores de consola.
- `/panel/ventas` mobile `390x844`: barra rapida y caja de cambio apiladas, ancho estable de 375px, sin targets pequenos y sin errores de consola.

## Cierre visual - configuracion

Hallazgo:

- El control de `Requerir caja abierta para operaciones con dinero` se detecto como target de 18x18 en smoke autenticado.

Correccion:

- Se reemplazo la presentacion visual por un switch sobrio con input accesible y area tactil de 44x44.
- Se mantuvo intacto el contrato del formulario: el backend sigue recibiendo `requireOpenCashForMoneyOperations`.

Resultado:

- `/panel/configuracion` desktop `1366x768`: sin overflow, sin targets menores a 40px, sin errores de consola.
- `/panel/configuracion` mobile `390x844`: ancho estable de 375px, sin targets menores a 40px, sin errores de consola.
