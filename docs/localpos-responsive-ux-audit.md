# Auditoría responsive LocalPOS

## Objetivo operativo

Una persona con poca experiencia debe identificar inmediatamente en celular:

1. abrir o cerrar caja;
2. vender;
3. consultar inventario;
4. registrar producto;
5. registrar cliente.

## Problemas encontrados

- El menú móvil mostraba todos los módulos como iconos horizontales sin texto.
- El dashboard priorizaba métricas y actividad antes que tareas.
- El carrito aparecía después de todo el catálogo.
- Caja mezclaba apertura/cierre con configuración e historial.
- El catálogo mostraba herramientas administrativas antes de existencias.
- Formularios móviles utilizaban tamaños de texto que podían provocar zoom.
- No existían manifest, service worker, instalación ni estados offline.
- `panel.css` contiene múltiples capas responsive; se evitó añadir más reglas
  específicas dentro de ese archivo.

## Decisiones

- Escritorio conserva sidebar.
- Tableta conserva sidebar compacto.
- Celular usa barra inferior: Inicio, Vender, Inventario, Caja y Más.
- Los módulos secundarios viven en una hoja inferior accesible.
- El dashboard muestra primero acciones operativas.
- La acción de caja cambia entre abrir, cerrar o consultar según estado y rol.
- Inventario muestra existencias antes de las herramientas de administración.
- Registrar producto lleva al formulario existente mediante ancla.
- Venta usa una barra fija de carrito y una hoja de cobro.
- Caja oculta en celular la creación de terminales y prioriza apertura/cierre.
- Los inputs operativos usan 16 px en móvil.
- Se agregó una capa CSS separada: `mobile-pwa.css`.

## Viewports objetivo

- 390 × 844.
- 430 × 932.
- 844 × 390.
- 768 × 1024.
- 820 × 1180.
- 1024 × 768.
- 1366 × 768.
- 1440 × 900.

## Rutas de smoke

- `/login`.
- `/panel`.
- `/panel/ventas`.
- `/panel/ventas/historial`.
- `/panel/inventario`.
- `/panel/inventario/movimientos`.
- `/panel/clientes`.
- `/panel/caja`.
- `/panel/configuracion`.

## Pendientes humanos

Antes del piloto físico una persona sin contexto técnico debe realizar apertura,
venta, consulta de inventario y cierre. Registrar cualquier palabra que no
entienda, botón que no encuentre o acción accidental antes de cambiar el
diseño.

También permanecen pendientes y no se consideran aprobadas por el smoke
automatizado:

- instalación real mediante HTTPS en Android y iPhone;
- prueba con teclado físico conectado al teléfono o tableta;
- prueba presencial con el operador del negocio;
- verificación del icono y del modo standalone en dispositivos reales.

## Fuera de alcance

- Operación offline.
- Aplicación nativa.
- Cambios en endpoints.
- Cambios monetarios o contables.
- Migraciones productivas.
- Despliegue.
