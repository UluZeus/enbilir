[CmdletBinding()]
param(
  [string]$DestinationRoot = (Join-Path $HOME "Documents\Enbilir-Backups"),
  [string]$Server = "root@64.225.98.60"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-VerifiedBackupManifest {
  param([Parameter(Mandatory)][string]$BackupPath)

  $manifestPath = Join-Path $BackupPath "manifest.json"
  $databasePath = Join-Path $BackupPath "database.sql"
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or -not (Test-Path -LiteralPath $databasePath -PathType Leaf)) {
    throw "Backup set is incomplete."
  }

  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $database = $manifest.files | Where-Object { $_.path -eq "database.sql" } | Select-Object -First 1
  if ($null -eq $database -or -not $database.sha256 -or -not $database.sizeBytes) {
    throw "Backup manifest does not contain database.sql integrity metadata."
  }
  if ((Get-Item -LiteralPath $databasePath).Length -ne [int64]$database.sizeBytes) {
    throw "Backup database size does not match the manifest."
  }
  $actualHash = (Get-FileHash -LiteralPath $databasePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne [string]$database.sha256) {
    throw "Backup database SHA-256 does not match the manifest."
  }
  return $manifest
}

$resolvedRoot = [IO.Path]::GetFullPath($DestinationRoot)
if ($resolvedRoot -eq [IO.Path]::GetPathRoot($resolvedRoot)) {
  throw "DestinationRoot cannot be a filesystem root."
}
New-Item -ItemType Directory -Force -Path $resolvedRoot | Out-Null

$remoteSet = (& ssh $Server "find /srv/enbilir/backups -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | grep -E '^enbilir-[0-9]{8}T[0-9]{6}Z$' | sort | tail -n 1").Trim()
if ($LASTEXITCODE -ne 0 -or $remoteSet -notmatch '^enbilir-\d{8}T\d{6}Z$') {
  throw "Unable to resolve a completed remote Enbilir backup set."
}

$finalPath = Join-Path $resolvedRoot $remoteSet
if (Test-Path -LiteralPath $finalPath -PathType Container) {
  $manifest = Get-VerifiedBackupManifest -BackupPath $finalPath
  Write-Output "[offsite-backup] Existing verified copy retained: $($manifest.setName)"
  exit 0
}

$partialPath = Join-Path $resolvedRoot ".partial-$remoteSet-$PID"
New-Item -ItemType Directory -Path $partialPath -ErrorAction Stop | Out-Null
try {
  & scp "${Server}:/srv/enbilir/backups/$remoteSet/manifest.json" (Join-Path $partialPath "manifest.json")
  if ($LASTEXITCODE -ne 0) { throw "Remote backup manifest transfer failed." }
  & scp "${Server}:/srv/enbilir/backups/$remoteSet/database.sql" (Join-Path $partialPath "database.sql")
  if ($LASTEXITCODE -ne 0) { throw "Remote backup database transfer failed." }

  $manifest = Get-VerifiedBackupManifest -BackupPath $partialPath
  Move-Item -LiteralPath $partialPath -Destination $finalPath -ErrorAction Stop
  Write-Output "[offsite-backup] Copied and verified: $($manifest.setName)"
} catch {
  Write-Error "[offsite-backup] Partial copy retained for inspection: $partialPath"
  throw
}
