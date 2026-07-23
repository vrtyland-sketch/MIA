"use strict";

const { validateApp, safeString } = require("./_helpers");

function registerObsRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    fixObsOverlayBrowserLayouts,
    fixObsOverlaySceneTransforms,
    ensureObsVoiceBrowserReady,
    auditObsMiaBrowserSources,
    refreshObsMiaBrowserSources,
    ensureObsStreamerCameras,
    buildObsHealthSnapshot,
    forceReconnectObs,
    getObsConnected,
    getObs,
    ensureObsConnectedWithRetry,
    runtimeConfig,
    spawnSync
  } = ctx;

  const isObsConnected =
    typeof getObsConnected === "function" ? getObsConnected : () => Boolean(ctx.obsConnected);
  const obsClient = typeof getObs === "function" ? getObs : () => ctx.obs;

  app.get("/obs/fix-overlays", async (_req, res) => {
    try {
      const layout = await fixObsOverlayBrowserLayouts();
      const transforms = await fixObsOverlaySceneTransforms();
      const voice = await ensureObsVoiceBrowserReady();
      const audit = await auditObsMiaBrowserSources();
      const refreshed = await refreshObsMiaBrowserSources();
      res.json({
        ok: layout.ok === true,
        layout,
        transforms,
        voice,
        refreshed,
        audit,
        hint:
          "OBS layout srovnán. MIA_VOICE se během TTS nerefreshuje — jen audio route."
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/obs/ensure-voice", async (req, res) => {
    try {
      const forceRefresh = safeString(req.query?.force).toLowerCase() === "1";
      const voice = await ensureObsVoiceBrowserReady({ forceRefresh });
      const audit = await auditObsMiaBrowserSources();
      res.json({
        ok: voice.ok === true,
        voice,
        audit,
        hint: forceRefresh
          ? "Voice browser refresh pouze když MIA zrovna nemluví (?force=1)."
          : "Audio route only — bez refresh browseru během streamu."
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/obs/ensure-streamer-cameras", async (_req, res) => {
    try {
      const rig = await ensureObsStreamerCameras();
      res.json({
        ok: rig.ok !== false,
        rig,
        hint:
          "Vytvoří MIA_CAM_02..06 + MIA_IMMERSIVE_SCENE. CAM_01 = existující NOTEBOOK_CAMERA pokud je ve scéně."
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/obs/overlay-audit", async (_req, res) => {
    try {
      const audit = await auditObsMiaBrowserSources();
      res.json({
        ok: audit.ok === true,
        audit,
        hint:
          audit.doubleVisualRisk ||
          (audit.voiceSourceCount > 1
            ? "Smaž duplicitní voice browser source — nech jen jeden MIA_VOICE."
            : audit.doubleAudioRisk || "Voice: jeden zdroj, Control audio ON, Desktop MUTE.")
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/obs/reconnect", async (_req, res) => {
    try {
      const healthBefore = await buildObsHealthSnapshot();
      const result = await forceReconnectObs("http_reconnect");
      const healthAfter = await buildObsHealthSnapshot();
      res.json({
        ok: result.ok === true,
        obsConnected: result.obsConnected === true,
        attempts: result.attempts || 1,
        waitedMs: result.waitedMs || 0,
        obsHealth: healthAfter,
        hint: result.ok
          ? "OBS WebSocket připojeno."
          : healthBefore.fix || "Spusť OBS a zapni WebSocket server na portu 4455."
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/obs/fix-layout", (_req, res) => {
    if (typeof ctx.runObsMaintenanceScript !== "function") {
      return res.status(503).json({ ok: false, error: "obs_maintenance_unavailable" });
    }
    try {
      const result = ctx.runObsMaintenanceScript("obs_fix_overlay_layout.js");
      const stdout = safeString(result.stdout);
      if (result.status !== 0) {
        return res.status(500).json({
          ok: false,
          error: safeString(result.stderr, stdout || "fix_layout_failed")
        });
      }
      let body = null;
      try {
        body = JSON.parse(stdout.trim());
      } catch (_err) {
        body = { ok: true, raw: stdout.slice(-800) };
      }
      res.json(body);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/obs/refresh-overlays", (_req, res) => {
    if (typeof ctx.runObsMaintenanceScript !== "function") {
      return res.status(503).json({ ok: false, error: "obs_maintenance_unavailable" });
    }
    try {
      const result = ctx.runObsMaintenanceScript("obs_refresh_overlays.js");
      const stdout = safeString(result.stdout);
      if (result.status !== 0) {
        return res.status(500).json({
          ok: false,
          error: safeString(result.stderr, stdout || "refresh_overlays_failed")
        });
      }
      let body = null;
      try {
        body = JSON.parse(stdout.trim());
      } catch (_err) {
        body = { ok: true, raw: stdout.slice(-800) };
      }
      res.json(body);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/obs/prep-stream", async (_req, res) => {
    if (typeof ctx.runObsMaintenanceScript !== "function") {
      return res.status(503).json({ ok: false, error: "obs_maintenance_unavailable" });
    }
    try {
      const steps = [];
      if (
        isObsConnected() &&
        obsClient() &&
        typeof ctx.obsFixLayoutModule?.applyObsOverlayLayout === "function"
      ) {
        const layout = await ctx.obsFixLayoutModule.applyObsOverlayLayout(obsClient(), {
          sceneName: safeString(runtimeConfig?.obs?.sceneName) || "SPINAK_ENGINE_GIFTS",
          platform: process.env.MIA_STREAM_PLATFORM || "auto",
          kickBridge: Boolean(runtimeConfig?.kick?.enabled),
          layoutContext:
            typeof ctx.buildVisionContext === "function" ? ctx.buildVisionContext() : {}
        });
        steps.push({ step: "vision_layout", ok: layout.ok === true, layout });
      } else {
        const layout = ctx.runObsMaintenanceScript("obs_fix_overlay_layout.js");
        steps.push({
          step: "vision_layout",
          ok: layout.status === 0,
          raw: safeString(layout.stdout).slice(-800)
        });
      }

      const camera = ctx.runObsMaintenanceScript("obs_verify_camera.js");
      steps.push({
        step: "camera",
        ok: camera.status === 0,
        raw: safeString(camera.stdout).slice(-400)
      });

      const refresh = ctx.runObsMaintenanceScript("obs_refresh_overlays.js");
      steps.push({
        step: "refresh_overlays",
        ok: refresh.status === 0,
        raw: safeString(refresh.stdout).slice(-400)
      });

      const ok = steps.every((row) => row.ok);
      res.status(ok ? 200 : 500).json({ ok, steps });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/obs/revive-voice", async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const speaker =
        safeString(body.speaker || req.query?.tts || "mia").toLowerCase() === "koj" ||
        safeString(body.speaker).toLowerCase() === "kojnozout"
          ? "koj"
          : "mia";
      const { reviveObsVoice } = require("../scripts/obs_revive_voice");
      const report = await reviveObsVoice({
        tts: speaker,
        skipTts: body.skipTts === true
      });
      res.status(report.ok ? 200 : 500).json(report);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "GET /obs/fix-overlays",
      "GET /obs/ensure-voice",
      "GET /obs/ensure-streamer-cameras",
      "GET /obs/overlay-audit",
      "GET /obs/reconnect",
      "POST /obs/fix-layout",
      "POST /obs/refresh-overlays",
      "POST /obs/prep-stream",
      "POST /obs/revive-voice"
    ]
  };
}

module.exports = { registerObsRoutes };
