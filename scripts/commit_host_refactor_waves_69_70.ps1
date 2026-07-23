# Commit waves 69–70: final index.js HOST refactor + alignment docs.
# Requires Git for Windows in PATH (https://git-scm.com/download/win).

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git not found in PATH. Install Git for Windows and re-run this script."
}

if (-not (Test-Path ".git")) {
  git init
}

git add `
  index.js `
  scripts/MIA_OUTPUT_POLICY_HOST.js `
  scripts/MIA_ARENA_BATTLE_DEMO_HOST.js `
  scripts/MIA_OVERLAY_TIMING_HOST.js `
  scripts/MIA_VOICE_PRIORITY_HOST.js `
  scripts/MIA_OVERLAY_QUEUE_HOST.js `
  scripts/MIA_OBS_OVERLAY_RENDERER_HOST.js `
  scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_HOST.js `
  scripts/MIA_BOSS_MISSION_HOST.js `
  scripts/MIA_INGEST_DEDUPER_HOST.js `
  scripts/MIA_VOICE_TIMING_HOST.js `
  scripts/MIA_MATTING_INGEST_BRIDGE_HOST.js `
  scripts/MIA_VISION_CONTEXT_HOST.js `
  scripts/MIA_OBS_VISION_HOST.js `
  scripts/MIA_VOICE_LAYER_HOST.js `
  tests/overlay_timing_ctx_contract.js `
  tests/output_policy_ctx_contract.js `
  tests/voice_priority_ctx_contract.js `
  tests/overlay_queue_ctx_contract.js `
  tests/obs_overlay_renderer_ctx_contract.js `
  tests/obs_overlay_sync_wrappers_ctx_contract.js `
  tests/boss_mission_ctx_contract.js `
  tests/ingest_deduper_ctx_contract.js `
  tests/arena_battle_demo_ctx_contract.js `
  tests/voice_timing_ctx_contract.js `
  tests/matting_ingest_bridge_ctx_contract.js `
  tests/vision_context_ctx_contract.js `
  tests/obs_vision_ctx_contract.js `
  tests/voice_control_layer_ctx_contract.js `
  tests/media_command_hosts_contract.js `
  docs/KANON_MIA_ALIGNMENT.md `
  docs/KANON_SOUCASNY_PREHLED.md

$msg = @"
Complete index.js HOST refactor (waves 69–70).

Extract the last 14 runtime domains into MIA_*_HOST modules with collect*BindingsHost → build*Host → build*Ctx wiring, update contract tests, and mark 60-domain HOST coverage in alignment docs.
"@

git commit -m $msg
git status

Write-Host "`nDone. Preflight target: npm run test:preflight:fast (140/140)"
