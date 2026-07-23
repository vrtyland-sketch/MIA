# MIA Paint Shell launcher — Windows app-mode window
$ErrorActionPreference = "Stop"
$Port = if ($env:PORT) { $env:PORT } else { "3000" }
$Base = "http://127.0.0.1:$Port"
$ShellUrl = "$Base/mia-paint/shell.html"

function Test-MiaServer {
  try {
    $r = Invoke-WebRequest -Uri "$Base/mia/paint/status" -UseBasicParsing -TimeoutSec 2
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-MiaServer)) {
  Write-Host "MIA server nebezi na $Base — spust: npm start"
  exit 1
}

$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
$appArgs = @("--app=$ShellUrl", "--window-size=1400,900")

if (Test-Path $edge) {
  Start-Process $edge $appArgs
} elseif (Test-Path $chrome) {
  Start-Process $chrome $appArgs
} else {
  Start-Process $ShellUrl
}

Write-Host "MIA Paint Shell: $ShellUrl"
