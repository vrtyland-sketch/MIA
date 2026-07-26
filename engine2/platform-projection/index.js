"use strict";

/**
 * Engine 2.0 — Platform Projection.
 * Maps visibility-filtered state into platform-specific presentation shapes.
 */

const PLATFORM_IDS = Object.freeze(["tiktok", "kick", "obs", "admin"]);

function projectTikTok(visible) {
  return Object.freeze({
    profile: "tiktok",
    channel: "overlay-main",
    koj: visible.koj || {},
    miaPoints: visible.economy?.miaPoints ?? 0,
    chat: visible.chat || { recent: [] },
    recentGifts: visible.recentGifts || []
  });
}

function projectKick(visible) {
  return Object.freeze({
    profile: "kick",
    channel: "kick-chat",
    kojMood: visible.koj?.mood || "calm",
    miaPoints: visible.economy?.miaPoints ?? 0,
    chat: visible.chat || { recent: [] }
  });
}

function projectObs(visible) {
  return Object.freeze({
    profile: "obs",
    channel: "obs-render",
    renderIntent: {
      scene: visible.obs?.scene || "main",
      mediaQueue: visible.obs?.mediaQueue || []
    },
    kojMood: visible.koj?.mood || "calm"
  });
}

function projectAdmin(visible) {
  return Object.freeze({
    profile: "admin",
    channel: "host-producer",
    debug: visible.debug || {},
    koj: visible.koj || {},
    arena: visible.arena || {},
    queueDepth: visible.debug?.queueDepth ?? 0,
    health: visible.debug?.health || "ok"
  });
}

const PROJECTORS = Object.freeze({
  tiktok: projectTikTok,
  kick: projectKick,
  obs: projectObs,
  admin: projectAdmin
});

function projectForPlatform(visibleState, platform) {
  const id = String(platform || "").toLowerCase();
  const projector = PROJECTORS[id];
  if (!projector) {
    throw new Error(`projection: unknown platform "${platform}"`);
  }
  return projector(visibleState);
}

module.exports = {
  PLATFORM_IDS,
  projectForPlatform,
  projectTikTok,
  projectKick,
  projectObs,
  projectAdmin
};
