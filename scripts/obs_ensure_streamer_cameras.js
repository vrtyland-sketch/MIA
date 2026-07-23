"use strict";

/**
 * OBS ensure — 6 kamer + immersive overlay.
 * Usage: npm run obs:ensure-streamer-cameras
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const streamerCameras = require("./MIA_OBS_STREAMER_CAMERAS");
const { buildSplitUrls } = require("./MIA_OBS_VERIFY");

const PROJECT_ROOT = path.resolve(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

async function applyObsStreamerCameras(options = {}) {
  if (
    process.env.MIA_OBS_STREAMER_CAMERAS === "0" ||
    process.env.MIA_OBS_STREAMER_CAMERAS === "false"
  ) {
    return { ok: true, skipped: true, reason: "disabled" };
  }

  const port = Number(options.port || process.env.PORT || 3000);
  const sceneName =
    options.sceneName ||
    process.env.MIA_OBS_CAMERA_SCENE ||
    process.env.MIA_SOLO_STREAM_MAIN_SCENE ||
    "SPINAK_ENGINE_GIFTS";

  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";

  await obs.connect(wsUrl, password ? { password } : undefined);

  const result = await streamerCameras.ensureObsStreamerRig(obs.call.bind(obs), {
    sceneName,
    splitUrls: buildSplitUrls(port),
    layoutLocked: process.env.MIA_OBS_LAYOUT_LOCKED !== "false",
    primaryDevice:
      process.env.MIA_OBS_CAMERA_DEVICE ||
      process.env.MIA_OBS_PRIMARY_DEVICE ||
      "FaceCam 1000X",
    legacyPrimaryName: process.env.MIA_OBS_CAMERA_NAME || "NOTEBOOK_CAMERA",
    ensureOverlay: options.ensureOverlay !== false
  });

  await obs.disconnect();
  return { ...result, sceneName, port };
}

async function main() {
  loadLocalEnv();
  try {
    const report = await applyObsStreamerCameras();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok === false ? 1 : 0;
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: err.message,
          hint: "Spusť OBS + WebSocket (4455), pak npm run obs:ensure-streamer-cameras"
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { applyObsStreamerCameras };
