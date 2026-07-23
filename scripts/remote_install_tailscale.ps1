<#
  Instalace Tailscale pro vzdálený přístup k MIA z kamionu.
  Pro firewall pravidlo spusť PowerShell jako admin, jinak stačí běžný uživatel.
    npm run remote:install-tailscale
#>
$ErrorActionPreference = "Stop"
$tsExe = "C:\Program Files\Tailscale\tailscale.exe"
Write-Host "`n=== Tailscale instalace (VPN domů) ===`n" -ForegroundColor Cyan

$ts = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $ts -and -not (Test-Path $tsExe)) {
  Write-Host "Instaluji pres winget..."
  winget install --id Tailscale.Tailscale -e --accept-source-agreements --accept-package-agreements
}

Write-Host "`nSpoustim Tailscale..."
if (Test-Path $tsExe) {
  Start-Process $tsExe -ErrorAction SilentlyContinue
} elseif ($ts) {
  Start-Process "tailscale" -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

try {
  $ip = $null
  if (Test-Path $tsExe) { $ip = & $tsExe ip -4 2>$null }
  elseif ($ts) { $ip = tailscale ip -4 2>$null }
  if ($ip) {
    Write-Host "`nTailscale IP: $ip" -ForegroundColor Green
    Write-Host "MIA z kamionu: http://${ip}:3000/mia-fold" -ForegroundColor Yellow
  } else {
    Write-Host "`nPrihlas se v Tailscale (ikona u hodin) - stejny ucet jako na Foldu." -ForegroundColor Yellow
  }
} catch {
  Write-Host "Po instalaci otevri Tailscale a prihlas se." -ForegroundColor Yellow
}

# Firewall (volitelne, potrebuje admin)
$ruleName = "MIA Tailscale 3000"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if (-not $existing) {
    try {
      New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -RemoteAddress 100.64.0.0/10 -Profile Any | Out-Null
      Write-Host "Firewall: port 3000 povolen pro Tailscale." -ForegroundColor Green
    } catch {
      Write-Host "Firewall pravidlo selhalo." -ForegroundColor Yellow
    }
  }
} else {
  Write-Host "Tip: spust jako admin pro firewall pravidlo (port 3000 / Tailscale)." -ForegroundColor DarkYellow
}

Write-Host "`nDalsi krok: Tailscale na Foldu (Play Store) + Chrome Remote Desktop pro Cursor.`n"
Write-Host "Navod: docs/REMOTE_FOLD_KAMION.md`n"
