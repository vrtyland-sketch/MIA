"use strict";

/**
 * Přidá chybějící T*_VIDEO_* ffmpeg zdroje do OBS (klon z existujícího slotu ve stejném tieru).
 * Nemění transformaci existujících vrstev — nové kopírují layout vzorového videa, defaultně skryté.
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const { loadTemplates } = require("./MIA_MEDIA_CATALOG");

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

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isGiftVideoName(name = "") {
  return /^(T[1-5]_VIDEO_\d+|PROFILE_VIDEO_\d+)$/i.test(safeString(name));
}

function tierFromSource(sourceName = "") {
  const m = safeString(sourceName).match(/^(T[1-5]|PROFILE)_/i);
  return m ? m[1].toUpperCase() : "";
}

function collectDesiredSlots() {
  const templates = loadTemplates();
  const tierSlots = templates?.tierSlots || {};
  const slots = [];
  for (const [tier, names] of Object.entries(tierSlots)) {
    for (const name of names || []) {
      slots.push({ tier, sourceName: safeString(name) });
    }
  }
  return slots.filter((s) => s.sourceName);
}

async function getSceneItem(obs, sceneName, sourceName) {
  const list = await obs.call("GetSceneItemList", { sceneName });
  return (list?.sceneItems || []).find((i) => i?.sourceName === sourceName) || null;
}

function sanitizeSceneItemTransform(transform = {}) {
  const merged = { ...(transform || {}) };
  for (const key of ["boundsWidth", "boundsHeight", "scaleX", "scaleY"]) {
    const value = Number(merged[key]);
    if (!Number.isFinite(value) || value < 1) {
      delete merged[key];
    }
  }
  return merged;
}

async function cloneTransform(obs, sceneName, fromSource, toSceneItemId) {
  const fromItem = await getSceneItem(obs, sceneName, fromSource);
  if (!fromItem) return false;

  try {
    const transformResp = await obs.call("GetSceneItemTransform", {
      sceneName,
      sceneItemId: fromItem.sceneItemId
    });

    const sceneItemTransform = sanitizeSceneItemTransform(
      transformResp?.sceneItemTransform || {}
    );
    if (!Object.keys(sceneItemTransform).length) {
      return false;
    }

    await obs.call("SetSceneItemTransform", {
      sceneName,
      sceneItemId: toSceneItemId,
      sceneItemTransform
    });

    return true;
  } catch (_err) {
    return false;
  }
}

async function ensureGiftVideoSlot(obs, sceneName, sourceName, templateSource, catalogPath) {
  const inputs = (await obs.call("GetInputList"))?.inputs || [];
  const inputSet = new Set(inputs.map((i) => i.inputName));
  const report = { sourceName, created: false, sceneAdded: false, templateSource };

  let templateSettings = {
    local_file: catalogPath || "",
    looping: false,
    restart_on_activate: true,
    close_when_inactive: true,
    clear_on_media_end: true
  };

  if (inputSet.has(templateSource)) {
    const settingsResp = await obs.call("GetInputSettings", { inputName: templateSource });
    templateSettings = {
      ...(settingsResp?.inputSettings || {}),
      local_file: catalogPath || settingsResp?.inputSettings?.local_file || ""
    };
  }

  if (!inputSet.has(sourceName)) {
    await obs.call("CreateInput", {
      sceneName,
      inputName: sourceName,
      inputKind: "ffmpeg_source",
      inputSettings: templateSettings,
      sceneItemEnabled: false
    });
    report.created = true;
  }

  const sceneItem = await getSceneItem(obs, sceneName, sourceName);
  if (!sceneItem) {
    const createItem = await obs.call("CreateSceneItem", {
      sceneName,
      sourceName,
      sceneItemEnabled: false
    });
    report.sceneAdded = true;
    if (templateSource && createItem?.sceneItemId != null) {
      await cloneTransform(obs, sceneName, templateSource, createItem.sceneItemId);
    }
  } else {
    await obs.call("SetSceneItemEnabled", {
      sceneName,
      sceneItemId: sceneItem.sceneItemId,
      sceneItemEnabled: false
    });
    if (templateSource) {
      await cloneTransform(obs, sceneName, templateSource, sceneItem.sceneItemId);
    }
  }

  return report;
}

async function addGiftVideoSlots(options = {}) {
  loadLocalEnv();

  const sceneName =
    options.sceneName ||
    process.env.MIA_OBS_SCENE_NAME ||
    process.env.MIA_SOLO_STREAM_MAIN_SCENE ||
    "SPINAK_ENGINE_GIFTS";

  const tierTemplates = {
    T1: "T1_VIDEO_01",
    T2: "T2_VIDEO_05",
    T3: "T3_VIDEO_09",
    T4: "T4_VIDEO_13",
    T5: "T5_VIDEO_19",
    PROFILE: "PROFILE_VIDEO_01"
  };

  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  await obs.connect(process.env.OBS_WS_URL || "ws://127.0.0.1:4455", password ? { password } : undefined);

  const desired = collectDesiredSlots();
  const inputs = (await obs.call("GetInputList"))?.inputs || [];
  const inputSet = new Set(inputs.map((i) => i.inputName));

  for (const tier of Object.keys(tierTemplates)) {
    const slotsForTier = desired.filter((s) => s.tier === tier).map((s) => s.sourceName);
    const existing = slotsForTier.find((name) => inputSet.has(name));
    if (existing) tierTemplates[tier] = existing;
  }

  const scenes = (await obs.call("GetSceneList"))?.scenes || [];
  if (!scenes.some((s) => s.sceneName === sceneName)) {
    await obs.disconnect();
    throw new Error(`Scene not found: ${sceneName}`);
  }

  const results = [];
  for (const slot of desired) {
    const templateSource = tierTemplates[slot.tier];
    results.push(
      await ensureGiftVideoSlot(obs, sceneName, slot.sourceName, templateSource, "")
    );
  }

  await obs.disconnect();

  return {
    ok: true,
    sceneName,
    totalSlots: desired.length,
    created: results.filter((r) => r.created).length,
    sceneAdded: results.filter((r) => r.sceneAdded).length,
    slots: results
  };
}

async function main() {
  try {
    const report = await addGiftVideoSlots();
    let restart = { scheduled: false };
    const { triggerExternalRestart } = require("./MIA_SELF_RESTART");
    if (report.created > 0 || report.sceneAdded > 0) {
      restart = triggerExternalRestart("media_add_obs_slots", { delayMs: 1200 });
    }
    console.log(JSON.stringify({ ...report, restart }, null, 2));
  } catch (err) {
    console.error(err?.stack || err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { addGiftVideoSlots, collectDesiredSlots };
