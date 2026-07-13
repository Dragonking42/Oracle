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
  param(
    [string]$Name,
    [string]$ScriptPath
  )

  if (-not (Test-Path $ScriptPath)) {
    throw "Missing script for ${Name}: $ScriptPath"
  }

  if ($DryRun) {
    Write-Host "[DRYRUN] Would launch $Name using $ScriptPath" -ForegroundColor Yellow
    return
  }

  Start-Process -FilePath "powershell" -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $ScriptPath) -WorkingDirectory $rootDir.Path | Out-Null

  Write-Host "Launched $Name" -ForegroundColor Green
}

Write-Host "Oracle Launch Wrapper" -ForegroundColor Cyan
Write-Host "- Root: $rootDir"
Write-Host "- DryRun: $DryRun"
Write-Host "- SkipServer: $SkipServer"
Write-Host "- SkipAgent: $SkipAgent"
Write-Host ""

if (-not (Test-Path $preflightScript)) {
  throw "Missing preflight script: $preflightScript"
}

Write-Host "Running preflight..." -ForegroundColor Cyan
& $preflightScript
$preflightExitCode = $LASTEXITCODE

if ($preflightExitCode -ne 0) {
  Write-Host "Launch aborted: preflight failed." -ForegroundColor Red
  exit $preflightExitCode
}

if (-not $SkipServer) {
  $serverListening = Get-NetTCPConnection -LocalPort 7070 -State Listen -ErrorAction SilentlyContinue
  if ($serverListening) {
    Write-Host "Server appears to already be running on port 7070. Skipping server start." -ForegroundColor Yellow
  } else {
    Start-OracleScript -Name "oracle-server" -ScriptPath $startServerScript
  }
} else {
  Write-Host "Skipping server startup by request." -ForegroundColor Yellow
}

if (-not $SkipAgent) {
  Start-OracleScript -Name "oracle-agent" -ScriptPath $startAgentScript
} else {
  Write-Host "Skipping agent startup by request." -ForegroundColor Yellow
}

Write-Host ""
if ($DryRun) {
  Write-Host "Launch plan complete (dry run only)." -ForegroundColor Cyan
} else {
  Write-Host "Launch complete." -ForegroundColor Green
}
