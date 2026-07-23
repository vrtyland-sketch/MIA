"use strict";

/**
 * OBS ruce z CLI — doplní browser overlay ve scéně a restartuje MIA pokud něco změní.
 * Usage: npm run obs:apply-hands
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const obsHands = require("./MIA_OBS_HANDS");
const obsAwayScene = require("./MIA_OBS_AWAY_SCENE");
const { buildSplitUrls } = require("./MIA_OBS_VERIFY");
const {
  triggerExternalRestart,
  shouldRestartAfterHands
} = require("./MIA_SELF_RESTART");

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

function mergeHandsReports(main = {}, away = {}) {
  const created = [...(main.created || []), ...(away.created || [])];
  const sceneAdded = [...(main.sceneAdded || []), ...(away.sceneAdded || [])];
  const configured = [...(main.configured || []), ...(away.configured || [])];
  const results = [...(main.results || []), ...(away.results || [])];
  return {
    ok: main.ok !== false && away.ok !== false,
    mainScene: main.sceneName,
    awayScene: away.sceneName,
    created,
    sceneAdded,
    configured,
    results,
    main,
    away
  };
}

async function applyObsHands(options = {}) {
  if (process.env.MIA_OBS_HANDS === "0" || process.env.MIA_OBS_HANDS === "false") {
    return { ok: true, skipped: true, reason: "disabled" };
  }

  const port = Number(options.port || process.env.PORT || 3000);
  const { resolveHandsBodySyncMode } = require("./MIA_OBS_BODY_SYNC");
  const bodySyncMode = resolveHandsBodySyncMode(options, process.env);
  const sceneName =
    options.sceneName ||
    process.env.MIA_OBS_CAMERA_SCENE ||
    process.env.MIA_SOLO_STREAM_MAIN_SCENE ||
    "SPINAK_ENGINE_GIFTS";

  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";

  await obs.connect(wsUrl, password ? { password } : undefined);

  const handsOptions = {
    sceneName,
    splitUrls: buildSplitUrls(port, { bodySync: bodySyncMode }),
    bodySyncMode,
    layoutLocked: process.env.MIA_OBS_LAYOUT_LOCKED !== "false",
    onlyIds: Array.isArray(options.onlyIds) ? options.onlyIds : null
  };

  const awayOnly = options.awayOnly === true;
  let mainResult = { ok: true, skipped: true, reason: "away_only" };
  if (!awayOnly) {
    mainResult = await obsHands.ensureObsOverlayHands(obs.call.bind(obs), handsOptions);
  }

  let awayResult = { ok: true, skipped: true, reason: "disabled" };
  if (
    awayOnly ||
    (process.env.MIA_OBS_AWAY_SCENE_HANDS !== "0" && process.env.MIA_OBS_AWAY_SCENE_HANDS !== "false")
  ) {
    awayResult = await obsAwayScene.ensureObsAwayScene(obs.call.bind(obs), {
      ...handsOptions,
      sceneName:
        options.awaySceneName ||
        process.env.MIA_AWAY_SCENE ||
        obsAwayScene.resolveAwaySceneName(process.env)
    });
  }

  await obs.disconnect();

  const result = mergeHandsReports(mainResult, awayResult);

  let restart = { scheduled: false };
  if (shouldRestartAfterHands(result)) {
    restart = triggerExternalRestart(options.restartReason || "obs_apply_hands_cli", {
      delayMs: options.restartDelayMs ?? 1500
    });
  }

  return { ...result, sceneName, bodySyncMode, restart };
}

async function main() {
  loadLocalEnv();

  try {
    const report = await applyObsHands();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok === false ? 1 : 0;
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: err.message,
          hint: "Spusť OBS + WebSocket (port 4455)"
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

module.exports = { applyObsHands };
