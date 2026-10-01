# Run on PC2 (192.168.137.20) as Administrator — allow inbound ping from MIA LAN
$ErrorActionPreference = "Stop"
$ruleName = "MIA LAN Ping"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Enable-NetFirewallRule -DisplayName $ruleName
  Write-Host "OK: rule exists, enabled"
} else {
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol ICMPv4 `
    -IcmpType 8 `
    -Action Allow `
    -Profile Private `
    -RemoteAddress 192.168.137.0/24 | Out-Null
  Write-Host "OK: rule created"
}
Get-NetFirewallRule -DisplayName $ruleName | Select-Object DisplayName, Enabled, Direction, Action
