# Runbook de lanzamiento piloto

## Ventana previa

1. Congelar cambios funcionales 24 horas antes.
2. Ejecutar `npm run verify` y `npm run preflight:release -- --strict`.
3. Generar `powershell -File scripts/backup-postgres.ps1` y verificar con `scripts/verify-backup.ps1`.
4. Registrar versión, SHA del código, migración más reciente y responsable.
5. Aplicar migraciones con `npm run db:migrate -w @cellab/api` desde una sola máquina.
6. Desplegar primero API y esperar `/health/ready`; después desplegar web.
7. Ejecutar el smoke de lanzamiento y una venta controlada de importe conocido.

## Observación inicial

Durante las primeras dos horas revisar cada 15 minutos: readiness, tasa de 5xx, latencia, conexiones PostgreSQL, ventas contra movimientos de inventario y sesiones de caja abiertas. Durante la primera semana hacer conciliación diaria de ventas, efectivo, devoluciones y stock crítico.

## Rollback

- Si falla únicamente la web, volver al artefacto web anterior; no revertir datos.
- Si falla la API antes de una migración, volver al artefacto anterior.
- Si ya hubo una migración y escritura real, no ejecutar SQL inverso improvisado. Detener nuevas operaciones, conservar logs/request IDs, desplegar una corrección compatible o restaurar solo con autorización y medición de pérdida potencial.
- Una venta con respuesta desconocida debe buscarse por folio/movimiento antes de repetirla.
