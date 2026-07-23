<#
  Povoli MIA port 3000 pro LAN + Tailscale (kamion).
  Spusti: npm run remote:firewall
  (vyzaduje potvrzeni UAC — Ano)
#>
$ErrorActionPreference = "Stop"

function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
  Write-Host "Potrebuji opravneni administratora (UAC)..." -ForegroundColor Yellow
  $self = $MyInvocation.MyCommand.Path
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$self`""
  exit 0
}

Write-Host "`n=== MIA firewall (port 3000) ===`n" -ForegroundColor Cyan

$rules = @(
  @{ Name = "MIA Remote 3000 All"; Remote = "Any"; Profile = "any" },
  @{ Name = "MIA Remote 3000 LAN"; Remote = "localsubnet"; Profile = "private,domain" },
  @{ Name = "MIA Remote 3000 Tailscale"; Remote = "100.64.0.0/10"; Profile = "any" },
  @{ Name = "MIA Remote 3000 WiFi"; Remote = "192.168.0.0/16"; Profile = "private,domain" }
)

foreach ($r in $rules) {
  netsh advfirewall firewall delete rule name="$($r.Name)" 2>$null | Out-Null
  netsh advfirewall firewall add rule `
    name="$($r.Name)" `
    dir=in action=allow protocol=TCP localport=3000 `
    remoteip="$($r.Remote)" profile="$($r.Profile)" | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "OK  $($r.Name)" -ForegroundColor Green
  } else {
    Write-Host "FAIL $($r.Name)" -ForegroundColor Red
  }
}

Write-Host "`nHotovo. Z Foldu zkus: http://100.x.y.z:3000/mia-fold`n" -ForegroundColor Yellow
Write-Host "Tailscale IP: " -NoNewline
& "C:\Program Files\Tailscale\tailscale.exe" ip -4 2>$null
Write-Host ""
