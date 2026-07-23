"use strict";

/**
 * Status HTTP routes — /status, /gift-map/status (P2 architektura).
 */

function buildGiftMapStatusResponse(ctx = {}) {
  const {
    giftMapEnterprise,
    spamSessionEngine,
    streamSessionModule,
    getStreamSession,
    getLastGiftMapping,
    getOutputState
  } = ctx;

  const snap =
    typeof giftMapEnterprise?.getPublicSnapshot === "function"
      ? giftMapEnterprise.getPublicSnapshot(8)
      : null;
  const spamSession =
    typeof spamSessionEngine?.getSpamSessionState === "function"
      ? spamSessionEngine.getSpamSessionState()
      : null;
  const streamSession =
    typeof getStreamSession === "function" ? getStreamSession() : null;
  const lastGiftMapping =
    typeof getLastGiftMapping === "function" ? getLastGiftMapping() : null;
  const outputState =
    typeof getOutputState === "function" ? getOutputState() : null;

  return {
    ok: true,
    service: "MIA",
    giftMap: snap,
    streamSession:
      typeof streamSessionModule?.getSnapshot === "function"
        ? streamSessionModule.getSnapshot(streamSession)
        : { phase: streamSession?.phase || "PRELIVE" },
    lastMapping: lastGiftMapping
      ? {
          giftKey: lastGiftMapping.giftKey || null,
          giftName: lastGiftMapping.giftName || null,
          streamTier: lastGiftMapping.streamTier || null,
          coinTier: lastGiftMapping.coinTier || null,
          mapTier: lastGiftMapping.mapTier || null,
          care: lastGiftMapping.care || null,
          priority: lastGiftMapping.priority || null,
          streak: lastGiftMapping.streak || null,
          achievements: lastGiftMapping.achievements || [],
          overlayText: lastGiftMapping.overlayText || null
        }
      : null,
    spamWave: spamSession
      ? {
          active: Boolean(spamSession.active),
          eventCount: spamSession.eventCount || 0,
          totalPoints: spamSession.totalPoints || 0,
          nextRewardTier: spamSession.nextRewardTier || null,
          lastRewardTierGranted: spamSession.lastRewardTierGranted || null
        }
      : null,
    userThrottle: {
      trackedUsers: Object.keys(outputState?.userAckThrottle?.byUser || {}).length
    },
    catalogKeys:
      typeof giftMapEnterprise?.listCatalogKeys === "function"
        ? giftMapEnterprise.listCatalogKeys()
        : []
  };
}

function registerStatusRoutes(app, ctx = {}) {
  if (!app || typeof app.get !== "function") {
    return { ok: false, error: "invalid_app" };
  }

  app.get("/status", (_req, res) => {
    if (typeof ctx.buildMiaStatusResponse !== "function") {
      return res.status(503).json({ ok: false, error: "status_unavailable" });
    }
    res.json(ctx.buildMiaStatusResponse());
  });

  app.get("/gift-map/status", (_req, res) => {
    res.json(buildGiftMapStatusResponse(ctx));
  });

  app.get("/obs/live-manifest", (_req, res) => {
    if (typeof ctx.buildObsLiveManifest !== "function") {
      return res.status(503).json({ ok: false, error: "obs_manifest_unavailable" });
    }
    res.json({
      ok: true,
      manifest: ctx.buildObsLiveManifest()
    });
  });

  return {
    ok: true,
    routes: ["GET /status", "GET /gift-map/status", "GET /obs/live-manifest"],
    buildGiftMapStatusResponse: (overrideCtx = {}) =>
      buildGiftMapStatusResponse({ ...ctx, ...overrideCtx })
  };
}

module.exports = {
  registerStatusRoutes,
  buildGiftMapStatusResponse
};
