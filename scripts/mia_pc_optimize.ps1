# MIA stream PC optimizer — uvolni RAM/disk, NESAHA na obs64/node/Cursor
param(
    [switch]$CloseEdge,
    [switch]$CloseChatGPT = $true,
    [switch]$CleanTemp,
    [switch]$WhatIf
)

function Get-FreeRamGb {
    $os = Get-CimInstance Win32_OperatingSystem
    [math]::Round($os.FreePhysicalMemory / 1MB, 2)
}

function Stop-SafeProcess {
    param([string]$Name)
    $procs = Get-Process -Name $Name -ErrorAction SilentlyContinue
    if (-not $procs) { Write-Host "  $Name : not running"; return 0 }
    $mb = [math]::Round(($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 0)
    if ($WhatIf) {
        Write-Host "  [WhatIf] would stop $Name (~${mb} MB, $($procs.Count) proc)"
        return $mb
    }
    $procs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  $Name : stopped (~${mb} MB)"
    return $mb
}

Write-Host "=== MIA PC OPTIMIZE ==="
$before = Get-FreeRamGb
Write-Host "RAM before: ${before} GB free"
Write-Host "Disk C free: $([math]::Round((Get-PSDrive C).Free / 1GB, 2)) GB"
Write-Host ""

Write-Host "Protected (never touched): obs64, node, Cursor"
Write-Host ""

$freed = 0
if ($CloseChatGPT) { $freed += Stop-SafeProcess "ChatGPT" }
if ($CloseEdge) {
    Write-Host "  Edge: closing — reopen TikTok LIVE + TikFinity after optimize"
    $freed += Stop-SafeProcess "msedge"
}
$freed += Stop-SafeProcess "WidgetService"
$freed += Stop-SafeProcess "SearchHost"

if ($CleanTemp) {
    $temp = $env:TEMP
    $cutoff = (Get-Date).AddDays(-7)
    $bytes = 0
    $n = 0
    Get-ChildItem $temp -Force -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.LastWriteTime -lt $cutoff) {
            try {
                $sz = if ($_.PSIsContainer) {
                    (Get-ChildItem $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
                } else { $_.Length }
                if (-not $WhatIf) { Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop }
                $bytes += $sz
                $n++
            } catch {}
        }
    }
    $tempAction = if ($WhatIf) { '[WhatIf] would remove' } else { 'removed' }
    Write-Host "  TEMP (>7d): $tempAction $n items (~$([math]::Round($bytes / 1MB, 0)) MB)"
}

Start-Sleep -Seconds 2
$after = Get-FreeRamGb
Write-Host ""
Write-Host "RAM after:  ${after} GB free (gain ~$([math]::Round($after - $before, 2)) GB)"
Write-Host ""
Write-Host "=== STREAM CHECKLIST ==="
Write-Host "1. Spust TikTok LIVE Studio (Virtual Camera z OBS)"
Write-Host "2. V prohlizeci otevri TikTok LIVE + TikFinity (test gift/comment)"
Write-Host "3. Over: http://127.0.0.1:3000/health -> lastIngest musi byt cerstvy"
Write-Host "4. Scene pro live reakce: SPINAK_HLAVNI (ne jen MIA_GENESIS)"
