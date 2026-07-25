# LocalPOS móvil y PWA para piloto

## Alcance

LocalPOS se mantiene como aplicación React/Vite online-first. La PWA mejora el
acceso desde celular y tableta, pero no convierte el sistema en una aplicación
offline ni modifica transacciones de ventas, caja o inventario.

## Arquitectura

- Manifest de producto genérico `LocalPOS`.
- Inicio instalado en `/panel`.
- Modo `standalone`, orientación libre y lenguaje `es-MX`.
- Service worker generado con `vite-plugin-pwa`.
- Actualización manual mediante aviso; nunca se recarga automáticamente.
- HTML, JavaScript, CSS, iconos e imágenes versionadas pueden formar parte del
  precache.
- Toda ruta cuyo pathname comienza con `/api/` utiliza `NetworkOnly`.
- Las llamadas HTTP usan `cache: no-store`.
- No existe Background Sync, cola de ventas ni persistencia offline de
  mutaciones.

## Sin conexión

Cuando el navegador está offline o la API deja de responder:

1. aparece una barra persistente;
2. los formularios operativos quedan deshabilitados visualmente;
3. el cliente API rechaza mutaciones con código `OFFLINE`;
4. se conserva la navegación estructural;
5. el operador puede utilizar **Reintentar**.

Los datos visibles no deben interpretarse como existencias o importes actuales
cuando la barra de desconexión está activa.

## Instalación

### Android y Chromium

Abrir **Más** y elegir **Instalar LocalPOS** cuando el navegador ofrezca la
instalación.

### iPhone o iPad

En Safari:

1. pulsar **Compartir**;
2. elegir **Agregar a pantalla de inicio**;
3. confirmar el nombre LocalPOS.

## Actualizaciones

Cuando existe una versión nueva aparece:

> Hay una actualización disponible. Guarda tu trabajo y actualiza LocalPOS.

El operador decide entre **Actualizar ahora** o cerrar el aviso. Antes de
actualizar debe terminar cualquier venta, formulario o cierre de caja en curso.

## Limitaciones

- Requiere internet para consultar y registrar operaciones.
- No procesa ventas offline.
- No conserva stock como si fuera actual sin conectividad.
- HTTPS es obligatorio fuera de localhost.
- La instalación depende de capacidades del navegador.

## Solución de problemas

- Si la barra indica desconexión, comprobar internet y pulsar **Reintentar**.
- Si una versión no cambia, cerrar LocalPOS y abrirlo nuevamente.
- Como último recurso, eliminar los datos del sitio desde la configuración del
  navegador y volver a iniciar sesión.
- Nunca limpiar caché durante una venta o cierre de caja.

## Versión validada

Rama: `codex/mobile-pwa-pilot-hardening`.

La validación productiva definitiva se registrará con el SHA desplegado del
piloto.
