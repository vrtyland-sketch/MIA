#!/usr/bin/env node
"use strict";

/**
 * AWAY scéna: apply hands + loop + layout + MIA oči verify.
 * Usage: npm run obs:apply-away-eyes
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const { buildSplitUrls } = require("./MIA_OBS_VERIFY");
const obsAwayScene = require("./MIA_OBS_AWAY_SCENE");
const { applyAwayObsOverlayLayout } = require("./obs_fix_overlay_layout");
const { createMiaEyes } = require("./MIA_EYES");

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

async function obsApplyAwayEyes(options = {}) {
  loadLocalEnv();

  const port = Number(options.port || process.env.PORT || 3000);
  const awaySceneName =
    options.sceneName ||
    process.env.MIA_AWAY_SCENE ||
    obsAwayScene.resolveAwaySceneName(process.env);
  const splitUrls = buildSplitUrls(port);

  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";

  await obs.connect(wsUrl, password ? { password } : undefined);
  const obsCall = obs.call.bind(obs);

  const awayResult = await obsAwayScene.ensureObsAwayScene(obsCall, {
    sceneName: awaySceneName,
    splitUrls,
    layoutLocked: process.env.MIA_OBS_LAYOUT_LOCKED !== "false"
  });

  const layoutResult = await applyAwayObsOverlayLayout(obs, {
    sceneName: awaySceneName
  });

  const eyes = createMiaEyes({
    safeObsCall: async (requestType, requestData = {}) => {
      try {
        const data = await obsCall(requestType, requestData);
        return { ok: true, response: data, ...data };
      } catch (err) {
        return { ok: false, reason: err.message || String(err) };
      }
    },
    appendJsonLog: () => {},
    runtimeConfig: { obs: { sceneName: awaySceneName } }
  });

  const eyesScan = await eyes.scanAwayScene({
    sceneName: awaySceneName,
    force: true
  });

  let sceneSwitch = { skipped: true };
  if (options.switchToAway !== false && process.env.MIA_AWAY_EYES_SWITCH !== "0") {
    try {
      const current = await obsCall("GetCurrentProgramScene");
      const prev = current?.currentProgramSceneName || current?.sceneName;
      if (prev !== awaySceneName) {
        await obsCall("SetCurrentProgramScene", { sceneName: awaySceneName });
        await new Promise((r) => setTimeout(r, 1200));
        sceneSwitch = { switched: true, from: prev, to: awaySceneName };
        const rescan = await eyes.scanAwayScene({ sceneName: awaySceneName, force: true });
        eyesScan.onAwayScene = rescan.onAwayScene;
        eyesScan.loopVisual = rescan.loopVisual;
        eyesScan.ok = rescan.ok;
        if (prev) {
          await obsCall("SetCurrentProgramScene", { sceneName: prev });
          sceneSwitch.restored = prev;
        }
      }
    } catch (err) {
      sceneSwitch = { ok: false, error: err.message };
    }
  }

  await obs.disconnect();

  return {
    ok: awayResult.ok !== false && eyesScan.ok === true,
    awayScene: awaySceneName,
    away: awayResult,
    layout: layoutResult,
    eyes: eyesScan,
    sceneSwitch,
    hint: eyesScan.ok
      ? "AWAY smyčka + overlaye OK (MIA oči)"
      : "Zkontroluj OBS Preview — npm run obs:away-manifest"
  };
}

async function main() {
  try {
    const report = await obsApplyAwayEyes();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok ? 0 : 1;
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: err.message,
          hint: "OBS běží + WebSocket 4455 + MIA server pro browser loop URL"
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

module.exports = { obsApplyAwayEyes };
