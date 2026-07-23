<#
  MIA pres mobilni data - Tailscale Serve (HTTPS pres VPN, bez Windows firewall na port 3000).
  npm run remote:serve

  Jednorazove: povol Serve na tailnetu (odkaz se otevre v prohlizeci).
#>
$ErrorActionPreference = "Continue"
$ts = "C:\Program Files\Tailscale\tailscale.exe"

if (-not (Test-Path $ts)) {
  Write-Host "Tailscale neni nainstalovan. npm run remote:install-tailscale" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== MIA Tailscale Serve (mobilni data) ===`n" -ForegroundColor Cyan

$serveTry = & $ts serve --bg http://127.0.0.1:3000 2>&1 | Out-String
Write-Host $serveTry
if ($serveTry -match "login\.tailscale\.com/f/serve") {
  if ($serveTry -match "https://login\.tailscale\.com/f/serve[^\s]+") {
    $enableUrl = $Matches[0]
    Write-Host "Serve neni povoleny na tailnetu." -ForegroundColor Yellow
    Write-Host "1. Otevri tento odkaz a potvrd Enable:" -ForegroundColor Yellow
    Write-Host "   $enableUrl" -ForegroundColor White
    Write-Host ""
    Start-Process $enableUrl
    Write-Host "2. Po povoleni spust znovu: npm run remote:serve" -ForegroundColor Yellow
    Write-Host ""
    exit 2
  }
}

Start-Sleep -Seconds 1
$status = & $ts serve status 2>&1 | Out-String
Write-Host $status

$dns = ""
try {
  $json = & $ts status --json 2>&1 | ConvertFrom-Json
  $dns = $json.Self.DNSName.TrimEnd(".")
} catch { }

if ($dns) {
  $url = "https://$dns/mia-fold"
  Write-Host ""
  Write-Host ">>> Odkaz pro Fold (mobilni data) <<<" -ForegroundColor Green
  Write-Host $url -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Tailscale na Foldu musi byt zapnuty."
  Write-Host ""
  Write-Host "Alternativa (potrebuje UAC): npm run remote:firewall"
  Write-Host ""
} else {
  Write-Host "Serve mozna bezi - over: tailscale serve status" -ForegroundColor Yellow
}
