"use strict";

/**
 * Opraví pozice MIA overlay podle skutečného OBS canvasu (např. 1280×720 / 1080×1920).
 * Usage: npm run obs:fix-layout
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const {
  buildLayoutPlan,
  buildAwayLayoutPlan,
  readObsCanvas,
  resolveLayoutMode,
  resolvePlatform,
  inferRole
} = require("./MIA_OBS_VISION");

const ROOT = path.resolve(__dirname, "..");

const CORE_OVERLAY_SOURCES = [
  "KOJNOZROUT_RUNTIME",
  "KOJNOZROUT_BOWL_V2",
  "MIA_ENTITY",
  "MIA_BUBBLE",
  "CHAT_OVERLAY"
];

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env");
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

async function readSceneSources(obs, sceneName) {
  const list = await obs.call("GetSceneItemList", { sceneName });
  const items = list?.sceneItems || [];
  const enriched = [];

  for (const item of items) {
    const sourceName = String(item?.sourceName || "");
    if (!sourceName) continue;

    let url = "";
    try {
      const settings = await obs.call("GetInputSettings", { inputName: sourceName });
      url = String(settings?.inputSettings?.url || "");
    } catch (_err) {
      // ignore
    }

    const role = inferRole(sourceName, url);
    if (!role) continue;

    enriched.push({
      sourceName,
      sceneItemId: item.sceneItemId,
      role,
      url
    });
  }

  return enriched;
}

async function applyTransform(obs, sceneName, sourceName, transform, enabled) {
  const idResp = await obs.call("GetSceneItemId", { sceneName, sourceName });
  const sceneItemId = idResp.sceneItemId;

  if (typeof enabled === "boolean") {
    await obs.call("SetSceneItemEnabled", {
      sceneName,
      sceneItemId,
      sceneItemEnabled: enabled
    });
  }

  if (transform) {
    await obs.call("SetSceneItemTransform", {
      sceneName,
      sceneItemId,
      sceneItemTransform: {
        positionX: transform.positionX,
        positionY: transform.positionY,
        scaleX: transform.scaleX,
        scaleY: transform.scaleY,
        alignment: transform.alignment ?? 0,
        rotation: transform.rotation ?? 0,
        boundsType: "OBS_BOUNDS_NONE"
      }
    });
  }

  return { sourceName, sceneItemId, ...transform, enabled };
}

async function applyAwayObsOverlayLayout(obs, options = {}) {
  const awayScene = require("./MIA_OBS_AWAY_SCENE");
  const sceneName =
    options.sceneName ||
    process.env.MIA_AWAY_SCENE ||
    awayScene.resolveAwaySceneName(process.env);
  const platform = options.platform || process.env.MIA_STREAM_PLATFORM || "auto";
  const kickBridge =
    options.kickBridge === true ||
    String(process.env.MIA_KICK_BRIDGE_ENABLED || "").toLowerCase() === "1";

  const canvas = await readObsCanvas((type, data) => obs.call(type, data));
  const resolvedPlatform = resolvePlatform(platform, kickBridge);
  const plan = buildAwayLayoutPlan(resolvedPlatform, canvas);
  const sources = await readSceneSources(obs, sceneName);
  const applied = [];

  for (const source of sources) {
    const spec = plan[source.role];
    if (!spec) continue;
    applied.push(
      await applyTransform(obs, sceneName, source.sourceName, spec, spec.enabled)
    );
  }

  return {
    ok: true,
    sceneName,
    canvas,
    platform: resolvedPlatform,
    mode: "away_idle",
    plan,
    applied: applied.length,
    positions: applied.map((row) => ({
      source: row.sourceName,
      role: sources.find((s) => s.sourceName === row.sourceName)?.role || null,
      x: row.positionX,
      y: row.positionY,
      scale: row.scaleX,
      enabled: row.enabled
    })),
    hint: "AWAY scéna — smyčka + host panel + entity + viewer strip."
  };
}

async function applyObsOverlayLayout(obs, options = {}) {
  const sceneName =
    options.sceneName || process.env.MIA_OBS_CAMERA_SCENE || "SPINAK_ENGINE_GIFTS";
  const platform = options.platform || process.env.MIA_STREAM_PLATFORM || "auto";
  const kickBridge =
    options.kickBridge === true ||
    String(process.env.MIA_KICK_BRIDGE_ENABLED || "").toLowerCase() === "1";
  const layoutContext = options.layoutContext || {};

  const canvas = await readObsCanvas((type, data) => obs.call(type, data));
  const mode = resolveLayoutMode(layoutContext);
  const resolvedPlatform = resolvePlatform(platform, kickBridge);
  const plan = buildLayoutPlan(mode, resolvedPlatform, canvas);
  const sources = await readSceneSources(obs, sceneName);
  const applied = [];

  for (const source of sources) {
    const spec = plan[source.role];
    if (!spec) continue;
    applied.push(
      await applyTransform(obs, sceneName, source.sourceName, spec, spec.enabled)
    );
  }

  const reenabled = [];
  for (const sourceName of CORE_OVERLAY_SOURCES) {
    try {
      const idResp = await obs.call("GetSceneItemId", { sceneName, sourceName });
      await obs.call("SetSceneItemEnabled", {
        sceneName,
        sceneItemId: idResp.sceneItemId,
        sceneItemEnabled: true
      });
      reenabled.push(sourceName);
    } catch (_err) {
      // ignore missing alias
    }
  }

  return {
    ok: true,
    canvas,
    platform: resolvedPlatform,
    mode,
    plan,
    applied: applied.length,
    reenabled,
    positions: applied.map((row) => ({
      source: row.sourceName,
      role: sources.find((s) => s.sourceName === row.sourceName)?.role || null,
      x: row.positionX,
      y: row.positionY,
      scale: row.scaleX,
      enabled: row.enabled
    })),
    hint:
      "Koj + miska + LIVE badge by měly být vidět v OBS Preview. Canvas musí sedět s reálným OBS výstupem."
  };
}

async function main() {
  loadLocalEnv();
  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";

  await obs.connect(wsUrl, password ? { password } : undefined);
  const result = await applyObsOverlayLayout(obs);
  await obs.disconnect();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  });
}

module.exports = {
  CORE_OVERLAY_SOURCES,
  applyObsOverlayLayout,
  applyAwayObsOverlayLayout
};
