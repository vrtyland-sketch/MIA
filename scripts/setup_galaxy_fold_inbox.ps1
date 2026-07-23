# Galaxy Fold -> notebook: Quick Share inbox pro MIA
# Spustit jednou: powershell -ExecutionPolicy Bypass -File scripts\setup_galaxy_fold_inbox.ps1

$ErrorActionPreference = "Stop"

$inbox = "C:\MIA\incoming-images"
$photos = Join-Path $inbox "photos"
$videos = Join-Path $inbox "videos"
$other = Join-Path $inbox "other"
$qsLink = Join-Path $env:USERPROFILE "Downloads\Quick Share"
$launcher = "C:\Program Files\Google\NearbyShare\nearby_share_launcher.exe"
$sortScript = "C:\MIA\scripts\fold_inbox_sort.ps1"
$taskName = "MIA-GalaxyFoldInboxSort"

foreach ($dir in @($inbox, $photos, $videos, $other)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

if (Test-Path $qsLink) {
  $item = Get-Item -LiteralPath $qsLink -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Write-Host "OK: Downloads\Quick Share uz je junction."
  } else {
    $backup = Join-Path $inbox ("_migrated_" + (Get-Date -Format "yyyyMMdd-HHmmss"))
    Move-Item -LiteralPath $qsLink -Destination $backup
    cmd /c "mklink /J `"$qsLink`" `"$inbox`""
    Write-Host "Presunuto stare soubory -> $backup, vytvoren junction."
  }
} else {
  cmd /c "mklink /J `"$qsLink`" `"$inbox`""
  Write-Host "Vytvoren junction: $qsLink -> $inbox"
}

$startupLnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\Quick Share.lnk"
if (-not (Test-Path $startupLnk)) {
  $w = New-Object -ComObject WScript.Shell
  $s = $w.CreateShortcut($startupLnk)
  $s.TargetPath = $launcher
  $s.WorkingDirectory = "C:\Program Files\Google\NearbyShare"
  $s.Description = "Google Quick Share"
  $s.Save()
  Write-Host "Pridan Quick Share do Windows Startup."
}

if (Test-Path $launcher) {
  $running = Get-Process -Name "nearby_share" -ErrorAction SilentlyContinue
  if (-not $running) {
    Start-Process $launcher
    Write-Host "Spusten Quick Share."
  } else {
    Write-Host "Quick Share uz bezi (PID $($running.Id))."
  }
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$sortScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Planovac: $taskName (trideni pri prihlaseni)."

Write-Host ""
Write-Host "=== Galaxy Fold (jednorazove na telefonu) ==="
Write-Host "1. Nastaveni -> Google -> Zarizeni a sdileni -> Quick Share -> ZAP"
Write-Host "2. Viditelnost: Vlastni zarizeni (stejny Google ucet jako na PC)"
Write-Host "3. Fotky/Galerie -> vyber -> Sdilet -> Quick Share -> Vaclav Janota PC"
Write-Host ""
Write-Host "=== PC (jednorazove v okne Quick Share) ==="
Write-Host "Settings -> Save received files to -> C:\MIA\incoming-images"
Write-Host "(pokud junction funguje, staci default Downloads\Quick Share)"
Write-Host ""
Write-Host "Prijate soubory: $inbox (photos/ videos/ other/)"
