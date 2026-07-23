param([Parameter(Mandatory = $true)][string]$BackupPath)
$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path $BackupPath).Path
if ((Get-Item $resolved).Length -eq 0) { throw 'El respaldo está vacío.' }
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if ($pgRestore) { & $pgRestore.Source --list $resolved | Out-Null }
elseif (Get-Command docker -ErrorAction SilentlyContinue) {
  $directory = Split-Path $resolved
  $name = Split-Path $resolved -Leaf
  & docker run --rm --volume "${directory}:/backup:ro" postgres:17-alpine pg_restore --list "/backup/$name" | Out-Null
} else { throw 'Instala PostgreSQL client tools o Docker para verificar el respaldo.' }
if ($LASTEXITCODE -ne 0) { throw 'pg_restore no pudo leer el catálogo del respaldo.' }
Write-Host "Respaldo legible. SHA256: $((Get-FileHash -Algorithm SHA256 -Path $resolved).Hash)"
