# Archivace deprecated kodu — spust rucne po schvaleni auditu
#   powershell -ExecutionPolicy Bypass -File scripts/archive_deprecated.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$base = Join-Path $root "archive\deprecated"

$dirs = @(
  "$base\code\scripts",
  "$base\code\legacy",
  "$base\code\MIA_NEXT\action",
  "$base\code\MIA_NEXT\decision",
  "$base\code\generators",
  "$base\code\root",
  "$base\code\tests",
  "$base\assets"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

function Move-IfExists($src, $dest) {
  if (Test-Path $src) {
    Move-Item $src $dest -Force
    Write-Host "MOVED $src -> $dest"
  }
}

$scriptOrphans = @(
  "MIA_INGEST_ROUTER.js","MIA_TIKTOK_NORMALIZER.js","MIA_PARSER_KICK.js","MIA_EVENT_CLASSIFIER.js",
  "MIA_COMMUNITY_RESOLVER.js","MIA_EVENT_SCHEMA.js","MIA_EVENT_BUS.js","MIA_INGEST_CLIENT.js",
  "MIA_TEST_BRIDGE.js","MIA_EMOTION_ENGINE.js","MIA_CHAT_ENGINE.js","MIA_OVERLAY_BRIDGE.js",
  "MIA_AVATAR_RUNTIME.js","MIA_AVATAR_ACTIONS.js","MIA_ADAPTER_KICK_API.js","MIA_GIFT_QUEUE_POLICY.js",
  "MIA_GIFT_RUNTIME_HELPERS.js","MIA_TEXT_BANK_EXPORT.js","MIA_KOJNOZROUT_MEGA_BANK.js","MIA_GREETING_AGGREGATOR.js"
)
foreach ($f in $scriptOrphans) {
  Move-IfExists (Join-Path $root "scripts\$f") (Join-Path $base "code\scripts\$f")
}

foreach ($f in @("MIA_NORMALIZER.js","MIA_ADAPTER_KICK.js","MIA_DECISION_ENGINE.js","MIA_ACTION_ENGINE.js","MIA_SPAM_ENGINE.js")) {
  Move-IfExists (Join-Path $root "legacy\$f") (Join-Path $base "code\legacy\$f")
}

foreach ($f in @("engine_runtime_switch.js","engine_action_wrapper.js","engine_decision_wrapper.js","engine_ingest_adapter.js","core_contracts_normalized_event.js")) {
  Move-IfExists (Join-Path $root "MIA_NEXT\$f") (Join-Path $base "code\MIA_NEXT\$f")
}
Move-IfExists (Join-Path $root "MIA_NEXT\action\action_builder.js") (Join-Path $base "code\MIA_NEXT\action\action_builder.js")
Move-IfExists (Join-Path $root "MIA_NEXT\decision\decision_engine.js") (Join-Path $base "code\MIA_NEXT\decision\decision_engine.js")

foreach ($f in @("kojnozrout_generate_base_sprites.js","kojnozrout_generate_full_sprite_set.js","kojnozrout_generate_mega_bank.js")) {
  Move-IfExists (Join-Path $root "scripts\$f") (Join-Path $base "code\generators\$f")
}

Move-IfExists (Join-Path $root "TEST_PARSE_KICK.js") (Join-Path $base "code\root\TEST_PARSE_KICK.js")
Move-IfExists (Join-Path $root "tests\kojnozrout_mega_bank_contract.js") (Join-Path $base "code\tests\kojnozrout_mega_bank_contract.js")
Move-IfExists (Join-Path $root "tests\aggregate_modules_smoke.js") (Join-Path $base "code\tests\aggregate_modules_smoke.js")
Move-IfExists (Join-Path $root "shared\aggregate") (Join-Path $base "code\shared-aggregate")

$mega = Join-Path $root "mia-output-overlay\assets\kojnozrout\mega"
if (Test-Path $mega) {
  Move-IfExists $mega (Join-Path $base "assets\kojnozrout-mega")
}

Write-Host "`nHotovo. Viz docs/AUDIT_2026-06-18.md"
