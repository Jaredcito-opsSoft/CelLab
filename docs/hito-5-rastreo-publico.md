# Hito 5 — Rastreo público real por folio

## Resumen

Se reemplazó el rastreo con mocks por un endpoint público real conectado a reparaciones. La consulta requiere folio y teléfono para reducir exposición de datos.

## Endpoint público

- `POST /api/public/repairs/track`

Entrada:

```json
{
  "folio": "REP-00001",
  "phone": "9611234567"
}
```

Respuesta encontrada:

```json
{
  "found": true,
  "folio": "REP-00001",
  "status": "diagnosis",
  "statusLabel": "En diagnóstico",
  "device": "Samsung A05",
  "lastUpdate": "2026-06-25T18:30:00.000Z",
  "publicMessage": "Estamos revisando la falla reportada.",
  "nextStep": "Te avisaremos cuando tengamos cotización.",
  "warrantyUntil": null,
  "businessName": "CelLab Tuxtla"
}
```

Respuesta no encontrada:

```json
{
  "found": false,
  "message": "No encontramos una reparación con esos datos. Revisa el folio o comunícate por WhatsApp."
}
```

## Seguridad

- No requiere JWT.
- Valida folio y teléfono.
- Normaliza teléfono comparando últimos 10 dígitos.
- Aplica rate limit básico.
- No devuelve notas internas, pagos, dirección, historial interno ni datos sensibles.
- Solo consulta reparaciones con `tracking_enabled = true`.

## Frontend

Componente actualizado:

- `apps/web/src/components/RepairTracker.tsx`

La landing monta el rastreador real en la sección `#rastrear`.

## Pendientes conocidos

- No hay ruta independiente `/rastrear`; se usa la sección en landing.
- El mensaje público depende de `public_notes` o del estado actual.

## Validaciones

Ejecutado:

```bash
pnpm typecheck
pnpm build
```
