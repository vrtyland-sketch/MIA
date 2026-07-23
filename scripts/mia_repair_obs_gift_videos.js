"use strict";

/**
 * Opraví OBS ffmpeg zdroje T*_VIDEO_* když local_file míří na smazaný/přesunutý soubor.
 * Hledá stejný basename v incoming-images/videos a Downloads.
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;

const PROJECT_ROOT = path.resolve(__dirname, "..");
const { loadCatalog, CATALOG_PATH } = require("./MIA_MEDIA_CATALOG");

function loadLocalEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = val;
    }
  }
}

loadLocalEnv();
const VIDEO_DIRS = [
  path.join(PROJECT_ROOT, "incoming-images", "videos"),
  path.join(process.env.USERPROFILE || "", "Downloads")
];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePath(filePath = "") {
  return safeString(filePath).replace(/\\/g, "/");
}

function findVideoFile(basename = "") {
  const name = safeString(basename);
  if (!name) return null;

  const catalog = loadCatalog();
  if (catalog?.obsAssignments?.length) {
    const hit = catalog.obsAssignments.find((a) => path.basename(a.abs || a.rel || "") === name);
    if (hit?.abs && fs.existsSync(hit.abs)) return hit.abs;
  }

  for (const dir of VIDEO_DIRS) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function listPoolVideos() {
  const catalog = loadCatalog();
  const files = [];
  if (catalog?.obsAssignments?.length) {
    for (const assign of catalog.obsAssignments) {
      if (assign.abs && fs.existsSync(assign.abs) && !files.includes(assign.abs)) {
        files.push(assign.abs);
      }
    }
  }
  for (const dir of VIDEO_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (!/\.(mp4|mov|webm|mkv|avi)$/i.test(entry)) continue;
      const full = path.join(dir, entry);
      if (!files.includes(full)) files.push(full);
    }
  }
  return files.sort((a, b) => fs.statSync(a).size - fs.statSync(b).size);
}

function isGiftVideoInput(inputName = "", inputKind = "") {
  if (inputKind !== "ffmpeg_source") return false;
  return /^(T[1-5]_VIDEO_\d+|PROFILE_VIDEO_\d+)$/i.test(safeString(inputName));
}

async function repairObsGiftVideos(options = {}) {
  const obs = new OBSWebSocket();
  const url = options.url || process.env.OBS_WS_URL || "ws://127.0.0.1:4455";
  const password = options.password || process.env.OBS_WS_PASSWORD || "";

  await obs.connect(url, password ? { password } : undefined);

  const inputList = await obs.call("GetInputList");
  const pool = listPoolVideos();
  const report = {
    ok: true,
    scanned: 0,
    fixed: [],
    missing: [],
    alreadyOk: []
  };

  let poolIndex = 0;

  for (const input of inputList?.inputs || []) {
    const inputName = safeString(input?.inputName);
    const inputKind = safeString(input?.inputKind);
    if (!isGiftVideoInput(inputName, inputKind)) continue;

    report.scanned += 1;

    const settingsResp = await obs.call("GetInputSettings", { inputName });
    const current = settingsResp?.inputSettings || {};
    const localFile = safeString(current.local_file);

    if (localFile && fs.existsSync(localFile)) {
      report.alreadyOk.push({ inputName, localFile: normalizePath(localFile) });
      continue;
    }

    let nextPath = localFile ? findVideoFile(path.basename(localFile)) : null;

    if (!nextPath && pool.length > 0) {
      nextPath = pool[poolIndex % pool.length];
      poolIndex += 1;
    }

    if (!nextPath) {
      report.missing.push({ inputName, previous: normalizePath(localFile) });
      continue;
    }

    const obsPath = normalizePath(nextPath);

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

    report.fixed.push({
      inputName,
      from: normalizePath(localFile),
      to: obsPath
    });
  }

  await obs.disconnect();
  return report;
}

async function main() {
  try {
    const report = await repairObsGiftVideos();
    console.log(JSON.stringify(report, null, 2));
    if (report.missing.length > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(err?.stack || err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { repairObsGiftVideos, findVideoFile, isGiftVideoInput };
