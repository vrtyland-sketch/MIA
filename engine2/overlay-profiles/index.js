"use strict";

/**
 * Engine 2.0 — E3 overlay profiles.
 * Same sanitized overlay-state snapshot → four output channels.
 * Active only when MIA_ENGINE2_STUB=1 and ?profile= is requested.
 */

const { stripValueFieldsForPublic } = require("../../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");

const PROFILE_IDS = Object.freeze(["main", "clean", "host", "game"]);

function pickCleanKojDisplay(kojDisplay) {
  if (!kojDisplay || typeof kojDisplay !== "object") return null;
  return {
    mood: kojDisplay.mood,
    scene: kojDisplay.scene,
    pose: kojDisplay.pose,
    celebrationFocus: kojDisplay.celebrationFocus || null
  };
}

function pickHostKojDisplay(kojDisplay) {
  if (!kojDisplay || typeof kojDisplay !== "object") return null;
  return {
    mood: kojDisplay.mood,
    scene: kojDisplay.scene,
    pose: kojDisplay.pose,
    comboMoment: kojDisplay.comboMoment || null,
    spamSession: kojDisplay.spamSession || null
  };
}

function applyOverlayProfile(baseBody, profile, options = {}) {
  const id = String(profile || "main").toLowerCase();
  if (!PROFILE_IDS.includes(id)) {
    throw new Error(`overlay profile: unknown "${profile}"`);
  }

  const body =
    baseBody && typeof baseBody === "object"
      ? stripValueFieldsForPublic(baseBody)
      : {};
  const updatedAt = body.updatedAt || Date.now();
  const activePlugin = options.activePlugin || null;

  switch (id) {
    case "main":
      return Object.freeze({
        ...body,
        engine2Profile: "main",
        profileChannel: "overlay-main"
      });

    case "clean":
      return Object.freeze({
        engine2Profile: "clean",
        profileChannel: "overlay-clean",
        updatedAt,
        kojDisplay: pickCleanKojDisplay(body.kojDisplay),
        miaOverlay: body.miaOverlay || null,
        kojnozoutOverlay: body.kojnozoutOverlay || null,
        kojnozroutOverlay: body.kojnozroutOverlay || null,
        recentGifts: Array.isArray(body.recentGifts) ? body.recentGifts.slice(0, 3) : [],
        chatFeed: Array.isArray(body.chatFeed) ? body.chatFeed.slice(0, 2) : [],
        spamSession: body.spamSession
          ? {
              active: Boolean(body.spamSession.active),
              waveLabel: body.spamSession.waveLabel || null,
              comboTier: body.spamSession.comboTier || null
            }
          : null,
        giftEconomy: body.giftEconomy
          ? { miaPoints: body.giftEconomy.miaPoints ?? 0 }
          : null,
        theme: body.theme || null
      });

    case "host":
      return Object.freeze({
        engine2Profile: "host",
        profileChannel: "host-producer",
        updatedAt,
        obsConnected: body.obsConnected,
        voicePlayback: body.voicePlayback || null,
        video: body.video
          ? {
              processing: Boolean(body.video.processing),
              currentPlayback: body.video.currentPlayback || null
            }
          : null,
        spamSession: body.spamSession || null,
        runtimeAudit: body.runtimeAudit || null,
        theme: body.theme || null,
        interpreter: body.interpreter || null,
        ui: body.ui || null,
        kojDisplay: pickHostKojDisplay(body.kojDisplay),
        arena: body.arena || null,
        debug: Object.freeze({
          queueDepth:
            body.voicePlayback?.queueLength ??
            body.voicePlayback?.speakQueueLength ??
            0,
          health: body.obsConnected ? "ok" : "obs_disconnected"
        })
      });

    case "game":
      return Object.freeze({
        engine2Profile: "game",
        profileChannel: "plugin-game",
        updatedAt,
        gameChannel: Object.freeze({
          active: Boolean(activePlugin),
          pluginId: activePlugin?.manifestId || activePlugin?.id || null,
          phase: activePlugin ? "ready" : "idle",
          version: activePlugin?.version || null,
          note: activePlugin ? null : "Load a plugin via admin API (E4 stub)"
        })
      });

    default:
      return Object.freeze({ engine2Profile: id, updatedAt });
  }
}

function buildProfileRouteUrls(baseUrl = "http://127.0.0.1:3000") {
  const root = String(baseUrl || "").replace(/\/$/, "");
  const routes = {};
  for (const profile of PROFILE_IDS) {
    routes[profile] = `${root}/overlay-state?profile=${profile}`;
  }
  return Object.freeze(routes);
}

module.exports = {
  PROFILE_IDS,
  applyOverlayProfile,
  buildProfileRouteUrls
};
