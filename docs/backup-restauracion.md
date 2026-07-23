# Respaldo y restauración

Objetivo inicial: RPO máximo de 24 horas y RTO de 4 horas para el piloto. Ajustarlo al crecer el volumen.

- Generar backup diario y antes de cada migración con `scripts/backup-postgres.ps1`.
- El script exporta los esquemas portables de la aplicación (`public` y `drizzle`), no extensiones internas administradas por Supabase.
- Conservar 7 diarios, 4 semanales y 3 mensuales en almacenamiento cifrado fuera del servidor.
- Verificar cada archivo con `scripts/verify-backup.ps1` y conservar su SHA-256.
- Ensayar restauración mensual en una base temporal con `scripts/restore-postgres.ps1`.
- Nunca probar una restauración sobre producción. El script la bloquea salvo autorización explícita.
- La restauración usa `--clean --if-exists`: el destino debe ser una base temporal dedicada y sin datos que deban conservarse.
- Los backups administrados por el proveedor no sustituyen el ensayo de restauración de la aplicación.

Después de restaurar: aplicar migraciones pendientes, ejecutar auditoría de base, iniciar API contra la base temporal y aprobar `smoke:release` antes de declarar el respaldo utilizable.
