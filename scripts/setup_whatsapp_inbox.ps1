# WhatsApp Desktop -> MIA incoming-images
# Spustit: powershell -ExecutionPolicy Bypass -File scripts\setup_whatsapp_inbox.ps1

$ErrorActionPreference = "Stop"

$inbox = "C:\MIA\incoming-images"
$photos = Join-Path $inbox "photos"
$videos = Join-Path $inbox "videos"
$other = Join-Path $inbox "other"
$sortScript = "C:\MIA\scripts\fold_inbox_sort.ps1"
$taskName = "MIA-GalaxyFoldInboxSort"
$waPrefs = Join-Path $env:LOCALAPPDATA "Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalCache\EBWebView\Default\Preferences"

foreach ($dir in @($inbox, $photos, $videos, $other)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# JPEG/PNG ulozene omylem ve videos/
$photoExt = @(".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp")
Get-ChildItem -LiteralPath $videos -File -ErrorAction SilentlyContinue | ForEach-Object {
  if ($photoExt -contains $_.Extension.ToLowerInvariant()) {
    $dest = Join-Path $photos $_.Name
    if (Test-Path -LiteralPath $dest) {
      $base = [IO.Path]::GetFileNameWithoutExtension($_.Name)
      $dest = Join-Path $photos ("{0}_{1}{2}" -f $base, (Get-Date -Format "HHmmss"), $_.Extension)
    }
    Move-Item -LiteralPath $_.FullName -Destination $dest -Force
    Write-Host "Opraveno: $($_.Name) -> photos\"
  }
}

# WhatsApp default download folder (WebView2 savefile)
$waProc = Get-Process -Name "WhatsApp" -ErrorAction SilentlyContinue
if ($waProc) {
  Write-Host "POZOR: WhatsApp bezi (PID $($waProc.Id)). Zavri WhatsApp a spust tento skript znovu pro zmenu slozky stahovani."
} elseif (Test-Path -LiteralPath $waPrefs) {
  $raw = Get-Content -LiteralPath $waPrefs -Raw -Encoding UTF8
  if ($raw -match '"savefile"\s*:\s*\{') {
    if ($raw -match '"default_directory"\s*:\s*"[^"]*"') {
      $raw = [regex]::Replace($raw, '"default_directory"\s*:\s*"[^"]*"', "`"default_directory`":`"$($inbox -replace '\\','\\')`"")
    } else {
      $raw = [regex]::Replace($raw, '"savefile"\s*:\s*\{', "`"savefile`":{`"default_directory`":`"$($inbox -replace '\\','\\')`",")
    }
    Set-Content -LiteralPath $waPrefs -Value $raw -Encoding UTF8 -NoNewline
    Write-Host "WhatsApp stahovani -> $inbox"
  } else {
    Write-Host "WhatsApp Preferences: savefile sekce nenalezena."
  }
} else {
  Write-Host "WhatsApp Preferences nenalezeny (app jeste nebyla spustena?)."
}

# Sorter pri prihlaseni + hned ted
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$sortScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Write-Host "Sorter: $taskName (spusten)"

Write-Host ""
Write-Host "=== WhatsApp -> MIA ==="
Write-Host "Stahovani: $inbox (sorter -> photos/ nebo videos/)"
Write-Host "Log: C:\MIA\logs\fold-inbox.log"
Write-Host "V aplikaci: chat -> foto/video -> Stahnout"
