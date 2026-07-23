"use strict";

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "shared", "host_mode_config.json");

const FALLBACK = Object.freeze({
  version: "1.0.0",
  awayScene: "SPINAK_NEJSEM_TU",
  mainScene: "SPINAK_ENGINE_GIFTS",
  obsSceneSwitchEnv: "MIA_AWAY_OBS_SCENE_SWITCH",
  ninjaEmbedEnv: "MIA_OBS_NINJA_URL",
  hostOverlay: {
    holdVisibleWhileAway: true,
    showNinjaWhenUrlSet: true,
    showCapybaraPrompt: true
  }
});

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return { ...FALLBACK, ...raw, hostOverlay: { ...FALLBACK.hostOverlay, ...(raw.hostOverlay || {}) } };
  } catch {
    return { ...FALLBACK };
  }
}

const CONFIG = loadConfig();

function getConfig() {
  return CONFIG;
}

function resolveNinjaEmbedUrl(env = process.env) {
  const key = safeString(CONFIG.ninjaEmbedEnv, "MIA_OBS_NINJA_URL");
  const url = safeString(env[key]);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function isObsSceneSwitchEnabled(env = process.env, runtimeConfig = {}) {
  const key = safeString(CONFIG.obsSceneSwitchEnv, "MIA_AWAY_OBS_SCENE_SWITCH");
  const raw = safeString(env[key]).toLowerCase();
  if (["1", "true", "on", "yes"].includes(raw)) return true;
  return runtimeConfig?.awayMode?.obsSceneSwitch === true;
}

function buildHostPanelSnapshot(ctx = {}) {
  const hostMode = ctx.hostMode || {};
  const capybara = ctx.capybaraFlow || null;
  const audience = ctx.audience || {};
  const ninjaEmbedUrl = resolveNinjaEmbedUrl(ctx.env || process.env);
  const awayActive = Boolean(hostMode.awayActive || hostMode.hostMode === "nejsem_tu");

  return {
    awayActive,
    hostMode: safeString(hostMode.hostMode, "live"),
    label: safeString(hostMode.label, awayActive ? "NEJSEM TU · MIA HOST" : "LIVE"),
    badge: safeString(hostMode.badge, awayActive ? "HOST" : "LIVE"),
    sceneName: safeString(hostMode.sceneName, CONFIG.awayScene),
    awaySceneActive: Boolean(hostMode.awaySceneActive),
    ninjaEmbedUrl: awayActive && CONFIG.hostOverlay?.showNinjaWhenUrlSet ? ninjaEmbedUrl : null,
    obsSceneSwitchEnabled: isObsSceneSwitchEnabled(ctx.env || process.env, ctx.runtimeConfig),
    capybara: capybara
      ? {
          active: Boolean(capybara.active),
          phase: safeString(capybara.phase),
          waitPrompt: safeString(capybara.waitPrompt || capybara.prompt),
          gifter: safeString(capybara.gifter || capybara.userLabel || capybara.gifterLabel),
          giftName: safeString(capybara.giftName)
        }
      : null,
    giftWait: capybara
      ? {
          active: Boolean(capybara.active),
          phase: safeString(capybara.phase),
          waitPrompt: safeString(capybara.waitPrompt || capybara.prompt),
          gifter: safeString(capybara.gifter || capybara.userLabel || capybara.gifterLabel),
          giftName: safeString(capybara.giftName)
        }
      : null,
    audience: {
      viewerCount: Math.max(0, Number(audience.viewerCount || 0)),
      platform: safeString(audience.platform)
    },
    overlayVisible: awayActive && CONFIG.hostOverlay?.holdVisibleWhileAway !== false
  };
}

module.exports = {
  CONFIG_PATH,
  FALLBACK,
  getConfig,
  resolveNinjaEmbedUrl,
  isObsSceneSwitchEnabled,
  buildHostPanelSnapshot
};
