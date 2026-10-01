<#
  REMOTE DEV GATE — Fáze B setup (spustit LOKÁLNĚ na PC1 STREAM nebo PC2 MIA jako Administrator).

  Příklad:
    powershell -ExecutionPolicy Bypass -File C:\MIA\scripts\home_remote_dev_gate_setup.ps1 -Role Stream
    powershell -ExecutionPolicy Bypass -File C:\MIA\scripts\home_remote_dev_gate_setup.ps1 -Role Mia

  Co udělá: Tailscale (pokud chybí), OpenSSH Server, firewall SSH + (u Mia) MIA port 3000 pro Tailscale/LAN.
  RustDesk: winget instalace (volitelně potvrzení v GUI).

  Po běhu: přihlas Tailscale (stejný účet jako PC3), zapiš `tailscale ip -4` do REMOTE DEV GATE tabulky.
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Stream", "Mia")]
  [string]$Role
)

$ErrorActionPreference = "Stop"

function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
  Write-Host "Spust znovu jako Administrator (UAC)." -ForegroundColor Red
  exit 1
}

$label = if ($Role -eq "Stream") { "PC1 STREAM" } else { "PC2 MIA" }
Write-Host "`n=== REMOTE DEV GATE — $label ===`n" -ForegroundColor Cyan

# --- Tailscale ---
$tsExe = "C:\Program Files\Tailscale\tailscale.exe"
if (-not (Test-Path $tsExe) -and -not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
  Write-Host "Instaluji Tailscale (winget)..."
  winget install --id Tailscale.Tailscale -e --accept-source-agreements --accept-package-agreements
}
if (Test-Path $tsExe) {
  Start-Process $tsExe -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  $tsIp = & $tsExe ip -4 2>$null
  if ($tsIp) {
    Write-Host "Tailscale IP: $tsIp" -ForegroundColor Green
  } else {
    Write-Host "Tailscale: prihlas se (ikona u hodin) — stejny ucet jako PC3 notebook." -ForegroundColor Yellow
  }
} else {
  Write-Host "Tailscale: dokonc instalaci rucne z https://tailscale.com/download" -ForegroundColor Yellow
}

# --- OpenSSH Server ---
$sshCap = Get-WindowsCapability -Online | Where-Object Name -like "OpenSSH.Server*"
if ($sshCap.State -ne "Installed") {
  Write-Host "Instaluji OpenSSH Server..."
  Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
}
Set-Service sshd -StartupType Automatic
Start-Service sshd
Get-NetFirewallRule -Name *OpenSSH-Server* -ErrorAction SilentlyContinue | Set-NetFirewallRule -Enabled True

foreach ($r in @(
  @{ Name = "MIA SSH Tailscale"; Remote = "100.64.0.0/10" },
  @{ Name = "MIA SSH MIA LAN"; Remote = "192.168.137.0/24" }
)) {
  $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  if ($existing) { Remove-NetFirewallRule -DisplayName $r.Name }
  New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Protocol TCP -LocalPort 22 `
    -RemoteAddress $r.Remote -Action Allow -Profile Any | Out-Null
  Write-Host "Firewall OK: $($r.Name)" -ForegroundColor Green
}

# --- PC2 MIA: port 3000 pro Tailscale + LAN ---
if ($Role -eq "Mia") {
  $fwScript = Join-Path $PSScriptRoot "remote_setup_firewall.ps1"
  if (Test-Path $fwScript) {
    & $fwScript
  } else {
    New-NetFirewallRule -DisplayName "MIA Tailscale 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 `
      -RemoteAddress 100.64.0.0/10 -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "MIA LAN 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 `
      -RemoteAddress 192.168.137.0/24 -Action Allow -Profile Private -ErrorAction SilentlyContinue | Out-Null
    Write-Host "Firewall OK: MIA port 3000 (Tailscale + LAN)" -ForegroundColor Green
  }
}

# --- RustDesk (GUI — OBS/TikFinity; RDP na Home casto nejde) ---
$rd = Get-Command rustdesk -ErrorAction SilentlyContinue
if (-not $rd) {
  Write-Host "Instaluji RustDesk (winget) — pro OBS/TikFinity GUI z PC3..."
  winget install --id RustDesk.RustDesk -e --accept-source-agreements --accept-package-agreements 2>$null
}
Write-Host "RustDesk: spust aplikaci, nastav permanent password / ID (zapis do baseline)." -ForegroundColor Yellow

Write-Host "`n--- Hotovo na $label ---" -ForegroundColor Cyan
Write-Host "Hostname: $env:COMPUTERNAME"
if (Test-Path $tsExe) { Write-Host "Tailscale:  $(& $tsExe ip -4 2>$null)" }
Write-Host "SSH test z PC3:  ssh $env:USERNAME@<tailscale-ip>`n"
