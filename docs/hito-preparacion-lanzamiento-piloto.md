# Hito — Preparación de lanzamiento piloto

## Implementado

- Liveness y readiness con comprobación PostgreSQL.
- Logs estructurados, `x-request-id` y tiempos de respuesta sin registrar cuerpos ni secretos.
- Cierre ordenado de HTTP y pool de base de datos.
- Preflight de variables de producción y smoke autenticado no destructivo.
- Prueba de carga de solo lectura configurable con percentiles y umbral de p95.
- Backup, validación y restauración con herramientas nativas o Docker.
- Contenedores reproducibles para API y web, healthcheck y fallback SPA.
- Hardening de Data API: RLS en tablas públicas, privilegios `anon`/`authenticated` revocados y defaults protegidos.
- Checklist go-live, runbooks de despliegue/incidentes, recuperación y onboarding.

## Estado de base auditado

PostgreSQL 17.6; 31 tablas públicas con RLS activo; cero grants de tabla para `anon` o `authenticated`. La API conserva acceso mediante la conexión propietaria y su autenticación JWT.

Se generó y verificó un respaldo portable con SHA-256. La restauración aislada en PostgreSQL 17 recuperó 31 tablas, 1 configuración de negocio y 36 usuarios; el contenedor temporal se eliminó al terminar.

## Capacidad medida

- 3 solicitudes concurrentes, 30 lecturas operativas: 100% éxito, p50 1.10 s, p95 1.78 s.
- 10 solicitudes concurrentes, 50 lecturas operativas: 100% éxito, p50 2.54 s, p95 4.35 s.

Por ello el piloto se autoriza técnicamente para 1–3 cajas. Diez cajas son funcionales en la prueba, pero requieren optimización adicional o infraestructura más cercana antes de ofrecer un SLA de respuesta ágil.

## Pendientes antes de marcar GO

- Sustituir URLs locales por dominios HTTPS y ejecutar el preflight estricto.
- Añadir `sslmode=require` a la conexión o confirmar TLS obligatorio del pooler.
- Retirar `ADMIN_PASSWORD` del runtime después del bootstrap.
- Copiar el backup cifrado fuera de este equipo y definir responsables del piloto.

## Alcance recomendado

El lanzamiento debe ser un piloto controlado: un negocio, 1–3 cajas iniciales, operadores identificados, soporte cercano y conciliación diaria. La arquitectura admite hasta 10 cajas configuradas, pero el objetivo de esta salida es validar operación y recuperación, no prometer todavía multiempresa SaaS ni alta disponibilidad.
