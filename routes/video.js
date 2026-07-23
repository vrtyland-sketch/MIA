"use strict";

const { validateApp, safeString } = require("./_helpers");

function registerVideoRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    videoEngine,
    ensureObsConnectedWithRetry,
    runtimeConfig,
    bowlFullVideoModule,
    safeObsCall,
    miaEyes,
    deliverActionVoice,
    getVoicePlaybackSnapshot,
    speakerRoutingModule
  } = ctx;

  app.get("/video/test", async (req, res) => {
    if (!videoEngine || typeof videoEngine.enqueueGiftPlayback !== "function") {
      res.status(503).json({ ok: false, error: "video_engine_unavailable" });
      return;
    }

    const specialMode = safeString(req.query?.special || req.query?.mode, "").toLowerCase();
    const tier = safeString(req.query?.tier, "T1").toUpperCase();
    const obsReady = await ensureObsConnectedWithRetry(
      "video_test",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );

    if (!obsReady.ok) {
      return res.status(503).json({
        ok: false,
        error: "obs_not_connected",
        obsConnected: false,
        hint: "Spusť OBS Studio, Tools → WebSocket Server Settings → Enable, port 4455.",
        giftScene: runtimeConfig?.obs?.sceneName || "SPINAK_ENGINE_GIFTS"
      });
    }

    const testEvent = {
      eventType: "gift",
      platform: "test",
      user: "video_test",
      username: "video_test",
      giftName: "VideoTest",
      test: true
    };

    try {
      if (
        (specialMode === "bowl" || specialMode === "bowl-full" || specialMode === "bowlfull") &&
        typeof videoEngine.playSpecialEvent === "function"
      ) {
        const bowlCfg =
          typeof bowlFullVideoModule.getBowlFullConfig === "function"
            ? bowlFullVideoModule.getBowlFullConfig(runtimeConfig)
            : { preferredTier: "T4", specialSources: [] };
        const sourceName = bowlCfg.specialSources?.[0] || "";

        const result = await videoEngine.playSpecialEvent(
          bowlCfg.preferredTier || "T4",
          testEvent,
          {
            sourceName: sourceName || undefined,
            reason: "bowl_full_test",
            waitForMediaEnd: false
          }
        );

        return res.json({
          ok: true,
          mode: "special",
          tier: bowlCfg.preferredTier || "T4",
          sourceName: result?.sourceName || sourceName,
          giftScene: runtimeConfig?.obs?.sceneName || "SPINAK_ENGINE_GIFTS",
          result,
          hint: "T4 special pro plnou misku. Pouzij ?special=bowl nebo ?mode=bowl-full."
        });
      }

      const result = await videoEngine.enqueueGiftPlayback(tier, testEvent);

      let poolSize = null;
      let catalogTotal = null;
      try {
        const mediaCatalog = require("../scripts/MIA_MEDIA_CATALOG");
        const catalog =
          typeof mediaCatalog.loadCatalog === "function" ? mediaCatalog.loadCatalog() : null;
        const pools = catalog?.tierRotationPools || catalog?.intelligence?.byTier || {};
        const tierPool = pools[tier] || pools[tier.toLowerCase()];
        poolSize = Array.isArray(tierPool)
          ? tierPool.length
          : Number(tierPool?.count || tierPool?.pool) || null;
        catalogTotal = Array.isArray(catalog?.items)
          ? catalog.items.filter((x) => x.kind === "videos" || x.type === "video").length
          : null;
      } catch (_err) {
        /* optional */
      }

      res.json({
        ok: true,
        tier,
        poolSize,
        catalogTotal,
        giftScene: runtimeConfig?.obs?.sceneName || "SPINAK_ENGINE_GIFTS",
        autoSwitchProgramScene: runtimeConfig?.obs?.autoSwitchProgramScene !== false,
        result,
        hint:
          "Rotace bere celý pool tieru (ne jen 31 idle slotů). Opakuj /video/test?tier=T5 pro další klipy z velké knihovny."
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/video/library", (_req, res) => {
    try {
      const mediaCatalog = require("../scripts/MIA_MEDIA_CATALOG");
      const catalog =
        typeof mediaCatalog.loadCatalog === "function" ? mediaCatalog.loadCatalog() : null;
      if (!catalog) {
        return res.status(503).json({ ok: false, error: "catalog_missing" });
      }
      const pools = catalog.tierRotationPools || {};
      const byTier = {};
      for (const [tier, pool] of Object.entries(pools)) {
        byTier[tier] = Array.isArray(pool) ? pool.length : 0;
      }
      const videos = Array.isArray(catalog.items)
        ? catalog.items.filter((x) => x.kind === "videos" || x.type === "video")
        : [];
      const assigned = Array.isArray(catalog.obsAssignments) ? catalog.obsAssignments.length : 0;
      res.json({
        ok: true,
        videosInCatalog: videos.length,
        obsIdleSlots: assigned,
        rotatableNotIdleBound: Math.max(0, videos.length - assigned),
        byTier,
        playTest: {
          T1: "/video/test?tier=T1",
          T3: "/video/test?tier=T3",
          T5: "/video/test?tier=T5",
          PROFILE: "/video/test?tier=PROFILE"
        },
        note:
          "Všechna katalogová videa rotují při giftech. Idle OBS má jen 31 pinů — zbytek se binduje za běhu."
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/gift/voice-test", async (_req, res) => {
    try {
      const shadow = require("../MIA_NEXT/engine_shadow_runtime");
      const gift = {
        eventType: "GIFT",
        type: "GIFT",
        route: "support",
        user: { username: "VoiceTest", nickname: "Voice Test" },
        support: { giftName: "Rose", tier: "T1", coins: 1, repeatCount: 1 },
        message: "voice test",
        source: "test",
        platform: "tiktok"
      };

      const pipeline = shadow.runShadowPipeline({
        rawEvent: gift,
        normalizedEvent: gift,
        streamState: { audience: { viewerCount: 18 } },
        outputState: {},
        kojnozoutState: { bowlPercent: 12 },
        runtimeConfig,
        ecosystemState: {}
      });

      let actionResult = pipeline?.actionResult || pipeline || {};
      actionResult = await deliverActionVoice(actionResult);

      const vp = getVoicePlaybackSnapshot();
      res.json({
        ok: Boolean(vp?.audioUrl),
        voicePlan:
          typeof speakerRoutingModule.resolveVoiceDeliveryPlan === "function"
            ? speakerRoutingModule.resolveVoiceDeliveryPlan(pipeline?.actionResult || pipeline || {})
            : null,
        voicePlayback: vp,
        meta: actionResult?.meta || null,
        hint: "Měl by mluvit Koj (kojnozout). V OBS: mia-voice-overlay.html + Control audio ON."
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/video/diag", async (_req, res) => {
    const giftScene = runtimeConfig?.obs?.sceneName || "SPINAK_ENGINE_GIFTS";
    const sampleSource = runtimeConfig?.obs?.tierSources?.T1?.[0] || "T1_VIDEO_01";

    try {
      const programScene = await safeObsCall("GetCurrentProgramScene");
      const sceneList = await safeObsCall("GetSceneList");
      const sceneItems = await safeObsCall("GetSceneItemList", { sceneName: giftScene });
      const inputSettings = await safeObsCall("GetInputSettings", { inputName: sampleSource });

      res.json({
        ok: true,
        giftScene,
        sampleSource,
        autoSwitchProgramScene: runtimeConfig?.obs?.autoSwitchProgramScene !== false,
        programScene: programScene?.response || programScene,
        sceneList: sceneList?.response?.scenes || sceneList?.response || null,
        giftSceneItems: sceneItems?.response?.sceneItems || sceneItems?.response || null,
        sampleInputSettings: inputSettings?.response || inputSettings,
        videoEngine:
          videoEngine && typeof videoEngine.getSnapshot === "function"
            ? videoEngine.getSnapshot()
            : null,
        miaEyes: miaEyes && typeof miaEyes.getSnapshot === "function" ? miaEyes.getSnapshot() : null
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "GET /video/test",
      "GET /video/library",
      "GET /gift/voice-test",
      "GET /video/diag"
    ]
  };
}

module.exports = { registerVideoRoutes };
