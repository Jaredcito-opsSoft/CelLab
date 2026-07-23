param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\backups')
)
$ErrorActionPreference = 'Stop'
if (-not $DatabaseUrl) {
  $envFile = Join-Path $PSScriptRoot '..\.env'
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
    if ($line) { $DatabaseUrl = ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim('"', "'") }
  }
}
if (-not $DatabaseUrl) { throw 'DATABASE_URL no está definida.' }
$resolved = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolved | Out-Null
$name = 'localpos-{0}.dump' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
$path = Join-Path $resolved $name
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if ($pgDump) {
  & $pgDump.Source --dbname=$DatabaseUrl --format=custom --no-owner --no-acl --schema=public --schema=drizzle --file=$path
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
  $previous = $env:LOCALPOS_BACKUP_DATABASE_URL
  try {
    $env:LOCALPOS_BACKUP_DATABASE_URL = $DatabaseUrl
    & docker run --rm --env LOCALPOS_BACKUP_DATABASE_URL --volume "${resolved}:/backup" postgres:17-alpine sh -c "pg_dump --dbname=`"`$LOCALPOS_BACKUP_DATABASE_URL`" --format=custom --no-owner --no-acl --schema=public --schema=drizzle --file=/backup/$name"
  } finally { $env:LOCALPOS_BACKUP_DATABASE_URL = $previous }
} else { throw 'Instala PostgreSQL client tools o Docker para generar el respaldo.' }
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $path) -or (Get-Item $path).Length -eq 0) { throw 'El respaldo no se generó correctamente.' }
$hash = (Get-FileHash -Algorithm SHA256 -Path $path).Hash
Set-Content -Encoding ascii -Path "$path.sha256" -Value "$hash  $name"
Write-Host "Respaldo verificado: $path"
Write-Host "SHA256: $hash"
