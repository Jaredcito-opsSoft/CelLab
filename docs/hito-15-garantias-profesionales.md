# Hito 15 — Garantías profesionales (primera fase)

## Objetivo

Agregar un flujo trazable de reclamos de garantía vinculado a reparaciones y clientes, conservando el historial y sin exponer información interna en rutas públicas.

## Alcance implementado

- Folios transaccionales `GAR-00001` mediante `folio_counters`.
- Reclamo vinculado obligatoriamente a una reparación entregada y a su cliente.
- Validación de vigencia usando `warranty_until`.
- Excepción fuera de vigencia exclusiva para `admin` y `manager`, con justificación obligatoria.
- Un solo reclamo activo por reparación.
- Estados controlados: recibido, revisión, aprobado, rechazado, en proceso, resuelto, cerrado y cancelado.
- Evidencia textual, diagnóstico, resolución y motivo de rechazo.
- Timeline inmutable en `warranty_claim_events`.
- Evento resumido en el historial de la reparación al abrir y terminar un reclamo.
- Auditoría transversal sin copiar textos sensibles completos a metadata.
- Vista interna con listado, filtros, alta, evaluación, transiciones e historial.
- Sin borrado físico ni endpoint `DELETE`.

## API

Router: `apps/api/src/modules/warranties/warranties.routes.ts`, montado como `/api/operations/warranties`.

- `GET /` — lista y filtra reclamos autenticados.
- `GET /eligible-repairs` — reparaciones entregadas, vigentes y sin reclamo activo.
- `GET /:id` — detalle interno e historial.
- `POST /` — abre reclamo para roles de taller.
- `PATCH /:id/assessment` — actualiza evaluación y agrega evento.
- `POST /:id/status` — aplica una transición válida y agrega evento.

Los estados de aprobación, rechazo, cierre y cancelación requieren `admin` o `manager`. El rol `viewer` solo consulta. El backend aplica estos permisos independientemente de la UI.

## Reglas transaccionales

La creación agrupa en una sola transacción el contador, el reclamo, su primer evento, el vínculo en `repair_events` y el registro de auditoría. Los cambios de evaluación y estado también agrupan el registro principal, evento y auditoría.

La garantía no modifica automáticamente el estado técnico de la reparación, su vigencia, pagos, caja o inventario. Las piezas usadas durante una garantía deberán integrarse en una fase posterior reutilizando movimientos de inventario transaccionales.

## Privacidad

No se modificó `/api/public/repairs/track`. Diagnóstico, evidencia, resolución, responsables e historial de garantía permanecen exclusivamente en rutas autenticadas. Una futura vista pública deberá diseñar un DTO limitado antes de exponer cualquier estado.

## Archivos del módulo

- `apps/api/src/modules/warranties/warranties.routes.ts`
- `apps/web/src/modules/warranties/WarrantyViews.tsx`
- `docs/hito-15-garantias-profesionales.md`

La integración compartida requiere el schema y migración incremental de `warranty_claims`/`warranty_claim_events`, la clave modular `warranties`, montaje en `main.ts`, ruta de panel y estilos del panel.

## No implementado

- Fotografías, archivos o Supabase Storage.
- Firma digital o autorización remota.
- Consumo de piezas, pagos o notas de crédito derivados del reclamo.
- Consulta pública del reclamo.
- Reapertura de reclamos terminales.

## Smoke recomendado

1. Entregar una reparación con garantía vigente.
2. Abrir reclamo y confirmar folio `GAR` y evento en reparación.
3. Intentar segundo reclamo activo para la misma reparación: debe responder `409`.
4. Technician documenta evaluación y avanza a revisión.
5. Technician intenta aprobar/rechazar: debe responder `403`.
6. Manager aprueba; taller pasa a proceso y resuelve con texto obligatorio.
7. Manager cierra el reclamo.
8. Verificar timeline completo y eventos de auditoría.
9. Confirmar que rastreo público no contiene diagnóstico, evidencia ni resolución.
