$c = Get-Clipboard
if ($null -eq $c) { $c = "" }
$c = [string]$c
if ($c -match '^AIza') {
  $c | node scripts/mia_save_youtube_api_key.js
  exit $LASTEXITCODE
}
Write-Output ("{`"ok`":false,`"reason`":`"clipboard_not_api_key`",`"len`":" + $c.Length + "}")
exit 1
