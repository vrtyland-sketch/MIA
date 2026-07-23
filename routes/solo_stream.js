"use strict";

const { validateApp } = require("./_helpers");

function registerSoloStreamRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    soloStreamModule,
    proactiveHostModule,
    streamState,
    getStreamState,
    getOutputState,
    overlayState,
    serverStartedAt,
    runtimeConfig,
    getKojnozoutState,
    buildSoloStreamSceneCtx,
    safeObsCall,
    writeLog
  } = ctx;

  app.get("/solo-stream/status", (_req, res) => {
    if (typeof soloStreamModule.getSoloStreamSnapshot !== "function") {
      return res.status(503).json({ ok: false, error: "solo_stream_unavailable" });
    }

    try {
      const liveStreamState =
        typeof getStreamState === "function" ? getStreamState() : streamState;
      const tick =
        typeof proactiveHostModule.evaluateProactiveHostTick === "function"
          ? proactiveHostModule.evaluateProactiveHostTick({
              streamState: liveStreamState,
              outputState: getOutputState(),
              overlayState,
              serverStartedAt,
              runtimeConfig,
              kojnozoutState: getKojnozoutState()
            })
          : null;

      res.json({
        ok: true,
        snapshot: soloStreamModule.getSoloStreamSnapshot(buildSoloStreamSceneCtx(tick)),
        proactiveTick: tick
          ? {
              behavior: tick.behavior,
              shouldSpeak: Boolean(tick.shouldSpeak),
              reason: tick.reason,
              quietMs: tick.quietMs,
              level: tick.level
            }
          : null
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/solo-stream/exit", async (_req, res) => {
    if (typeof soloStreamModule.applySoloStreamAction !== "function") {
      return res.status(503).json({ ok: false, error: "solo_stream_unavailable" });
    }

    try {
      const action = {
        action: "exit",
        reason: "manual_http",
        targetScene: null
      };
      const applied = await soloStreamModule.applySoloStreamAction(action, {
        safeObsCall,
        runtimeConfig,
        outputState: getOutputState(),
        writeLog
      });

      res.json({
        ok: applied?.applied === true,
        applied,
        snapshot:
          typeof soloStreamModule.getSoloStreamSnapshot === "function"
            ? soloStreamModule.getSoloStreamSnapshot(buildSoloStreamSceneCtx(null))
            : null
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: ["GET /solo-stream/status", "POST /solo-stream/exit"]
  };
}

module.exports = { registerSoloStreamRoutes };
