param(
  [string]$ApiBase = "https://stripe-worker-api.jrice.workers.dev",
  [string]$ApiKey = $env:OURSTUFF_OBSIDIAN_API_KEY,
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
  throw "Set OURSTUFF_OBSIDIAN_API_KEY or pass -ApiKey. The key is not printed or written."
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $RepoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
  $OutputRoot = Join-Path $RepoPath "artifacts\obsidian-sync"
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$base = $ApiBase.TrimEnd("/")
$headers = @{ Authorization = "Bearer $ApiKey" }
$response = Invoke-RestMethod -Method Get -Uri "$base/api/obsidian/compendiums" -Headers $headers -TimeoutSec 30

$compendiums = @($response.compendiums)
$sectionCount = 0
foreach ($compendium in $compendiums) {
  $sectionCount += @($compendium.sections).Count
}

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  apiBase = $base
  revision = [string]$response.revision
  serverTime = [string]$response.serverTime
  compendiumCount = $compendiums.Count
  sectionCount = $sectionCount
}

$jsonPath = Join-Path $OutputRoot "obsidian-sync-smoke.json"
$summary | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

Write-Host "Obsidian sync API returned $($compendiums.Count) compendium(s) and $sectionCount section(s)." -ForegroundColor Green
Write-Host "Report: $jsonPath" -ForegroundColor Cyan
