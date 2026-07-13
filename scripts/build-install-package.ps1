param(
  [string]$OutputDir = "release",
  [string]$PackageName = "Oracle",
  [string]$Version
)

$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$outputRoot = Join-Path $rootDir $OutputDir
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$versionPath = Join-Path $rootDir "VERSION"
$resolvedVersion = $Version
if ([string]::IsNullOrWhiteSpace($resolvedVersion) -and (Test-Path $versionPath)) {
  $resolvedVersion = (Get-Content -Path $versionPath -Raw).Trim()
}
if ([string]::IsNullOrWhiteSpace($resolvedVersion)) {
  $resolvedVersion = "0.1.0"
}

$safeVersion = ($resolvedVersion -replace "[^0-9A-Za-z.-]", "-")
$releaseTag = "v${safeVersion}-b$stamp"
$workDir = Join-Path $outputRoot "$PackageName-$releaseTag"
$zipPath = "$workDir.zip"

$sourceCommit = "unknown"
try {
  $candidate = (git -C $rootDir rev-parse --short HEAD 2>$null).Trim()
  if ($candidate) {
    $sourceCommit = $candidate
  }
} catch {
  $sourceCommit = "unknown"
}

function Write-Step {
  param([string]$Message)
  Write-Host "[build-package] $Message" -ForegroundColor Cyan
}

function New-TextFile {
  param(
    [string]$Path,
    [string]$Content
  )

  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  Set-Content -Path $Path -Value $Content -Encoding utf8
}

Write-Step "Building server and agent..."
Push-Location (Join-Path $rootDir "server")
try {
  npm run build | Out-Host
} finally {
  Pop-Location
}

Push-Location (Join-Path $rootDir "agent")
try {
  npm run build | Out-Host
} finally {
  Pop-Location
}

Write-Step "Preparing package directory $workDir"
if (Test-Path $workDir) {
  Remove-Item -Recurse -Force $workDir
}
New-Item -ItemType Directory -Path $workDir -Force | Out-Null

$dirsToCopy = @(
  "agent/dist",
  "server/dist",
  "config",
  "dashboard",
  "vault",
  "embeddings",
  "logs"
)

foreach ($rel in $dirsToCopy) {
  $src = Join-Path $rootDir $rel
  $dst = Join-Path $workDir $rel
  if (Test-Path $src) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
    Copy-Item -Path $src -Destination $dst -Recurse -Force
  }
}

New-Item -ItemType Directory -Path (Join-Path $workDir "scripts") -Force | Out-Null

$startServer = @'
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location (Join-Path $root "server")
try {
  node dist/index.js
} finally {
  Pop-Location
}
'@

$startAgent = @'
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location (Join-Path $root "agent")
try {
  node dist/index.js
} finally {
  Pop-Location
}
'@

$preflight = @'
$ErrorActionPreference = "Stop"

function Add-Result {
  param([string]$Name, [bool]$Ok, [string]$Details)
  $script:results += [PSCustomObject]@{ Check = $Name; Ok = $Ok; Details = $Details }
}

$results = @()
$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$configPath = Join-Path $rootDir "config\oracle.config.json"
$port = 7070
if (Test-Path $configPath) {
  try {
    $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($cfg.server -and $cfg.server.port) { $port = [int]$cfg.server.port }
  } catch {}
}

$serverBaseUrl = "http://localhost:$port"
$ollamaBaseUrl = if ($env:ORACLE_OLLAMA_BASE_URL) { $env:ORACLE_OLLAMA_BASE_URL.TrimEnd('/') } else { "http://127.0.0.1:11434" }
$memoryDir = Join-Path $rootDir "vault\chat-memory"

Write-Host "Oracle Preflight" -ForegroundColor Cyan
Write-Host "- Root: $rootDir"
Write-Host "- Server: $serverBaseUrl"
Write-Host "- Ollama: $ollamaBaseUrl"
Write-Host "- Memory dir: $memoryDir"
Write-Host ""

try {
  $health = Invoke-RestMethod -Uri "$serverBaseUrl/health" -Method Get -TimeoutSec 4
  Add-Result "Server health" ($health.ok -eq $true) ("service={0}" -f $health.service)
} catch { Add-Result "Server health" $false $_.Exception.Message }

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
} catch { Add-Result "MCP tools" $false $_.Exception.Message }

try {
  $tags = Invoke-RestMethod -Uri "$ollamaBaseUrl/api/tags" -Method Get -TimeoutSec 5
  $models = @($tags.models)
  Add-Result "Ollama" $true ("models={0}" -f $models.Count)
} catch { Add-Result "Ollama" $false $_.Exception.Message }

try {
  if (-not (Test-Path $memoryDir)) { New-Item -ItemType Directory -Path $memoryDir -Force | Out-Null }
  $probeFile = Join-Path $memoryDir (".preflight-{0}.tmp" -f ([Guid]::NewGuid().ToString("N")))
  Set-Content -Path $probeFile -Value "ok" -Encoding utf8
  Remove-Item $probeFile -Force
  Add-Result "Central memory path" $true "exists + writable"
} catch { Add-Result "Central memory path" $false $_.Exception.Message }

