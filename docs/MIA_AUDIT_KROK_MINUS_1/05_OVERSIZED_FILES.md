# MIA AUDIT KROK -1 — Přerostlé soubory

> Dva prahy: **1000 řádků** (kód/konfig) a **1 MB** (binární assety). Aktuální stav repa.

## Souhrn

| Práh | Počet |
|------|-------|
| >1000 řádků (JS/JSON/HTML/MD) | 38 |
| >1 MB (vše mimo node_modules/.git) | 1295 |

## A. Podle velikosti (>1 MB) — top 30

| Velikost | Cesta | Kat. |
|----------|-------|------|
| 171,41 MB | `incoming-images/videos_2/2026-06-21-201620647.mp4` | MEDIA |
| 142,58 MB | `downloads/QuickShare_Google.msi` | UNKNOWN |
| 141,21 MB | `incoming-images/videos/lv_0_20260302112329.mp4` | MEDIA |
| 127,71 MB | `incoming-images/videos/lv_0_20260302120551.mp4` | MEDIA |
| 118,31 MB | `incoming-images/videos/lv_0_20260305140654.mp4` | MEDIA |
| 114,78 MB | `_tmp_master.bundle` (kořen) | TEMP |
| 69,88 MB | `incoming-images/videos/lv_0_20260213174259.mp4` | MEDIA |
| 62,95 MB | `incoming-images/videos/lv_0_20260227201454.mp4` | MEDIA |
| 58,66 MB | `.cursor/debug-844269.log` | LOG |
| 57,64 MB | `incoming-images/videos/lv_7492826773315439933_20260217114448.mp4` | MEDIA |
| 7,43 MB | `mia-output-overlay/assets/animation-bank/dance/dance_001/built/sprite_sheet.png` | OVERLAY |
| 6,69 MB | `mia-output-overlay/assets/animation-bank/gift/galaxy/built/sprite_sheet.png` | OVERLAY |
| 6,08 MB | `mia-output-overlay/assets/animation-bank/gift/rose/built/sprite_sheet.png` | OVERLAY |

Většina souborů >1 MB jsou **PNG sprite sheety** v `mia-output-overlay/assets/` a **MP4** v `incoming-images/`.

## B. Podle počtu řádků (>1000) — 38 souborů

> Seznam 50 položek níže pochází z dřívějšího scanu včetně `.tmp-audit/` a archivu; ověřený re-scan (JS/JSON/HTML/MD mimo node_modules) = **38**.
| Řádky | Cesta | Kat. |
|-------|-------|------|
| 9874 | `config/stream-media-catalog.json` | CONFIG |
| 5992 | `_obs_scene_backups/SPINAK.backup-1782637686593.json` | UNKNOWN |
| 5680 | `config/media-visual-review.json` | CONFIG |
| 4461 | `index.js` | CORE |
| 4073 | `archive/deprecated/assets/kojnozrout-mega/mega-bank-manifest.json` | UNKNOWN |
| 3033 | `mia-output-overlay/mia-paint/lib/mia-paint-core.js` | OVERLAY |
| 2485 | `mia-output-overlay/mia-paint/app.js` | OVERLAY |
| 2037 | `mia-output-overlay/mia-paint/lib/mia-paint-gpu.js` | OVERLAY |
| 1819 | `package-lock.json` | UNKNOWN |
| 1640 | `mia-output-overlay/mia-remote.html` | OVERLAY |
| 1622 | `scripts/MIA_VIDEO_ENGINE.js` | MIA |
| 1582 | `scripts/MIA_OBS_OVERLAY_SYNC.js` | MIA |
| 1579 | `scripts/MIA_RESPONSE_ENGINE.js` | MIA |
| 1570 | `shared/mia-alert-core/alertManager.js` | MIA |
| 1543 | `config/media-intake-overrides.json` | CONFIG |
| 1518 | `shared/mia-recovery-core/recoveryManager.js` | MIA |
| 1490 | `shared/mia-diagnostics-core/diagnosticsManager.js` | MIA |
| 1470 | `mia-output-overlay/assets/animation-bank/bank-index.json` | OVERLAY |
| 1414 | `shared/mia-fault-core/faultManager.js` | MIA |
| 1414 | `shared/mia-saga-core/sagaManager.js` | MIA |
| 1369 | `mia-output-overlay/mia-streamer-dashboard.html` | OVERLAY |
| 1354 | `scripts/MIA_DELIVERY_RUNTIME.js` | MIA |
| 1340 | `tests/media_command_hosts_contract.js` | TEST |
| 1328 | `shared/mia-workflow-core/workflowEngine.js` | MIA |
| 1281 | `shared/platform_runtime/action_builder.js` | MIA |
| 1272 | `mia-output-overlay/speech-overlay.html` | OVERLAY |
| 1267 | `shared/mia-metrics-core/metricsManager.js` | MIA |
| 1241 | `mia-output-overlay/assets/kojnozrout/koj-runtime.css` | OVERLAY |
| 1223 | `shared/mia-shutdown-core/shutdownManager.js` | MIA |
| 1200 | `data/gift-map-stats.json` | UNKNOWN |
| 1173 | `shared/mia-logging-core/loggingManager.js` | MIA |
| 1163 | `mia-output-overlay/vendor/pixi.min.js` | OVERLAY |
| 1161 | `shared/mia-watchdog-core/watchdogEngine.js` | MIA |
| 1134 | `shared/mia-safe-mode-core/safeModeManager.js` | MIA |
| 1133 | `.tmp-audit/preflight-gift-anim-followup.json` | UNKNOWN |
| 1129 | `mia-output-overlay/assets/kojnozrout/pose-frames-manifest.json` | OVERLAY |
| 1125 | `shared/mia-projection-core/projectionManager.js` | MIA |
| 1104 | `shared/mia-query-bus-core/queryBusManager.js` | MIA |
| 1101 | `shared/mia-message-queue-core/messageQueueManager.js` | MIA |
| 1089 | `scripts/MIA_OVERLAY_STATE.js` | MIA |
| 1071 | `scripts/MIA_MEDIA_CATALOG.js` | MIA |
| 1048 | `shared/mia-health-core/healthManager.js` | MIA |
| 1047 | `shared/mia-command-bus-core/commandBusManager.js` | MIA |
| 1026 | `mia-output-overlay/gift-animation-overlay.html` | OVERLAY |
| 1020 | `.tmp-audit/obs-apply-hands-gift-anim.json` | UNKNOWN |
| 1020 | `docs/KANON_MIA_ALIGNMENT.md` | UNKNOWN |
| 1018 | `mia-output-overlay/kojnozrout-runtime.html` | OVERLAY |
| 1014 | `shared/mia-event-store-core/eventStoreManager.js` | MIA |
| 1005 | `archive/deprecated/code/MIA_NEXT/action/action_builder.js` | UNKNOWN |
| 1002 | `shared/mia-audit-core/auditManager.js` | MIA |
