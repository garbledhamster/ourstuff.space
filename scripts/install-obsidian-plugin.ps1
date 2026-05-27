param(
  [string]$VaultPath = "",
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

$RepoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$PluginSource = Join-Path $RepoPath "obsidian-plugin"
$Belt = "C:\Codex\codex_utility_belt\utility-belt\use-utility-belt.ps1"

if (-not (Test-Path -LiteralPath $Belt -PathType Leaf)) {
  throw "Utility belt orchestrator not found: $Belt"
}

$utilityArgs = @("-PluginSource", $PluginSource)
if (-not [string]::IsNullOrWhiteSpace($VaultPath)) {
  $utilityArgs += @("-VaultPath", $VaultPath)
}
if ($WhatIf) {
  $utilityArgs += "-WhatIf"
}

& $Belt -Run "obsidian-plugin-install" -Args $utilityArgs
exit $LASTEXITCODE
