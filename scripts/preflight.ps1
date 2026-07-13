$ErrorActionPreference = "Stop"

function Add-Result {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Details
  )

  $script:results += [PSCustomObject]@{
    Check = $Name
    Ok = $Ok
    Details = $Details
  }
}

function Resolve-ServerPort {
  param([string]$RootDir)

  if ($env:ORACLE_SERVER_PORT) {
    $parsed = 0
    if ([int]::TryParse($env:ORACLE_SERVER_PORT, [ref]$parsed)) {
      return $parsed
    }
  }

  $configPath = Join-Path $RootDir "config\oracle.config.json"
  if (Test-Path $configPath) {
    try {
      $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
      if ($cfg.server -and $cfg.server.port) {
        return [int]$cfg.server.port
      }
    } catch {
      # Fall back to default.
    }
  }

  return 7070
}

$results = @()
$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$port = Resolve-ServerPort -RootDir $rootDir
$serverBaseUrl = "http://localhost:$port"
$ollamaBaseUrl = if ($env:ORACLE_OLLAMA_BASE_URL) { $env:ORACLE_OLLAMA_BASE_URL.TrimEnd('/') } else { "http://127.0.0.1:11434" }
$memoryDir = Join-Path $rootDir "vault\chat-memory"

Write-Host "Oracle Preflight" -ForegroundColor Cyan
Write-Host "- Root: $rootDir"
Write-Host "- Server: $serverBaseUrl"
Write-Host "- Ollama: $ollamaBaseUrl"
Write-Host "- Memory dir: $memoryDir"
Write-Host ""

# 1) Server health
try {
  $health = Invoke-RestMethod -Uri "$serverBaseUrl/health" -Method Get -TimeoutSec 4
  $ok = ($health.ok -eq $true)
  Add-Result "Server health" $ok ("service={0}" -f $health.service)
} catch {
  Add-Result "Server health" $false $_.Exception.Message
}

# 2) MCP tools
try {
  $toolsResp = Invoke-RestMethod -Uri "$serverBaseUrl/mcp/tools" -Method Get -TimeoutSec 6
  $tools = @($toolsResp.tools)
  $required = @("recall", "save", "review")
  $missing = @($required | Where-Object { $_ -notin $tools })

  if ($tools.Count -eq 0) {
    Add-Result "MCP tools" $false "No tools returned"
  } elseif ($missing.Count -gt 0) {
    Add-Result "MCP tools" $false ("Missing: {0}" -f ($missing -join ", "))
  } else {
    Add-Result "MCP tools" $true ("count={0}" -f $tools.Count)
  }
} catch {
  Add-Result "MCP tools" $false $_.Exception.Message
}

# 3) Ollama reachability
try {
  $tags = Invoke-RestMethod -Uri "$ollamaBaseUrl/api/tags" -Method Get -TimeoutSec 5
  $models = @($tags.models)
  Add-Result "Ollama" $true ("models={0}" -f $models.Count)
} catch {
  Add-Result "Ollama" $false $_.Exception.Message
}

# 4) Central memory path + write test
try {
  if (-not (Test-Path $memoryDir)) {
    New-Item -ItemType Directory -Path $memoryDir -Force | Out-Null
  }

  $probeFile = Join-Path $memoryDir (".preflight-{0}.tmp" -f ([Guid]::NewGuid().ToString("N")))
  Set-Content -Path $probeFile -Value "ok" -Encoding utf8
  Remove-Item $probeFile -Force
  Add-Result "Central memory path" $true "exists + writable"
} catch {
  Add-Result "Central memory path" $false $_.Exception.Message
}

Write-Host "Checks:" -ForegroundColor Cyan
foreach ($r in $results) {
  if ($r.Ok) {
    Write-Host ("[PASS] {0}: {1}" -f $r.Check, $r.Details) -ForegroundColor Green
  } else {
    Write-Host ("[FAIL] {0}: {1}" -f $r.Check, $r.Details) -ForegroundColor Red
  }
}

$failed = @($results | Where-Object { -not $_.Ok })
Write-Host ""
if ($failed.Count -eq 0) {
  Write-Host "Preflight status: READY" -ForegroundColor Green
  exit 0
}

Write-Host ("Preflight status: NOT READY ({0} failed)" -f $failed.Count) -ForegroundColor Red
exit 1