foreach ($r in $results) {
  if ($r.Ok) {
    Write-Host ("[PASS] {0}: {1}" -f $r.Check, $r.Details) -ForegroundColor Green
  } else {
    Write-Host ("[FAIL] {0}: {1}" -f $r.Check, $r.Details) -ForegroundColor Red
  }
}

$failed = @($results | Where-Object { -not $_.Ok })
if ($failed.Count -eq 0) {
  Write-Host "Preflight status: READY" -ForegroundColor Green
  exit 0
}

Write-Host ("Preflight status: NOT READY ({0} failed)" -f $failed.Count) -ForegroundColor Red
exit 1
'@

$launch = @'
param(
  [switch]$SkipServer,
  [switch]$SkipAgent,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$preflightScript = Join-Path $PSScriptRoot "preflight.ps1"
$startServerScript = Join-Path $PSScriptRoot "start-server.ps1"
$startAgentScript = Join-Path $PSScriptRoot "start-agent.ps1"

function Start-OracleScript {
  param([string]$Name, [string]$ScriptPath)

  if ($DryRun) {
    Write-Host "[DRYRUN] Would launch $Name using $ScriptPath" -ForegroundColor Yellow
    return
  }

  Start-Process -FilePath "powershell" -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $ScriptPath) -WorkingDirectory $rootDir.Path | Out-Null
  Write-Host "Launched $Name" -ForegroundColor Green
}

Write-Host "Oracle Launch Wrapper" -ForegroundColor Cyan
& $preflightScript
if ($LASTEXITCODE -ne 0) {
  Write-Host "Launch aborted: preflight failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

if (-not $SkipServer) {
  $serverListening = Get-NetTCPConnection -LocalPort 7070 -State Listen -ErrorAction SilentlyContinue
  if ($serverListening) {
    Write-Host "Server appears to already be running on port 7070. Skipping server start." -ForegroundColor Yellow
  } else {
    Start-OracleScript -Name "oracle-server" -ScriptPath $startServerScript
  }
}

if (-not $SkipAgent) {
  Start-OracleScript -Name "oracle-agent" -ScriptPath $startAgentScript
}

if ($DryRun) {
  Write-Host "Launch plan complete (dry run only)." -ForegroundColor Cyan
} else {
  Write-Host "Launch complete." -ForegroundColor Green
}
'@

$install = @'
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Oracle Launch.lnk"
$targetScript = Join-Path $root "scripts\launch.ps1"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is required. Install Node.js 20+ before running Oracle." -ForegroundColor Red
  exit 1
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoExit -ExecutionPolicy Bypass -File `"$targetScript`""
$shortcut.WorkingDirectory = $root.Path
$shortcut.IconLocation = "powershell.exe,0"
$shortcut.Save()

Write-Host "Oracle install complete." -ForegroundColor Green
Write-Host "Desktop shortcut created: $shortcutPath"
Write-Host "Use scripts\\launch.ps1 to start Oracle after preflight."
'@

$readme = @'
# Oracle Dell Install Package

## Requirements
- Windows 10/11 x64
- Node.js 20+ installed and on PATH
- Ollama running locally (default: http://127.0.0.1:11434)

## Install
1. Extract this package to a folder on the Dell laptop.
2. Open PowerShell in the extracted folder.
3. Run: .\scripts\install.ps1

## Launch
- Run: .\scripts\launch.ps1
- Optional dry run: .\scripts\launch.ps1 -DryRun

## Manual Starts
- Server: .\scripts\start-server.ps1
- Agent: .\scripts\start-agent.ps1

## Dashboard
- http://localhost:7070/ui
'@

$buildInfo = [PSCustomObject]@{
  packageName = $PackageName
  displayName = "Oracle"
  description = "Portable Oracle MCP server and Barbara Gordon assistant for the Dell laptop."
  version = $resolvedVersion
  build = $stamp
  releaseTag = $releaseTag
  builtAt = (Get-Date).ToString("o")
  sourceCommit = $sourceCommit
}
$buildInfoJson = $buildInfo | ConvertTo-Json -Depth 4

New-TextFile -Path (Join-Path $workDir "scripts\start-server.ps1") -Content $startServer
New-TextFile -Path (Join-Path $workDir "scripts\start-agent.ps1") -Content $startAgent
New-TextFile -Path (Join-Path $workDir "scripts\preflight.ps1") -Content $preflight
New-TextFile -Path (Join-Path $workDir "scripts\launch.ps1") -Content $launch
New-TextFile -Path (Join-Path $workDir "scripts\install.ps1") -Content $install
New-TextFile -Path (Join-Path $workDir "README-INSTALL.md") -Content $readme
New-TextFile -Path (Join-Path $workDir "BUILD-INFO.json") -Content $buildInfoJson
New-TextFile -Path (Join-Path $workDir "VERSION") -Content $resolvedVersion

Copy-Item -Path (Join-Path $rootDir "Oracle.md") -Destination (Join-Path $workDir "Oracle.md") -Force

Write-Step "Creating zip package $zipPath"
if (-not (Test-Path $outputRoot)) {
  New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
}
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
Compress-Archive -Path $workDir -DestinationPath $zipPath -Force

Write-Step "Package build complete"
Write-Host "Version: $resolvedVersion"
Write-Host "Build:   $stamp"
Write-Host "Commit:  $sourceCommit"
Write-Host "Folder: $workDir"
Write-Host "Zip:    $zipPath" -ForegroundColor Green
