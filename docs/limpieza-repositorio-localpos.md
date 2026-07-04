# Limpieza controlada del repositorio LocalPOS / CelLab

Fecha: 2026-06-29

## Alcance

Limpieza segura del frontend y artefactos generados, sin implementar funciones nuevas y sin modificar backend, base de datos, migraciones, rutas, endpoints ni lógica operativa.

El repositorio ya tenía cambios previos sin commitear antes de esta limpieza. Por eso se evitó tocar archivos funcionales y se priorizaron eliminaciones con evidencia de no uso.

## Auditoría inicial

Se revisó:

- `git status --short`
- `git diff --stat`
- assets visuales en `apps/web/public` y `apps/web/src`
- referencias con `rg`
- carpetas vacías
- `.gitkeep`
- artefactos ignorados por `.gitignore`

Hallazgos relevantes:

- `apps/web/dist` estaba generado e ignorado por `.gitignore`.
- `apps/web/public/cases/*` no tenía referencias desde código fuente actual.
- `apps/web/public/hero/frame_*.png` y `apps/web/public/hero/_src/frame_*.png` no tenían referencias desde código fuente actual.
- El hero actual usa componentes nativos en React/CSS, no la secuencia antigua de frames.
- `apps/web/public/favicon.svg` sí está referenciado desde `apps/web/index.html` y se conservó.
- Existían `.gitkeep` redundantes en carpetas frontend que ya tenían contenido real o que eran placeholders antiguos sin imports.

## Archivos eliminados

### Assets públicos antiguos no referenciados

Se eliminaron porque no aparecían importados ni referenciados en `apps/web`, y pertenecían a iteraciones visuales anteriores:

- `apps/web/public/cases/case-01.svg`
- `apps/web/public/cases/case-02.svg`
- `apps/web/public/cases/case-03.svg`
- `apps/web/public/cases/case-04.svg`
- `apps/web/public/cases/case-05.svg`
- `apps/web/public/cases/case-06.svg`
- `apps/web/public/cases/case-07.svg`
- `apps/web/public/cases/case-08.svg`
- `apps/web/public/cases/case-09.svg`
- `apps/web/public/cases/case-10.svg`
- `apps/web/public/cases/honor_5xb_plus.png`
- `apps/web/public/cases/huawei_p30_lite.png`
- `apps/web/public/cases/iphone_15.png`
- `apps/web/public/cases/moto_edge_40_neo.png`
- `apps/web/public/cases/moto_edge_50_fusion.jpg`
- `apps/web/public/cases/moto_g54_5g.jpg`
- `apps/web/public/cases/moto_g54_5g.png`
- `apps/web/public/cases/moto_razer_60.jpg`
- `apps/web/public/cases/samsung_s25.jpg`
- `apps/web/public/hero/_src/frame_1.png`
- `apps/web/public/hero/_src/frame_2.png`
- `apps/web/public/hero/_src/frame_3.png`
- `apps/web/public/hero/_src/frame_4.png`
- `apps/web/public/hero/_src/frame_5.png`
- `apps/web/public/hero/frame_1.png`
- `apps/web/public/hero/frame_2.png`
- `apps/web/public/hero/frame_3.png`
- `apps/web/public/hero/frame_4.png`
- `apps/web/public/hero/frame_5.png`

### `.gitkeep` eliminados

Se eliminaron por ser placeholders frontend redundantes o carpetas antiguas sin imports:

- `apps/web/src/components/.gitkeep`
- `apps/web/src/modules/clientes/.gitkeep`
- `apps/web/src/modules/dashboard/.gitkeep`
- `apps/web/src/modules/inventario/.gitkeep`
- `apps/web/src/modules/reparaciones/.gitkeep`
- `apps/web/src/modules/ventas/.gitkeep`

## Carpetas eliminadas

Se eliminaron solo cuando quedaron vacías:

- `apps/web/public/cases`
- `apps/web/public/hero/_src`
- `apps/web/public/hero`
- `apps/web/src/modules/clientes`
- `apps/web/src/modules/dashboard`
- `apps/web/src/modules/inventario`
- `apps/web/src/modules/reparaciones`
- `apps/web/src/modules/ventas`
- `apps/web/scripts`
- `apps/web/node_modules/.vite-temp`

También se eliminó `apps/web/dist` por ser salida de build ignorada. La validación de build puede regenerarla.

## Archivos conservados aunque parecían candidatos

- `apps/web/public/favicon.svg`: se conserva porque está referenciado por `apps/web/index.html`.
- `apps/web/src/styles/global.css`: se conserva completo porque contiene estilos globales y widgets públicos que podrían seguir activos.
- `apps/web/src/styles/panel.css`: se conserva como hoja central del panel, según la estructura actual.
- `apps/web/src/styles/landing-redesign.css`: se conserva porque la landing actual depende de ella.
- `apps/web/src/styles/hero-motion.css`: se conserva porque `LandingPage.tsx` la importa directamente.
- `apps/api/**`: no se tocó por restricción explícita de no modificar backend.
- `apps/api/drizzle/**`: no se tocó por restricción explícita de no tocar migraciones/base de datos.
- `docs/hito-*.md`: se conservan como historial funcional y de auditoría del producto.
- `.env.example`, `README.md`, `.gitignore`: se conservaron.

## Cambios CSS realizados

No se realizaron cambios CSS en esta limpieza.

Motivo: ya existían correcciones tipográficas recientes en `panel.css`, `landing-redesign.css` y `global.css`; para esta fase se evitó tocar estilos sin una falla visual nueva y reproducible. Se conservaron reglas legacy por prudencia cuando podían afectar landing, FAQ, chatbot o rastreo público.

## Riesgos detectados

- El worktree ya estaba sucio antes de iniciar la limpieza, con múltiples cambios de hitos previos.
- Hay módulos frontend nuevos sin trackear (`cash`, `inventory`, `repairs`) que son funcionales y no deben confundirse con basura.
- Hay cambios backend previos sin commitear, pero esta limpieza no los modificó.
- La revisión visual automatizada depende de que el servidor local esté activo. Si no lo está, se recomienda correr `npm run dev` y revisar rutas manualmente.

## Recomendaciones futuras

- Separar limpieza de assets en commits pequeños cuando el estado del repo esté estabilizado.
- Mantener `public/` solo para recursos realmente servidos por URL pública.
- Evitar dejar secuencias frame-by-frame antiguas si el hero actual ya usa animación nativa.
- Documentar placeholders futuros en `README.md` o `docs/arquitectura`, en lugar de conservar carpetas vacías que confunden auditorías.
- Más adelante, consolidar CSS legacy con una tarea dedicada y screenshots de comparación, no dentro de una limpieza general.
