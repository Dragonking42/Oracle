param(
  [switch]$NoAutoUpdate,
  [int]$CheckIntervalSeconds = 60
)

$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverDir = Join-Path $rootDir.Path "server"
$logDir = Join-Path $rootDir.Path "logs"
$stdoutLog = Join-Path $logDir "oracle-server.stdout.log"
$stderrLog = Join-Path $logDir "oracle-server.stderr.log"

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-OracleStatus {
  param(
    [string]$Message,
    [ConsoleColor]$Color = [ConsoleColor]::Cyan
  )

  Write-Host $Message -ForegroundColor $Color
}

function Start-OracleServerProcess {
  Push-Location $serverDir
  try {
    if (-not (Test-Path "node_modules")) {
      Write-OracleStatus "Installing server dependencies..." Yellow
      npm install
    }

    $process = Start-Process \
      -FilePath "npm" \
      -ArgumentList @("run", "dev") \
      -WorkingDirectory $serverDir \
      -PassThru \
      -RedirectStandardOutput $stdoutLog \
      -RedirectStandardError $stderrLog

    Write-OracleStatus ("Server process started (pid={0})." -f $process.Id) Green
    return $process
  } finally {
    Pop-Location
  }
}

function Stop-OracleServerProcess {
  param([System.Diagnostics.Process]$Process)

  if (-not $Process) {
    return
  }

  try {
    if (-not $Process.HasExited) {
      Write-OracleStatus ("Stopping server process tree (pid={0})..." -f $Process.Id) Yellow
      & taskkill /PID $Process.Id /T /F | Out-Null
    }
  } catch {
    Write-OracleStatus ("Failed to stop server process tree: {0}" -f $_.Exception.Message) Red
  }
}

function Get-OracleUpstreamState {
  Push-Location $rootDir.Path
  try {
    if (-not (Test-Path ".git")) {
      return $null
    }

    $upstream = (& git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null).Trim()
    if (-not $upstream) {
      return $null
    }

    & git fetch --all --prune | Out-Null

    $localHead = (& git rev-parse HEAD).Trim()
    $remoteHead = (& git rev-parse $upstream).Trim()

    return [PSCustomObject]@{
      Upstream = $upstream
      LocalHead = $localHead
      RemoteHead = $remoteHead
      NeedsUpdate = ($localHead -ne $remoteHead)
    }
  } finally {
    Pop-Location
  }
}

function Update-OracleRepo {
  param([string]$PreviousHead)

  Push-Location $rootDir.Path
  try {
    Write-OracleStatus "Pulling updates from upstream..." Cyan
    & git pull --ff-only

    $changedFiles = @()
    if ($PreviousHead) {
      $changedFiles = @(& git diff --name-only "$PreviousHead..HEAD")
    }

    $needsInstall = $changedFiles | Where-Object { $_ -match '(^|/)(package(-lock)?\.json)$' }
    if ($needsInstall) {
      Write-OracleStatus "Dependency files changed; refreshing server install..." Yellow
      Push-Location $serverDir
      try {
        npm install
      } finally {
        Pop-Location
      }
    }

    return $true
  } catch {
    Write-OracleStatus ("Update failed: {0}" -f $_.Exception.Message) Red
    return $false
  } finally {
    Pop-Location
  }
}

Write-OracleStatus "Oracle Server Watchdog" Cyan
Write-OracleStatus ("- Root: {0}" -f $rootDir.Path)
Write-OracleStatus ("- Auto update: {0}" -f (-not $NoAutoUpdate))
Write-OracleStatus ("- Check interval: {0}s" -f $CheckIntervalSeconds)
Write-OracleStatus ""

$serverProcess = Start-OracleServerProcess

if ($NoAutoUpdate) {
  Wait-Process -Id $serverProcess.Id
  exit $LASTEXITCODE
}

try {
  while ($true) {
    Start-Sleep -Seconds $CheckIntervalSeconds

    if ($serverProcess.HasExited) {
      Write-OracleStatus "Server exited unexpectedly; restarting..." Yellow
      $serverProcess = Start-OracleServerProcess
      continue
    }

    $upstreamState = Get-OracleUpstreamState
    if (-not $upstreamState) {
      continue
    }

    if ($upstreamState.NeedsUpdate) {
      Stop-OracleServerProcess -Process $serverProcess

      if (Update-OracleRepo -PreviousHead $upstreamState.LocalHead) {
        Write-OracleStatus "Updates applied; restarting server..." Green
      } else {
        Write-OracleStatus "Restarting server with existing code after update failure..." Yellow
      }

      $serverProcess = Start-OracleServerProcess
    }
  }
} finally {
  Stop-OracleServerProcess -Process $serverProcess
}
