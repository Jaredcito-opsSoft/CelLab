param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [Parameter(Mandatory = $true)][string]$TargetDatabaseUrl,
  [switch]$AllowProduction,
  [switch]$ConfirmRestore
)
$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path $BackupPath).Path
if (-not $AllowProduction -and $env:DATABASE_URL -and $TargetDatabaseUrl -eq $env:DATABASE_URL) {
  throw 'Restauración bloqueada sobre DATABASE_URL actual. Usa una base temporal o -AllowProduction de forma explícita.'
}
if (-not $ConfirmRestore) {
  $confirmation = Read-Host 'Escribe RESTAURAR para continuar sobre la base destino'
  if ($confirmation -ne 'RESTAURAR') { throw 'Restauración cancelada.' }
}
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if ($pgRestore) {
  & $pgRestore.Source --dbname=$TargetDatabaseUrl --clean --if-exists --no-owner --no-acl --exit-on-error $resolved
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
  $directory = Split-Path $resolved
  $name = Split-Path $resolved -Leaf
  $previous = $env:LOCALPOS_RESTORE_DATABASE_URL
  try {
    $env:LOCALPOS_RESTORE_DATABASE_URL = $TargetDatabaseUrl
    & docker run --rm --env LOCALPOS_RESTORE_DATABASE_URL --volume "${directory}:/backup:ro" postgres:17-alpine sh -c "pg_restore --dbname=`"`$LOCALPOS_RESTORE_DATABASE_URL`" --clean --if-exists --no-owner --no-acl --exit-on-error /backup/$name"
  } finally { $env:LOCALPOS_RESTORE_DATABASE_URL = $previous }
} else { throw 'Instala PostgreSQL client tools o Docker para restaurar.' }
if ($LASTEXITCODE -ne 0) { throw 'La restauración falló; revisa la base temporal antes de continuar.' }
Write-Host 'Restauración terminada. Ejecuta migraciones y smoke:release contra la base restaurada.'
