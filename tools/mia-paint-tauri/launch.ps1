# MIA Paint Tauri launcher — Phase 10
$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Port = if ($env:PORT) { $env:PORT } else { "3000" }
$Base = "http://127.0.0.1:$Port"
$TauriDir = $PSScriptRoot
$Fallback = Join-Path $Root "tools\mia-paint-shell\launch.ps1"

function Test-MiaServer {
  try {
    $r = Invoke-WebRequest -Uri "$Base/mia/paint/status" -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Test-Rust {
  try {
    $null = Get-Command cargo -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-MiaServer)) {
  Write-Host "MIA server nebezi na $Base — spust: npm start"
  exit 1
}

if (-not (Test-Rust)) {
  Write-Host "Rust/Cargo neni nainstalovan — fallback na Edge/Chrome shell (npm run paint:shell)"
  Write-Host "Instalace: https://rustup.rs/"
  & $Fallback
  exit $LASTEXITCODE
}

Push-Location $TauriDir
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "Instaluji @tauri-apps/cli..."
    npm install --no-fund --no-audit
  }
  Write-Host "MIA Paint Tauri dev (MIA: $Base)"
  npm run dev
} finally {
  Pop-Location
}
