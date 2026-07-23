"use strict";

/**
 * OBS scéna NEJSEM TU — browser overlay vrstvy pro AWAY / host režim.
 * Sdílené globální inputy s hlavní scénou; jiná viditelnost (host_mode ON).
 */

const hostModeConfig = require("./MIA_HOST_MODE_CONFIG");
const obsHands = require("./MIA_OBS_HANDS");
const awayLoop = require("./MIA_OBS_AWAY_LOOP");
const { BROWSER_LAYERS } = require("./MIA_OBS_LIVE_MANIFEST");

/** Trvale viditelné ve scéně AWAY (ostatní moment vrstvy jsou ve scéně, ale skryté). */
const AWAY_ALWAYS_VISIBLE = Object.freeze(
  new Set(["host_mode", "entity", "viewer_strip", "speech", "voice"])
);

/** Povinné pro verify před NEJSEM TU live. */
const AWAY_REQUIRED_IDS = Object.freeze([
  "host_mode",
  "entity",
  "viewer_strip",
  "speech",
  "voice"
]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function resolveAwaySceneName(env = process.env) {
  return (
    safeString(env.MIA_AWAY_SCENE) ||
    safeString(hostModeConfig.getConfig()?.awayScene) ||
    "SPINAK_NEJSEM_TU"
  );
}

function buildAwayVisibilityOverrides() {
  const overrides = {};
  for (const layer of BROWSER_LAYERS) {
    if (layer.obs === false) continue;
    overrides[layer.id] = AWAY_ALWAYS_VISIBLE.has(layer.id);
  }
  return overrides;
}

function buildAwayHandsSpecs(splitUrls = {}) {
  const overrides = buildAwayVisibilityOverrides();
  return obsHands.buildObsRecommendedSpecs(splitUrls).map((spec) => ({
    ...spec,
    sceneItemEnabled: overrides[spec.id] === true
  }));
}

async function ensureObsAwayScene(obsCall, options = {}) {
  if (typeof obsCall !== "function") {
    return { ok: false, reason: "obs_call_missing" };
  }

  if (options.overlayMode === "hub") {
    return { ok: true, skipped: true, reason: "hub_mode", results: [] };
  }

  const sceneName = safeString(options.sceneName, resolveAwaySceneName(options.env));
  const splitUrls = options.splitUrls || {};
  const visibilityOverrides = buildAwayVisibilityOverrides();

  const sceneResult = await obsHands.ensureSceneExists(obsCall, sceneName);
  if (sceneResult.ok !== true) {
    return { ok: false, sceneName, reason: sceneResult.reason || "scene_create_failed" };
  }

  const loopResult = await awayLoop.ensureAwayLoopInScene(obsCall, sceneName, {
    port: options.port,
    targetUrl: options.awayLoopUrl,
    env: options.env || process.env
  });

  const result = await obsHands.ensureObsOverlayHands(obsCall, {
    sceneName,
    splitUrls,
    visibilityOverrides,
    ensureScene: false,
    resolveLayout: options.resolveLayout,
    applyProfile: options.applyProfile,
    layoutLocked: options.layoutLocked === true,
    overlayMode: options.overlayMode,
    onlyIds: Array.isArray(options.onlyIds) ? options.onlyIds : null
  });

  return {
    ...result,
    sceneName,
    sceneCreated: sceneResult.created === true,
    awayAlwaysVisible: [...AWAY_ALWAYS_VISIBLE],
    awayLoop: loopResult
  };
}

function buildAwaySceneManifest(options = {}) {
  const sceneName = resolveAwaySceneName(options.env);
  const port = Number(options.port || 3000);
  const baseUrl = safeString(options.baseUrl, `http://127.0.0.1:${port}`).replace(/\/$/, "");
  const visibility = buildAwayVisibilityOverrides();

  const layers = BROWSER_LAYERS.filter((row) => row.obs !== false).map((row) => ({
    ...row,
    url: `${baseUrl}/${row.file}`,
    sceneItemEnabled: visibility[row.id] === true,
    awayRequired: AWAY_REQUIRED_IDS.includes(row.id)
  }));

  const loopStatus = awayLoop.buildAwayLoopStatus(options.env);

  return {
    sceneName,
    baseUrl,
    layers,
    requiredIds: AWAY_REQUIRED_IDS,
    awayLoop: loopStatus,
    note:
      "Pozadí: MIA_AWAY_LOOP (browser CSS nebo MP4). Overlay vrstvy nad smyčkou."
  };
}

function formatAwaySceneText(manifest = buildAwaySceneManifest()) {
  const lines = [];
  lines.push("=== MIA OBS AWAY SCENE (NEJSEM TU) ===");
  lines.push(`Scéna: ${manifest.sceneName}`);
  lines.push(`MIA: ${manifest.baseUrl}`);
  lines.push("");
  lines.push("--- Pozadí (smyčka) ---");
  if (manifest.awayLoop) {
    lines.push(`Režim: ${manifest.awayLoop.mode}`);
    lines.push(`OBS jméno: ${manifest.awayLoop.inputName}`);
    if (manifest.awayLoop.mode === "video") {
      lines.push(`MP4: ${manifest.awayLoop.videoRelPath} (${manifest.awayLoop.videoExists ? "existuje" : "chybí — npm run media:generate-away-loop"})`);
    } else {
      lines.push(`Browser: ${manifest.awayLoop.browserUrl}`);
    }
  }
  lines.push("");
  lines.push("--- Browser sources ve scéně AWAY ---");
  lines.push("viditelný | povinný | OBS jméno | soubor");

  const sorted = [...manifest.layers].sort((a, b) => b.zIndex - a.zIndex);
  for (const row of sorted) {
    lines.push(
      [
        row.sceneItemEnabled ? "ANO" : "ne ",
        row.awayRequired ? "ANO" : "ne ",
        row.inputName,
        row.file
      ].join(" | ")
    );
  }

  lines.push("");
  lines.push(`→ ${manifest.note}`);
  lines.push("→ npm run media:generate-away-loop  (volitelné MP4)");
  lines.push("→ npm run obs:apply-hands  (main + away scéna)");
  lines.push("→ npm run obs:apply-away-scene  (jen away)");
  lines.push("");
  return lines.join("\n");
}

module.exports = {
  AWAY_ALWAYS_VISIBLE,
  AWAY_REQUIRED_IDS,
  resolveAwaySceneName,
  buildAwayVisibilityOverrides,
  buildAwayHandsSpecs,
  ensureObsAwayScene,
  buildAwaySceneManifest,
  formatAwaySceneText
};
