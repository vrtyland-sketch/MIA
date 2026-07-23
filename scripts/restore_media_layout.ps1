# Obnovi puvodni strukturu photos/ videos/ other/
$ErrorActionPreference = "Stop"
$inbox = "C:\MIA\incoming-images"
$photos = Join-Path $inbox "photos"
$videos = Join-Path $inbox "videos"
$other = Join-Path $inbox "other"

foreach ($dir in @($photos, $videos, $other)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

foreach ($class in @("unreviewed", "private", "usable", "rejected")) {
  foreach ($kind in @("photos", "videos", "other")) {
    $srcDir = Join-Path $inbox "$class\$kind"
    if (-not (Test-Path -LiteralPath $srcDir)) { continue }
    $destDir = Join-Path $inbox $kind
    Get-ChildItem -LiteralPath $srcDir -File -ErrorAction SilentlyContinue | ForEach-Object {
      if ($_.Name.StartsWith(".")) { return }
      $dest = Join-Path $destDir $_.Name
      if (Test-Path -LiteralPath $dest) {
        $base = [IO.Path]::GetFileNameWithoutExtension($_.Name)
        $dest = Join-Path $destDir ("{0}_restored{1}" -f $base, $_.Extension)
      }
      Move-Item -LiteralPath $_.FullName -Destination $dest -Force
      Write-Host "restored -> $kind\$([IO.Path]::GetFileName($dest))"
    }
  }
}

$inboxDrop = Join-Path $inbox "_inbox"
if (Test-Path -LiteralPath $inboxDrop) {
  Get-ChildItem -LiteralPath $inboxDrop -File -ErrorAction SilentlyContinue | ForEach-Object {
    $ext = $_.Extension.ToLowerInvariant()
    $kind = "other"
    if ($ext -in @(".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp", ".dng")) { $kind = "photos" }
    elseif ($ext -in @(".mp4", ".mov", ".mkv", ".avi", ".webm", ".3gp", ".m4v", ".mpeg", ".mpg")) { $kind = "videos" }
    $dest = Join-Path (Join-Path $inbox $kind) $_.Name
    Move-Item -LiteralPath $_.FullName -Destination $dest -Force
    Write-Host "inbox -> $kind\$($_.Name)"
  }
}

# Smazat prazdne tridy
foreach ($class in @("unreviewed", "private", "usable", "rejected", "_inbox")) {
  $p = Join-Path $inbox $class
  if (Test-Path -LiteralPath $p) {
    Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Remove-Item -LiteralPath (Join-Path $inbox ".media-manifest.json") -Force -ErrorAction SilentlyContinue

Write-Host "Hotovo: photos/videos/other obnoveny"
