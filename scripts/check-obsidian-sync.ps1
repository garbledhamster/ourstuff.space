param(
  [string]$RepoPath = "",
  [string]$WorkerRepo = "C:\Codex\stripe-worker-api",
  [switch]$SkipWorker
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
  $RepoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
} else {
  $RepoPath = [System.IO.Path]::GetFullPath($RepoPath)
}

function Invoke-Check {
  param(
    [string]$Name,
    [scriptblock]$Script
  )

  Write-Host "== $Name" -ForegroundColor Cyan
  & $Script
}

Invoke-Check -Name "Frontend syntax" -Script {
  Push-Location $RepoPath
  try {
    node --check "assets\js\cloud.js"
    node --check "assets\js\app.js"
  } finally {
    Pop-Location
  }
}

Invoke-Check -Name "Obsidian plugin tests" -Script {
  Push-Location (Join-Path $RepoPath "obsidian-plugin")
  try {
    npm test
    npm run check
  } finally {
    Pop-Location
  }
}

if (-not $SkipWorker) {
  $WorkerRepo = [System.IO.Path]::GetFullPath($WorkerRepo)
  if (Test-Path -LiteralPath (Join-Path $WorkerRepo "package.json") -PathType Leaf) {
    Invoke-Check -Name "Worker typecheck" -Script {
      Push-Location $WorkerRepo
      try {
        npm run typecheck
      } finally {
        Pop-Location
      }
    }
  } else {
    Write-Host "Worker repo not found: $WorkerRepo" -ForegroundColor Yellow
  }
}

Write-Host "Obsidian sync checks passed." -ForegroundColor Green
