# Hito 6 — Dashboard / Panel operativo UI/UX senior

Fecha: 2026-06-26  
Producto: LocalPOS / CelLab Tuxtla

## Objetivo

Elevar el panel operativo de LocalPOS a una experiencia más cercana a producto vendible para negocios locales, manteniendo intacto el MVP existente: autenticación, roles, ventas POS-lite, reparaciones, inventario, rastreo público, configuración del negocio e impresión de notas.

## Skills de diseño aplicadas

- `frontend-design`: se usó para evitar una interfaz genérica y reforzar dirección visual con intención de producto.
- `interface-design`: se instaló desde `dammyjay93/interface-design` y se leyó como referencia de criterio UI/UX para jerarquía, claridad operacional y responsive. Nota: puede requerir reiniciar Codex para aparecer formalmente en la lista de skills disponibles.

## Cambios implementados

### API

Se agregó un endpoint read-only:

- `GET /api/operations/dashboard/summary`

Entrega datos agregados reales para el panel:

- ventas completadas de hoy;
- ingresos POS del día;
- reparaciones activas;
- reparaciones listas para entregar;
- productos con stock crítico;
- total de productos;
- total de clientes;
- ventas recientes;
- reparaciones recientes;
- movimientos recientes de inventario.

El endpoint no modifica datos y no altera los endpoints anteriores.

### Panel web

Se rediseñó la experiencia del dashboard operativo:

- centro de mando con resumen de venta del día;
- KPIs de ventas, taller, stock y clientes;
- acciones rápidas para venta, reparación, clientes, inventario, movimientos, rastreo y configuración;
- actividad reciente de ventas, taller e inventario;
- badges de estado más claros;
- rutas directas para módulos operativos.

### Navegación

Se consolidaron rutas directas en el panel:

- `/panel`
- `/panel/ventas`
- `/panel/ventas/historial`
- `/panel/reparaciones`
- `/panel/clientes`
- `/panel/inventario`
- `/panel/inventario/movimientos`
- `/panel/rastreo`
- `/panel/reportes`
- `/panel/configuracion`

### Responsive y UI

Se agregó una capa CSS del Hito 6 sin reescribir los estilos previos, para reducir riesgo de ruptura:

- sidebar más premium y técnica;
- topbar sticky con blur sutil;
- tarjetas de KPI con jerarquía clara;
- acciones rápidas táctiles;
- layout responsive para tablet y móvil;
- soporte `prefers-reduced-motion`;
- se preservaron reglas `@media print` existentes para notas imprimibles.

## Archivos modificados

- `apps/api/src/modules/operations/operations.routes.ts`
- `apps/web/src/pages/PanelPage.tsx`
- `apps/web/src/styles/panel.css`
- `docs/hito-6-dashboard-panel-uiux-senior.md`

## Auditoría de impresión

Se revisó que la capa visual del Hito 6 no elimine ni sobrescriba las reglas de impresión existentes para:

- ticket de venta POS-lite (`.print-ticket`);
- nota de reparación (`.repair-print-note`).

La nueva capa evita tocar `@media print` salvo respetar los estilos ya existentes.

## Validaciones

- API typecheck: aprobado con `pnpm --filter @cellab/api typecheck`.
- Web typecheck: aprobado con `pnpm --filter @cellab/web typecheck`.
- Typecheck raíz: aprobado con `pnpm typecheck`.
- Build producción: aprobado con `pnpm build`.
- Lint: el proyecto no declara script `lint` en `package.json`.

## Smoke test funcional

Se ejecutó un smoke local no destructivo:

- `GET /health`: aprobado.
- Login + `GET /api/operations/dashboard/summary`: bloqueado por DNS externo del entorno hacia Supabase (`getaddrinfo EAI_AGAIN db.kfnkkncpbhmlrlaczfhy.supabase.co`).

El bloqueo ocurre antes de consultar el endpoint nuevo, durante la consulta de usuario del login. No apunta a una regresión del código del Hito 6; requiere conectividad DNS estable hacia Supabase para repetir el smoke autenticado.