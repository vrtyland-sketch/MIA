"use strict";

const { validateApp, safeString } = require("./_helpers");

function registerSystemRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    localAdminGuard,
    selfRestartModule,
    ensureObsHands,
    ensureObsConnectedWithRetry,
    runtimeConfig,
    streamerIdentityModule,
    writeLog
  } = ctx;

  app.post("/system/obs-hands", localAdminGuard, async (req, res) => {
    const obsReady = await ensureObsConnectedWithRetry(
      "system_obs_hands",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );
    if (!obsReady.ok) {
      return res.status(503).json({ ok: false, error: "obs_not_connected" });
    }

    const onlyIds = Array.isArray(req.body?.onlyIds) ? req.body.onlyIds : null;
    try {
      const result = await ensureObsHands({
        onlyIds,
        restartReason: safeString(req.body?.reason, "obs_hands_api")
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/system/restart", localAdminGuard, (req, res) => {
    if (typeof selfRestartModule.scheduleInProcessRestart !== "function") {
      return res.status(503).json({ ok: false, error: "restart_unavailable" });
    }
    const restart = selfRestartModule.scheduleInProcessRestart(
      safeString(req.body?.reason, "system_restart_api")
    );
    res.json({ ok: true, restart });
  });

  app.get("/streamer/identity", (_req, res) => {
    if (typeof streamerIdentityModule.getIdentitySnapshot !== "function") {
      return res.status(500).json({ ok: false, error: "identity_module_missing" });
    }
    res.json({
      ok: true,
      identity: streamerIdentityModule.getIdentitySnapshot(runtimeConfig)
    });
  });

  app.post("/streamer/identity/reset", (_req, res) => {
    if (typeof streamerIdentityModule.clearPinnedBoss !== "function") {
      return res.status(500).json({ ok: false, error: "identity_module_missing" });
    }
    const cleared = streamerIdentityModule.clearPinnedBoss();
    writeLog("mia-events", { ts: Date.now(), stage: "streamer_identity_reset", cleared });
    res.json({
      ok: true,
      cleared,
      identity: streamerIdentityModule.getIdentitySnapshot(runtimeConfig)
    });
  });

  return {
    ok: true,
    routes: [
      "POST /system/obs-hands",
      "POST /system/restart",
      "GET /streamer/identity",
      "POST /streamer/identity/reset"
    ]
  };
}

module.exports = { registerSystemRoutes };
