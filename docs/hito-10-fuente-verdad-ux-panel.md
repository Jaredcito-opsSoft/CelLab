# Hito 10 - Fuente de verdad, UTF-8 y UX operativa del panel

Fecha: 2026-07-04

## Objetivo

Estabilizar la fuente de verdad tecnica del proyecto LocalPOS / CelLab Tuxtla, corregir mojibake visible y mejorar la claridad de `/panel/configuracion` sin cambiar reglas transaccionales, endpoints, migraciones ni permisos backend.

## Alcance

- Se agrego la fuente de verdad para agentes dentro del repositorio.
- Se corrigio codificacion visible en `README.md`.
- Se corrigieron mensajes publicos de rastreo en `apps/api/src/modules/public/public.routes.ts`.
- Se reorganizo la configuracion del panel en secciones: Negocio, Tickets, Caja, Garantias, Usuarios y Avanzado.
- Se pulio el control de politica de caja abierta como switch con area tactil amplia.
- Se mantuvo la configuracion actual como single-business; no se expuso multiempresa real.

## Archivos tocados

- `.codex/skills/localpos-cellab-source-of-truth/SKILL.md`
- `.codex/skills/localpos-cellab-source-of-truth/agents/openai.yaml`
- `.codex/skills/localpos-cellab-source-of-truth/references/source-of-truth.md`
- `docs/AI_SOURCE_OF_TRUTH.md`
- `README.md`
- `apps/api/src/modules/public/public.routes.ts`
- `apps/web/src/pages/PanelPage.tsx`
- `apps/web/src/styles/panel.css`
- `docs/hito-10-fuente-verdad-ux-panel.md`

## Cambios

### Fuente de verdad

Se incorporo una skill local del proyecto para que los agentes trabajen con la jerarquia correcta:

1. Codigo actual.
2. Schema y migraciones Drizzle.
3. Smoke tests y docs de hitos cerrados.
4. Documentos maestros.
5. Memoria conversacional.

Tambien se agrego `docs/AI_SOURCE_OF_TRUTH.md` como copia legible de la auditoria operativa.

### UTF-8 y mojibake

Se corrigieron textos con codificacion rota en:

- README: `pública`, `módulo`, `Configuración`, `lógico`, `reparación`.
- API publica: estados y mensajes de rastreo para diagnostico, autorizacion, reparacion, garantia y contacto por WhatsApp.

### UX de configuracion

La pantalla de configuracion ya no muestra todos los campos como un bloque plano. Ahora agrupa:

- Negocio: datos visibles en panel, landing, recibos y rastreo.
- Tickets: moneda, color y mensaje de ticket.
- Caja: timezone y politica de caja abierta.
- Garantias: mensaje base de garantia.
- Usuarios: estado actual y recordatorio de Hito 11.
- Avanzado: advertencia de que multiempresa y refactor de nombres siguen pendientes.
- El checkbox de caja abierta obligatoria se convirtio en un switch operable de 44px para escritorio y movil.

## No implementado

- No se agregaron usuarios, roles nuevos ni `audit_logs`; eso corresponde a Hito 11.
- No se modificaron migraciones ni schema.
- No se separo `PanelPage.tsx` ni `operations.routes.ts`; queda como deuda tecnica gradual.
- No se implemento multiempresa, sucursales ni cajas por cajero.

## Validacion

- `npm run typecheck -w @cellab/web`: aprobado.
- `npm run typecheck -w @cellab/api`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado.
- Barrido focalizado de mojibake en README, API publica, web, docs y skills locales: sin hallazgos.
- Smoke visual autenticado de `/panel/configuracion` en escritorio `1366x768`: sin overflow, sin controles menores a 40px, sin errores de consola.
- Smoke visual autenticado de `/panel/configuracion` en movil `390x844`: sin overflow, sin controles menores a 40px, sin errores de consola.

## Revalidacion 2026-07-05

- Se normalizaron archivos UTF-8 con BOM a UTF-8 sin BOM para evitar ruido en diffs y lecturas de terminal.
- Se corrigio el control `Usuario activo` del bloque administrativo de usuarios para conservar un area operable de 44x44.
- Re-smoke landing y `/panel/configuracion` en escritorio `1366x768`: sin overflow, sin mojibake, sin controles menores a 40px y sin errores de consola.
- Re-smoke landing y `/panel/configuracion` en movil `390x844`: sin overflow, sin mojibake, sin controles menores a 40px y sin errores de consola.

## Pendientes

- Hito 10 queda estable para avanzar a Hito 11: usuarios, roles y auditoria inicial.
- Seguir puliendo tablas densas y acciones secundarias por modulo en siguientes pases visuales.
