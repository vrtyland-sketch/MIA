"use strict";

/**
 * Engine 2.0 — optional admin wiring (MIA_ENGINE2_STUB=1 only).
 */

const { isEngine2StubEnabled } = require("./flag");
const { createEngine2Pipeline } = require("./index");
const { createStubState } = require("./event-applicator");
const { ingestNormalizedEvent } = require("./event-bus-stub");
const { routeObsProjection } = require("./obs-router-boundary");
const { applyOverlayProfile, PROFILE_IDS, buildProfileRouteUrls } = require("./overlay-profiles");
const { getPluginLoader } = require("./plugin-loader");

const SAMPLE_EVENTS = Object.freeze([
  {
    source: "tiktok",
    eventType: "GIFT",
    giftName: "Rose",
    coins: 10,
    repeatCount: 1,
    uniqueId: "engine2_fan",
    nickname: "Engine2Fan"
  },
  {
    source: "kick",
    eventType: "COMMENT",
    message: "engine2 preview",
    username: "KickViewer"
  }
]);

function buildLoadersFromState(state) {
  return {
    loadKoj: () => state.koj,
    loadWorld: () => state.world,
    loadArena: () => state.arena,
    loadEconomy: () => state.economy,
    loadChat: () => state.chat,
    loadObs: () => state.obs,
    loadDebug: () => state.debug
  };
}

function buildEngine2AdminSnapshot(ctx = {}) {
  if (!isEngine2StubEnabled()) {
    return undefined;
  }

  const getKoj =
    typeof ctx.getKojnozoutState === "function"
      ? ctx.getKojnozoutState
      : () => ctx.refs?.kojnozoutState || null;

  const rawKoj = getKoj();
  const state = createStubState({
    koj: rawKoj ? { mood: rawKoj.mood || "calm", bowlPercent: rawKoj.bowlPercent } : undefined
  });

  const rawEvents = Array.isArray(ctx.engine2Events) ? ctx.engine2Events : SAMPLE_EVENTS;
  const busLog = [];
  for (const raw of rawEvents) {
    const { normalized, result } = ingestNormalizedEvent(state, raw);
    busLog.push({
      eventType: normalized.eventType,
      eventId: normalized.eventId,
      platform: normalized.platform,
      applied: result.applied === true,
      reason: result.reason || null
    });
  }

  const pipeline = createEngine2Pipeline({ loaders: buildLoadersFromState(state) });

  const projections = {};
  for (const platform of pipeline.renderer.renderAll()) {
    projections[platform.platform] = platform.payload;
  }

  const obsRender = pipeline.render("obs");
  const obsRoute = routeObsProjection(obsRender);

  const sampleOverlay = {
    updatedAt: Date.now(),
    kojDisplay: { mood: state.koj?.mood || "calm", scene: "main", pose: "idle" },
    miaOverlay: null,
    chatFeed: state.chat?.recent || [],
    recentGifts: state.economy?.recentGifts || [],
    spamSession: { active: false },
    giftEconomy: { miaPoints: state.economy?.miaPoints ?? 0 },
    obsConnected: true,
    voicePlayback: { queueLength: 0 },
    theme: { enabled: false, id: "cyber", cssVars: null }
  };

  const loader = getPluginLoader();
  const activePlugin = loader.getActivePlugin();

  const overlayProfiles = {};
  for (const profileId of PROFILE_IDS) {
    overlayProfiles[profileId] = applyOverlayProfile(sampleOverlay, profileId, { activePlugin });
  }

  return {
    enabled: true,
    phase: "E4",
    version: pipeline.gameState.getSnapshot().version,
    projections,
    obsRoute,
    eventBus: {
      ingested: busLog.length,
      events: busLog
    },
    overlayProfiles,
    profileRoutes: buildProfileRouteUrls(
      ctx.baseUrl || process.env.MIA_PUBLIC_BASE_URL || "http://127.0.0.1:3000"
    ),
    plugins: loader.getSnapshot()
  };
}

module.exports = {
  buildEngine2AdminSnapshot,
  SAMPLE_EVENTS
};
