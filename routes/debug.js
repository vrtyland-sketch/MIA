"use strict";

const { validateApp, safeString } = require("./_helpers");

function registerDebugRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    debugRouteGuard,
    handleDebugComment,
    handleDebugGift,
    capybaraFlowModule,
    applyWorldModeChange,
    getOutputState,
    getKojnozoutState,
    ecosystemState,
    giftVisualComposerModule,
    overlayStateModule,
    overlayState,
    MIA_SPLIT_OVERLAYS,
    viewerStoryModule,
    overlayStateCache,
    processEvent,
    safeRequire,
    activateComboMoment,
    activateBossCinematic,
    writeLog,
    MIA_OVERLAY_BASE,
    storyAnimationEngineModule,
    storyVideoEngineModule,
    miaEyes,
    runtimeConfig,
    videoEngine,
    ensureObsConnectedWithRetry,
    executeOverlay
  } = ctx;

  app.get("/test", debugRouteGuard, handleDebugComment);
  app.get("/test/comment", debugRouteGuard, handleDebugComment);
  app.get("/test/gift", debugRouteGuard, handleDebugGift);

  app.get("/debug/comment", debugRouteGuard, handleDebugComment);
  app.post("/debug/comment", debugRouteGuard, handleDebugComment);

  app.get("/debug/gift", debugRouteGuard, handleDebugGift);
  app.post("/debug/gift", debugRouteGuard, handleDebugGift);

  app.get("/capybara/test", debugRouteGuard, async (req, res) => {
    if (typeof capybaraFlowModule.startCapybaraFlow !== "function") {
      return res.status(503).json({ ok: false, error: "capybara_flow_missing" });
    }

    try {
      const away =
        safeString(req.query?.away).toLowerCase() === "1" ||
        safeString(req.query?.away).toLowerCase() === "true";

      if (away) {
        await applyWorldModeChange("nejsem_tu", "capybara_test");
      }

      const kojnozoutState = getKojnozoutState();
      const session = capybaraFlowModule.startCapybaraFlow(getOutputState(), {
        gifterLabel: safeString(req.query?.user, "Test Gifter"),
        giftName: safeString(req.query?.gift, "Kapybara"),
        giftKey: "animal_small",
        kojMood: safeString(req.query?.mood, kojnozoutState?.mood || "happy"),
        primaryNeed: safeString(req.query?.need, "happy"),
        awayMode:
          away ||
          (typeof capybaraFlowModule.resolveAwayMode === "function"
            ? capybaraFlowModule.resolveAwayMode({
                outputState: getOutputState(),
                ecosystemState
              })
            : false)
      });

      res.json({
        ok: true,
        session,
        snapshot:
          typeof capybaraFlowModule.getCapybaraSnapshot === "function"
            ? capybaraFlowModule.getCapybaraSnapshot(getOutputState())
            : null,
        hint: "Po ~20s MIA vyzve chat; pak POST /ingest s COMMENT odpoví capybara reply.",
        overlayStateUrl: "http://127.0.0.1:3000/overlay-state"
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/gift-visual/test", async (req, res) => {
    if (typeof giftVisualComposerModule.composeGiftMoment !== "function") {
      return res.status(503).json({ ok: false, error: "gift_visual_composer_missing" });
    }

    try {
      const composed = await giftVisualComposerModule.composeGiftMoment({
        userLabel: safeString(req.query?.user, "Test Gifter"),
        giftName: safeString(req.query?.gift, "Rose"),
        tier: safeString(req.query?.tier, "T2").toUpperCase(),
        effectProgram: safeString(req.query?.program, "flower_support"),
        kojMood: safeString(req.query?.mood, "excited"),
        thankText: safeString(req.query?.text, "")
      });

      if (typeof overlayStateModule.setGiftVisual === "function") {
        overlayStateModule.setGiftVisual(overlayState, {
          imageUrl: composed.imageUrl,
          text: composed.lines?.[0],
          subtext: composed.lines?.[1],
          userLabel: safeString(req.query?.user, "Test Gifter"),
          giftName: safeString(req.query?.gift, "Rose"),
          tier: safeString(req.query?.tier, "T2"),
          variantIndex: composed.variantIndex,
          effectProgram: composed.effectProgram,
          avatarLoaded: composed.avatarLoaded,
          expiresAt: composed.expiresAt
        });
      }

      res.json({
        ok: true,
        overlayUrl: MIA_SPLIT_OVERLAYS().giftMoment,
        ...composed
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/story/test", debugRouteGuard, async (req, res) => {
    if (typeof viewerStoryModule.publishViewerStorySpotlight !== "function") {
      return res.status(503).json({ ok: false, error: "viewer_story_missing" });
    }

    try {
      const userLabel = safeString(req.query?.user, "Test Fan");
      const tier = safeString(req.query?.tier, "T3").toUpperCase();
      const result = await viewerStoryModule.publishViewerStorySpotlight({
        userLabel,
        tier,
        giftName: safeString(req.query?.gift, "Galaxy"),
        avatarUrl: safeString(req.query?.avatar),
        env: process.env,
        setStoryVisual: (visual) => {
          if (typeof overlayStateModule.setStoryVisual === "function") {
            overlayStateModule.setStoryVisual(overlayState, visual);
            if (overlayStateCache && typeof overlayStateCache.invalidate === "function") {
              overlayStateCache.invalidate();
            }
          }
        }
      });

      res.json({
        ok: result?.ok === true,
        result,
        overlay: "http://127.0.0.1:3000/story-moment-overlay.html",
        overlayState: "http://127.0.0.1:3000/overlay-state"
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/t0/test", debugRouteGuard, async (req, res) => {
    const eventType = safeString(req.query?.event, "FOLLOW").toUpperCase();
    const userLabel = safeString(req.query?.user, "Test Fan");

    try {
      const result = await processEvent({
        platform: "debug",
        rawType: eventType.toLowerCase(),
        eventType,
        type: eventType,
        user: { userId: `t0_test_${Date.now()}`, nickname: userLabel },
        message: eventType === "COMMENT" ? safeString(req.query?.message, "Ahoj MIA!") : undefined
      });

      res.json({
        ok: true,
        eventType,
        userLabel,
        result: result?.body || result,
        overlayState: "http://127.0.0.1:3000/overlay-state",
        audit: "http://127.0.0.1:3000/overlay-state -> runtimeAudit"
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/boss-cinematic/test", debugRouteGuard, async (req, res) => {
    try {
      const tier = safeString(req.query?.tier, "T5").toUpperCase();
      const userLabel = safeString(req.query?.user, "Test Fan");
      const giftName = safeString(req.query?.gift, "Galaxy");
      const comboMod = safeRequire("./scripts/MIA_COMBO_OVERLAY", {});
      const cinematicMod = safeRequire("./scripts/MIA_BOSS_CINEMATIC", {});

      if (typeof comboMod.buildBossComboMoment !== "function") {
        return res.status(503).json({ ok: false, error: "combo_overlay_missing" });
      }

      const combo = comboMod.buildBossComboMoment({
        streamTier: tier,
        bossEvent: tier === "T6" ? "legend_event" : "mega_boss",
        bossBanner: tier === "T6" ? "LEGENDA STREAMU" : "MEGA BOSS",
        giftName
      });

      if (!combo) {
        return res.status(400).json({ ok: false, error: "boss_combo_unavailable", tier });
      }

      activateComboMoment(combo);

      const cinematic =
        typeof cinematicMod.buildBossCinematicPayload === "function"
          ? cinematicMod.buildBossCinematicPayload(combo, { userLabel, giftName, streamTier: tier })
          : null;

      if (cinematic) {
        activateBossCinematic(cinematic);
      }

      writeLog("mia-events", {
        ts: Date.now(),
        stage: "boss_cinematic_test",
        tier,
        userLabel,
        giftName,
        cinematic: Boolean(cinematic)
      });

      const base = typeof MIA_OVERLAY_BASE === "function" ? MIA_OVERLAY_BASE() : "";
      res.json({
        ok: true,
        tier,
        userLabel,
        giftName,
        combo,
        bossCinematic: cinematic,
        overlay: `${base}/overlay-state`,
        layers: {
          combo: `${base}/combo-overlay.html`,
          cinematic: `${base}/boss-cinematic-overlay.html`
        },
        replay: `/boss-cinematic/test?tier=${encodeURIComponent(tier)}&user=${encodeURIComponent(userLabel)}&gift=${encodeURIComponent(giftName)}&fresh=${Date.now()}`
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/story-animation/test", debugRouteGuard, async (req, res) => {
    try {
      const userLabel = safeString(req.query?.user, "Karel");
      const story =
        typeof storyAnimationEngineModule.findStory === "function"
          ? storyAnimationEngineModule.findStory(safeString(req.query?.story, "sock_rocket_saga"))
          : null;

      if (!story) {
        return res.status(404).json({ ok: false, error: "story_not_found" });
      }

      const mode = safeString(req.query?.mode, "video").toLowerCase();

      if (mode === "png" || mode === "slideshow") {
        if (typeof storyAnimationEngineModule.composeStoryAnimation !== "function") {
          return res.status(503).json({ ok: false, error: "story_animation_engine_missing" });
        }

        const composed = await storyAnimationEngineModule.composeStoryAnimation({
          userLabel,
          avatarUrl: safeString(req.query?.avatar),
          story,
          feedCount: Number(req.query?.feeds || 3),
          milestone: Number(req.query?.feeds || 3),
          isRepeat: String(req.query?.repeat || "").trim() === "1"
        });

        if (typeof overlayStateModule.setStoryVisual === "function") {
          overlayStateModule.setStoryVisual(overlayState, {
            playbackId: composed.playbackId,
            storyId: composed.storyId,
            title: composed.title,
            intro: composed.intro,
            outro: composed.outro,
            userLabel: composed.userLabel,
            feedCount: composed.feedCount,
            milestone: composed.milestone,
            isRepeat: composed.isRepeat,
            frames: composed.frames,
            frameMs: composed.frameMs,
            avatarLoaded: composed.avatarLoaded,
            expiresAt: composed.expiresAt
          });
        }

        return res.json({
          ok: true,
          deliveryMode: "png_slideshow",
          overlayUrl: MIA_SPLIT_OVERLAYS().storyMoment,
          ...composed
        });
      }

      if (!storyVideoEngineModule || typeof storyVideoEngineModule.buildStoryVideoPlan !== "function") {
        return res.status(503).json({ ok: false, error: "story_video_engine_missing" });
      }

      if (miaEyes && typeof miaEyes.scanCatalog === "function") {
        await miaEyes.scanCatalog({ force: true });
      }

      const plan = storyVideoEngineModule.buildStoryVideoPlan(
        story,
        runtimeConfig,
        userLabel,
        miaEyes
      );
      const shouldPlay =
        String(req.query?.play || "").trim() === "1" ||
        String(req.query?.play || "").trim().toLowerCase() === "true";

      if (shouldPlay) {
        if (!videoEngine || typeof videoEngine.playSpecialEvent !== "function") {
          return res.status(503).json({ ok: false, error: "video_engine_unavailable" });
        }

        const obsReady = await ensureObsConnectedWithRetry(
          "story_animation_test",
          runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
        );

        if (!obsReady.ok) {
          return res.status(503).json({
            ok: false,
            error: "obs_not_connected",
            plan,
            hint: "Spusť OBS a použij ?play=1 pro přehrání gift videí."
          });
        }

        if (typeof overlayStateModule.clearStoryVisual === "function") {
          overlayStateModule.clearStoryVisual(overlayState);
        }

        const result = await storyVideoEngineModule.playStoryVideoSequence({
          story,
          userLabel,
          runtimeConfig,
          videoEngine,
          miaEyes,
          executeOverlay,
          normalizedEvent: {
            eventType: "STORY_TEST",
            platform: "mia",
            user: { nickname: userLabel, username: userLabel },
            message: `story_test:${story.id}`
          }
        });

        return res.json({
          ok: result?.ok === true,
          deliveryMode: "obs_video",
          plan,
          eyes: miaEyes && typeof miaEyes.getSnapshot === "function" ? miaEyes.getSnapshot() : null,
          result
        });
      }

      return res.json({
        ok: true,
        deliveryMode: "obs_video_plan",
        storyId: story.id,
        userLabel,
        plan,
        eyes: miaEyes && typeof miaEyes.getSnapshot === "function" ? miaEyes.getSnapshot() : null,
        hint: "Přidej ?play=1 pro přehrání přes OBS gift videa (T1–T4). MIA oči skenují OBS před výběrem.",
        testPlayUrl: `/story-animation/test?user=${encodeURIComponent(userLabel)}&story=${encodeURIComponent(story.id)}&play=1`
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "GET /test",
      "GET /test/comment",
      "GET /test/gift",
      "GET /debug/comment",
      "POST /debug/comment",
      "GET /debug/gift",
      "POST /debug/gift",
      "GET /capybara/test",
      "GET /gift-visual/test",
      "GET /story/test",
      "GET /t0/test",
      "GET /boss-cinematic/test",
      "GET /story-animation/test"
    ]
  };
}

module.exports = { registerDebugRoutes };
