# Background: tridi nove soubory z Quick Share do photos/ videos/ other/
$inbox = "C:\MIA\incoming-images"
$downloads = Join-Path $env:USERPROFILE "Downloads"
$logDir = "C:\MIA\logs"
$logFile = Join-Path $logDir "fold-inbox.log"

$photoExt = @(".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp", ".dng")
$videoExt = @(".mp4", ".mov", ".mkv", ".avi", ".webm", ".3gp", ".m4v", ".mpeg", ".mpg")

function Test-WhatsAppMediaName([string]$name) {
  if ([string]::IsNullOrWhiteSpace($name)) { return $false }
  if ($name -match '^(WhatsApp\s+(Image|Video)|IMG-|VID-)') { return $true }
  return $false
}

function Write-Log([string]$msg) {
  if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Sort-InboxFile([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  $item = Get-Item -LiteralPath $path -Force
  if ($item.PSIsContainer) { return }

  $parent = $item.DirectoryName
  $subdirs = @(
    (Join-Path $inbox "photos"),
    (Join-Path $inbox "videos"),
    (Join-Path $inbox "other")
  )
  if ($subdirs -contains $parent) { return }

  $ext = $item.Extension.ToLowerInvariant()
  if ($parent -eq $downloads -and $photoExt -notcontains $ext -and $videoExt -notcontains $ext) {
    return
  }

  # Videa z Downloads nepresouvej (OBS gift zdroje) — krome WhatsApp nazvu.
  if ($parent -eq $downloads -and $videoExt -contains $ext) {
    if (-not (Test-WhatsAppMediaName $item.Name)) { return }
  }

  $bucket = "other"
  if ($photoExt -contains $ext) { $bucket = "photos" }
  elseif ($videoExt -contains $ext) { $bucket = "videos" }

  $destDir = Join-Path $inbox $bucket
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  $dest = Join-Path $destDir $item.Name
  if (Test-Path -LiteralPath $dest) {
    $base = [IO.Path]::GetFileNameWithoutExtension($item.Name)
    $dest = Join-Path $destDir ("{0}_{1}{2}" -f $base, (Get-Date -Format "HHmmss"), $ext)
  }

  try {
    Move-Item -LiteralPath $path -Destination $dest -Force
    Write-Log "sorted -> $bucket\$([IO.Path]::GetFileName($dest))"
  } catch {
    Write-Log "error: $path :: $($_.Exception.Message)"
  }
}

Write-Log "sorter started on $inbox (+ Downloads media)"

while ($true) {
  Get-ChildItem -LiteralPath $inbox -File -ErrorAction SilentlyContinue | ForEach-Object {
    Sort-InboxFile $_.FullName
  }
  Get-ChildItem -LiteralPath $downloads -File -ErrorAction SilentlyContinue | ForEach-Object {
    Sort-InboxFile $_.FullName
  }
  Start-Sleep -Seconds 3
}
