"use strict";

const { validateApp } = require("./_helpers");

function registerSceneRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    localAdminGuard,
    immersiveSceneModule,
    streamerMattingModule,
    overlayStateModule,
    overlayState,
    obsStreamerCamerasModule,
    bossMissionModule,
    videoEngine,
    mattingIngestBridge,
    mediaCatalogModule,
    getObsConnected,
    getObs,
    exportPaintMultiCameraToBank,
    exportPaintFramesToBank,
    normalizeCameraList
  } = ctx;

  app.get("/mia/scene/catalog", localAdminGuard, (_req, res) => {
    if (typeof immersiveSceneModule.getSceneCatalog !== "function") {
      return res.status(500).json({ ok: false, error: "scene_module_missing" });
    }
    res.json(immersiveSceneModule.getSceneCatalog());
  });

  app.post("/mia/scene/resolve", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof immersiveSceneModule.resolveScene !== "function") {
      return res.status(500).json({ ok: false, error: "scene_module_missing" });
    }
    res.json(immersiveSceneModule.resolveScene(body));
  });

  app.post("/mia/scene/apply", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof immersiveSceneModule.applyImmersiveScene !== "function") {
      return res.status(500).json({ ok: false, error: "scene_module_missing" });
    }
    const applied = immersiveSceneModule.applyImmersiveScene(overlayState, body);
    res.json({ ok: true, immersiveScene: applied });
  });

  app.post("/mia/scene/clear", localAdminGuard, (_req, res) => {
    if (typeof immersiveSceneModule.clearImmersiveScene === "function") {
      immersiveSceneModule.clearImmersiveScene(overlayState);
    }
    if (typeof streamerMattingModule.clearMatteState === "function") {
      streamerMattingModule.clearMatteState();
    }
    res.json({ ok: true, cleared: true });
  });

  app.get("/mia/scene/cameras", localAdminGuard, (_req, res) => {
    if (typeof streamerMattingModule.getCameraRigStatus !== "function") {
      return res.status(500).json({ ok: false, error: "matting_module_missing" });
    }
    res.json(streamerMattingModule.getCameraRigStatus());
  });

  app.get("/mia/scene/cameras/ndi", localAdminGuard, async (_req, res) => {
    const obsClient =
      typeof getObs === "function" ? getObs() : ctx.obs;
    const connected =
      typeof getObsConnected === "function" ? getObsConnected() : Boolean(ctx.obsConnected);

    if (
      !connected ||
      !obsClient ||
      typeof obsStreamerCamerasModule.buildNdiManifest !== "function"
    ) {
      return res.status(503).json({ ok: false, error: "obs_not_connected" });
    }
    try {
      const inputList = await obsClient.call("GetInputList");
      const manifest = obsStreamerCamerasModule.buildNdiManifest(inputList?.inputs || []);
      res.json(manifest);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/boss-mission/catalog", localAdminGuard, (_req, res) => {
    if (typeof bossMissionModule.getBossMissionCatalog !== "function") {
      return res.status(503).json({ ok: false, error: "boss_mission_module_missing" });
    }
    res.json(bossMissionModule.getBossMissionCatalog());
  });

  app.post("/mia/boss-mission/resolve", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof bossMissionModule.resolveBossMission !== "function") {
      return res.status(503).json({ ok: false, error: "boss_mission_module_missing" });
    }
    res.json(bossMissionModule.resolveBossMission(body));
  });

  app.post("/mia/boss-mission/apply", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof bossMissionModule.applyBossMission !== "function") {
      return res.status(503).json({ ok: false, error: "boss_mission_module_missing" });
    }
    try {
      const applied = bossMissionModule.applyBossMission(overlayState, body, {
        activateCinematic: body.activateCinematic !== false
      });
      if (
        body.playVideo !== false &&
        applied?.playHint &&
        videoEngine &&
        typeof videoEngine.playSpecialEvent === "function"
      ) {
        await videoEngine.playSpecialEvent(body.tier || applied.playHint.tier, body, {
          sourceName: applied.playHint.sourceName,
          mediaRel: applied.playHint.mediaRel,
          reason: "boss_mission_apply",
          waitForMediaEnd: true
        });
      }
      res.json({ ok: applied.ok !== false, applied });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/boss-mission/clear", localAdminGuard, (_req, res) => {
    if (typeof bossMissionModule.clearBossMission !== "function") {
      return res.status(503).json({ ok: false, error: "boss_mission_module_missing" });
    }
    res.json(bossMissionModule.clearBossMission(overlayState));
  });

  app.get("/mia/scene/matte-state", (_req, res) => {
    if (typeof streamerMattingModule.getMatteState !== "function") {
      return res.status(500).json({ ok: false, error: "matting_module_missing" });
    }
    res.json(streamerMattingModule.getMatteState());
  });

  app.post("/mia/scene/matte/ingest", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof streamerMattingModule.ingestCameraFrame !== "function") {
      return res.status(500).json({ ok: false, error: "matting_module_missing" });
    }
    try {
      const sceneSnap =
        typeof overlayStateModule.getImmersiveSceneSnapshot === "function"
          ? overlayStateModule.getImmersiveSceneSnapshot(overlayState)
          : null;
      if (sceneSnap?.creature?.params) {
        body.creatureParams = sceneSnap.creature.params;
      }
      const result = await streamerMattingModule.ingestCameraFrame(body);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/scene/matte/ingest/status", localAdminGuard, (_req, res) => {
    if (!mattingIngestBridge || typeof mattingIngestBridge.getStatus !== "function") {
      return res.status(503).json({ ok: false, error: "matting_ingest_bridge_missing" });
    }
    res.json(mattingIngestBridge.getStatus());
  });

  app.post("/mia/scene/matte/ingest/tick", localAdminGuard, async (_req, res) => {
    if (!mattingIngestBridge || typeof mattingIngestBridge.tick !== "function") {
      return res.status(503).json({ ok: false, error: "matting_ingest_bridge_missing" });
    }
    try {
      const result = await mattingIngestBridge.tick({ force: true });
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/scene/matte/ingest/enable", localAdminGuard, (req, res) => {
    if (!mattingIngestBridge || typeof mattingIngestBridge.setEnabled !== "function") {
      return res.status(503).json({ ok: false, error: "matting_ingest_bridge_missing" });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const enabled = body.enabled !== false;
    res.json(mattingIngestBridge.setEnabled(enabled));
  });

  return {
    ok: true,
    routes: [
      "GET /mia/scene/catalog",
      "POST /mia/scene/resolve",
      "POST /mia/scene/apply",
      "POST /mia/scene/clear",
      "GET /mia/scene/cameras",
      "GET /mia/scene/cameras/ndi",
      "GET /mia/boss-mission/catalog",
      "POST /mia/boss-mission/resolve",
      "POST /mia/boss-mission/apply",
      "POST /mia/boss-mission/clear",
      "GET /mia/scene/matte-state",
      "POST /mia/scene/matte/ingest",
      "GET /mia/scene/matte/ingest/status",
      "POST /mia/scene/matte/ingest/tick",
      "POST /mia/scene/matte/ingest/enable"
    ],
    mediaCatalogModule
  };
}

module.exports = { registerSceneRoutes };
