# Hito 9A-R — Reparación de regresión visual, UTF-8 y estabilización del panel

Fecha: 2026-06-29

## Objetivo

Reparar la regresión provocada por el intento previo de Hito 9A sin avanzar a Hito 9B ni introducir nuevas funcionalidades. El foco fue recuperar estabilidad visual, compilación y codificación UTF-8 en la capa web.

## Qué se encontró roto

- Varios archivos de `apps/web` tenían texto con mojibake y preguntas incompletas.
- Un intento de reparación mecánica había eliminado signos `?` usados por TypeScript en:
  - ternarios `condición ? a : b`,
  - nullish coalescing `??`,
  - optional chaining `?.`,
  - props opcionales `prop?: tipo`.
- El panel tenía un agrupamiento visual de navegación (`nav-group-title`) que podía deformar el sidebar en tablet/escritorio pequeño.
- El build llegó a pasar una vez con warnings por una secuencia de salto de línea mal escapada en CSS; se limpiaron y se volvió a validar.

## Archivos corregidos directamente

- `apps/web/src/types/index.ts`
- `apps/web/src/components/ChatbotWidget.tsx`
- `apps/web/src/components/RepairTracker.tsx`
- `apps/web/src/components/landing/landingData.ts`
- `apps/web/src/components/landing/FaqSection.tsx`
- `apps/web/src/components/landing/FinalCtaSection.tsx`
- `apps/web/src/components/landing/Footer.tsx`
- `apps/web/src/components/landing/HeroSection.tsx`
- `apps/web/src/components/landing/NavBar.tsx`
- `apps/web/src/components/landing/BrandsSection.tsx`
- `apps/web/src/modules/cash/CashViews.tsx`
- `apps/web/src/modules/inventory/InventoryViews.tsx`
- `apps/web/src/modules/repairs/RepairViews.tsx`
- `apps/web/src/modules/sales/SalesViews.tsx`
- `apps/web/src/pages/PanelPage.tsx`
- `apps/web/src/styles/panel.css`

## Correcciones aplicadas

- Se restauró sintaxis TypeScript/TSX válida en landing, chatbot, rastreo público, POS, caja, inventario, reparaciones y panel.
- Se normalizaron textos visibles a UTF-8 correcto en las zonas reparadas.
- Se conservó el flujo principal del chatbot: intención, marca, falla y preparación de WhatsApp.
- Se conservó el rastreo público con folio + teléfono, sin exponer datos internos.
- Se mantuvieron vistas operativas del panel:
  - venta rápida,
  - historial y detalle de venta,
  - caja y cortes,
  - movimientos de inventario,
  - detalle de reparación con pagos, piezas, eventos e impresión,
  - clientes, productos, reportes y configuración.
- Se simplificó la navegación del panel a una lista plana estable para evitar deformación de sidebar.
- Se eliminó el CSS obsoleto de `nav-group-title` y se conservaron mejoras seguras:
  - overflow horizontal de tablas en móvil,
  - nota visual para restricciones de rol técnico.

## Qué se simplificó o revirtió parcialmente

- Se retiró el agrupamiento visual experimental de navegación del Hito 9A porque era el punto más probable de regresión responsive.
- Se compactaron vistas con JSX excesivamente largo o dañado para recuperar mantenibilidad y compilación.
- No se agregaron features nuevas ni se tocaron migraciones/backend para este hito.

## Validaciones ejecutadas

```bash
npm run typecheck -w @cellab/web
npm run typecheck -w @cellab/api
npm run typecheck
npm run build
```

Resultado: todas aprobadas.

## Barrido de codificación

Se revisaron patrones típicos de mojibake en pps/web/src, docs y README.md.

Resultado final: sin hallazgos en el barrido ejecutado.

## Smoke visual

No se ejecutó navegación manual completa en navegador durante este hito. La verificación quedó cubierta por compilación estricta, build de producción sin warnings y saneamiento de CSS crítico del panel.

## Estado para continuar

El sistema queda estable para continuar hacia Hito 9B, con una recomendación: antes de nuevas mejoras UX grandes, hacer un smoke manual en navegador de:

1. `/panel`
2. `/panel/ventas`
3. `/panel/caja`
4. `/panel/reparaciones`
5. `/panel/inventario/movimientos`
6. `/panel/configuracion`
7. landing pública y rastreo por folio

## Nota de alcance

El repositorio conserva cambios no commiteados de hitos anteriores. Este hito no intentó limpiar ni revertir trabajo ajeno al problema de regresión/codificación.


