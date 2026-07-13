$ErrorActionPreference = "Stop"

$agentDir = Join-Path $PSScriptRoot "..\agent"
Push-Location $agentDir

try {
	if (-not (Test-Path "node_modules")) {
		npm install
	}

	npm run dev
} finally {
	Pop-Location
}
