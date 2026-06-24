# Fase 1 — Generalización a LocalPOS

## Decisión

LocalPOS es el producto. CelLab Tuxtla es la primera configuración instalada. Este hito no implementa multi-tenant ni renombra tablas operativas existentes.

La configuración del negocio se guarda en una única fila de `business_settings`. El ID fijo del seed permite repetirlo sin duplicar el negocio piloto. Una evolución SaaS deberá introducir `business_id` mediante una migración separada y explícita.

## Contrato de configuración

La tabla incluye nombre y tipo de negocio, logotipo, teléfono, ubicación, mensajes para ticket y garantía, moneda y color primario. Los importes continúan guardándose en centavos; la moneda configurada controla su presentación.

Endpoints protegidos:

- `GET /api/operations/business-settings`: admin y technician.
- `PATCH /api/operations/business-settings`: sólo admin.

La autorización de edición se aplica en backend. El modo de sólo lectura del frontend es una ayuda de interfaz, no el control de seguridad.

## Panel

- `/panel` usa LocalPOS como identidad del producto.
- `/panel/configuracion` muestra los datos del negocio activo.
- El nombre del negocio aparece como contexto secundario.
- `primary_color` alimenta los acentos visuales.
- La vista previa de nota consume logotipo, ubicación, teléfono, moneda y mensajes desde la configuración.

La landing permanece identificada como CelLab Tuxtla porque corresponde al negocio piloto y no al producto POS.

## Compatibilidad

Se conservan las siete tablas previas, los folios REP, el historial de taller, rutas CRUD y namespaces internos `@cellab/*`. La migración `0001_goofy_richard_fisk.sql` sólo crea `business_settings`.

## Despliegue

```bash
pnpm --filter @cellab/api db:migrate
pnpm --filter @cellab/api db:seed
pnpm dev
```

El seed crea la configuración inicial de CelLab y crea o actualiza el administrador cuando están definidas `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
