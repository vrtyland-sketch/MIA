"use strict";

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const { loadCatalog, CATALOG_PATH, buildCatalog, saveCatalog } = require("./MIA_MEDIA_CATALOG");

function loadLocalEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = val;
    }
  }
}

function normalizePath(filePath = "") {
  return String(filePath || "").trim().replace(/\\/g, "/");
}

function isGiftVideoInput(inputName = "", inputKind = "") {
  if (inputKind !== "ffmpeg_source") return false;
  return /^(T[1-5]_VIDEO_\d+|PROFILE_VIDEO_\d+)$/i.test(String(inputName || "").trim());
}

async function applyCatalogToObs(options = {}) {
  loadLocalEnv();
  let catalog = options.catalog || loadCatalog();
  if (!catalog) {
    catalog = buildCatalog();
    saveCatalog(catalog);
  }

  const obs = new OBSWebSocket();
  const url = options.url || process.env.OBS_WS_URL || "ws://127.0.0.1:4455";
  const password = options.password || process.env.OBS_WS_PASSWORD || "";
  await obs.connect(url, password ? { password } : undefined);

  const bySource = new Map((catalog.obsAssignments || []).map((a) => [a.obsSource, a]));
  const report = { ok: true, applied: [], skipped: [], missing: [] };

  const inputList = await obs.call("GetInputList");
  for (const input of inputList?.inputs || []) {
    const inputName = String(input?.inputName || "").trim();
    const inputKind = String(input?.inputKind || "").trim();
    if (!isGiftVideoInput(inputName, inputKind)) continue;

    const assign = bySource.get(inputName);
    if (!assign) {
      report.skipped.push({ inputName, reason: "no_catalog_assignment" });
      continue;
    }
    if (!fs.existsSync(assign.abs)) {
      report.missing.push({ inputName, rel: assign.rel });
      continue;
    }

    const settingsResp = await obs.call("GetInputSettings", { inputName });
    const current = settingsResp?.inputSettings || {};
    const obsPath = normalizePath(assign.abs);

    await obs.call("SetInputSettings", {
      inputName,
      inputSettings: {
        ...current,
        local_file: obsPath,
        looping: current.looping === true,
        restart_on_activate: current.restart_on_activate !== false,
        close_when_inactive: current.close_when_inactive !== false,
        clear_on_media_end: current.clear_on_media_end !== false
      },
      overlay: true
    });

    try {
      await obs.call("TriggerMediaInputAction", {
        inputName,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
      });
    } catch (_err) {
      // non-fatal
    }

    report.applied.push({
      inputName,
      tier: assign.tier,
      rel: assign.rel,
      category: assign.category
    });
  }

  await obs.disconnect();
  return report;
}

async function main() {
  try {
    const report = await applyCatalogToObs();
    let restart = { scheduled: false };
    const { triggerExternalRestart, shouldRestartAfterMediaApply } = require("./MIA_SELF_RESTART");
    if (shouldRestartAfterMediaApply(report)) {
      restart = triggerExternalRestart("media_apply_obs_cli", { delayMs: 1200 });
    }
    console.log(JSON.stringify({ ...report, restart }, null, 2));
    if (report.missing.length > 0) process.exitCode = 1;
  } catch (err) {
    console.error(err?.stack || err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { applyCatalogToObs };
