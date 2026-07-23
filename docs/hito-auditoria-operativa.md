# Cierre de Auditoría Operativa

Fecha: 2026-07-12

## Objetivo

Convertir la bitácora técnica ya existente en una herramienta operativa consultable desde el panel, conservando el modelo de seguridad actual y sin modificar el esquema de base de datos.

## Alcance implementado

- Ruta de panel `/panel/auditoria`.
- Acceso visible exclusivamente para administradores.
- Protección backend existente mediante `requireRole(...roleGroups.adminOnly)`.
- Búsqueda por acción, entidad, correo del actor o resumen.
- Filtros exactos por acción y entidad.
- Rango de fechas inclusivo por día.
- Límite máximo de 120 eventos en la vista.
- Presentación de actor, rol, fecha, acción, entidad, referencia y metadata resumida.
- Estados de carga, error, vacío y acceso restringido.
- Validación de rango de fechas en frontend.
- Navegación y controles adaptables a tablet y móvil.

## Archivos

- `apps/api/src/modules/audit/audit.routes.ts`
- `apps/web/src/modules/audit/AuditLogView.tsx`
- `apps/web/src/pages/PanelPage.tsx`
- `apps/web/src/styles/panel.css`

## Decisiones de seguridad

- La ruta API continúa siendo solo para `admin`; ocultar la navegación es una mejora de UX, no el control de seguridad.
- La bitácora es de solo lectura.
- No se expusieron secretos ni se añadieron mutaciones de auditoría.
- No se modificaron tablas, migraciones, ventas, caja, inventario, reparaciones ni autenticación.

## Decisiones de UX

- Los filtros se aplican de forma explícita para evitar una petición por cada tecla.
- Las opciones de acción y entidad son estables y no desaparecen cuando un filtro devuelve cero resultados.
- La vista prioriza la pregunta operativa: quién cambió qué y cuándo.
- Se mantiene el sistema visual del panel: papel técnico, tinta operativa y azul de diagnóstico reservado a acciones y estados.

## Validación ejecutada

- `npm run typecheck -w @cellab/web`: aprobado.
- `npm run typecheck -w @cellab/api`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado.
- Permiso backend: la ruta conserva `requireRole(...roleGroups.adminOnly)` y el smoke de permisos existente valida `403` para un rol no administrador.
- Smoke autenticado contra la API real: búsqueda `COM-00005` devolvió exactamente sus tres eventos relacionados.
- Smoke visual autenticado de `/panel/auditoria`: aprobado en escritorio y 375 px, sin overflow horizontal.
- Consola del navegador: sin errores.

## No implementado

- Exportación CSV/PDF.
- Paginación por cursor.
- Retención o archivado de eventos.
- Panel analítico de tendencias.
- Auditoría de entidades que todavía no generan eventos en backend.

Estas capacidades deben evaluarse posteriormente según volumen real de operación; no son necesarias para el cierre actual.
