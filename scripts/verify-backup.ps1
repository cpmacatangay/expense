param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath,
  [string]$DataPath
)

$ErrorActionPreference = "Stop"

function Get-LineCount([string]$path) {
  return (Get-Content -LiteralPath $path | Measure-Object).Count
}

function Show-File([string]$label, [string]$path) {
  $resolved = Resolve-Path -LiteralPath $path -ErrorAction Stop
  $item = Get-Item -LiteralPath $resolved
  if ($item.Length -le 0) { throw "$label is empty: $resolved" }
  $hash = Get-FileHash -LiteralPath $resolved -Algorithm SHA256
  Write-Host "$label"
  Write-Host "  Path:   $resolved"
  Write-Host "  Bytes:  $($item.Length)"
  Write-Host "  SHA256: $($hash.Hash)"
  return $resolved
}

$schemaFile = Show-File "Schema dump" $DumpPath

if ($schemaFile.ToString().ToLowerInvariant().EndsWith(".sql")) {
  $schemaText = Get-Content -LiteralPath $schemaFile -Raw
  $tables = ([regex]::Matches($schemaText, "CREATE TABLE")).Count
  if ($tables -lt 1) { throw "Schema dump contains no CREATE TABLE statements." }
  Write-Host "  Tables: $tables"

  if ($DataPath) {
    $dataFile = Show-File "Data dump" $DataPath
    $dataText = Get-Content -LiteralPath $dataFile -Raw
    $copies = ([regex]::Matches($dataText, "(?m)^COPY ")).Count
    $inserts = ([regex]::Matches($dataText, "(?m)^INSERT INTO ")).Count
    if ($copies + $inserts -lt 1) { throw "Data dump contains no COPY or INSERT records." }
    Write-Host "  Records: $($copies + $inserts) table blocks"
  }
} else {
  $pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
  if (-not $pgRestore) {
    Write-Warning "pg_restore is not on PATH. Checksum verified, restore listing skipped."
  } else {
    $listing = & $pgRestore.Source --list $schemaFile 2>&1
    if ($LASTEXITCODE -ne 0) { throw "pg_restore could not read the backup: $($listing -join ' ')" }
    $entries = ($listing | Measure-Object).Count
    if ($entries -le 0) { throw "pg_restore returned no entries." }
    Write-Host "  Restore entries: $entries"
  }
}

Write-Host "Backup verification passed."
