"use strict";

const { validateApp, safeString } = require("./_helpers");
const { getPublicKojSnapshot } = require("../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");

function registerKojRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    localAdminGuard,
    kojTestModeModule,
    kojnozoutVitalsModule,
    kojnozoutPersistenceModule,
    kojnozoutModule,
    streamState,
    getStreamState,
    getKojnozoutState,
    setKojnozoutState,
    runtimeConfig,
    streamerShowcaseModule,
    executeOverlay,
    overlayStateModule,
    overlayState,
    videoEngine,
    kojnozoutDuelModule,
    getDuelState,
    setDuelState,
    scheduleWorldSave,
    speakMiaShowcaseLine,
    writeLog
  } = ctx;

  function buildPublicKojState(state) {
    const liveStreamState =
      typeof getStreamState === "function" ? getStreamState() : streamState;
    const raw =
      typeof kojnozoutModule.getKojnozoutSnapshot === "function"
        ? kojnozoutModule.getKojnozoutSnapshot(state, liveStreamState)
        : state;
    return getPublicKojSnapshot(raw);
  }

  app.get("/koj/snapshot", localAdminGuard, (_req, res) => {
    try {
      res.json({
        ok: true,
        kojnozoutState: buildPublicKojState(getKojnozoutState())
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/koj/wake", localAdminGuard, (_req, res) => {
    try {
      if (typeof kojTestModeModule.wakeKojState !== "function") {
        return res.status(500).json({ ok: false, error: "koj_test_mode_missing" });
      }

      const next = kojTestModeModule.wakeKojState(getKojnozoutState(), kojnozoutVitalsModule);
      setKojnozoutState(next);

      if (typeof kojnozoutPersistenceModule.scheduleSaveKojnozoutState === "function") {
        kojnozoutPersistenceModule.scheduleSaveKojnozoutState(next);
      }

      res.json({
        ok: true,
        kojnozoutState: buildPublicKojState(next)
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/koj/test-mode", (req, res) => {
    try {
      const body = req.body || {};
      if (body.enabled === undefined) {
        return res.status(400).json({ ok: false, error: "enabled_required" });
      }

      if (typeof kojTestModeModule.setKojTestModeOverride !== "function") {
        return res.status(500).json({ ok: false, error: "koj_test_mode_missing" });
      }

      kojTestModeModule.setKojTestModeOverride(Boolean(body.enabled));

      res.json({
        ok: true,
        kojTestMode: kojTestModeModule.getKojTestModeSnapshot(process.env, runtimeConfig)
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/showcase/start", localAdminGuard, async (req, res) => {
    try {
      const body = req.body || {};
      const parsed =
        typeof streamerShowcaseModule.parseStreamerShowcaseCommand === "function"
          ? streamerShowcaseModule.parseStreamerShowcaseCommand(
              safeString(body.message, "mia pust testy")
            ) || {
              mode: body.itemId ? "single" : "full",
              itemId: safeString(body.itemId) || null,
              raw: "showcase_api"
            }
          : null;

      if (!parsed) {
        return res.status(400).json({ ok: false, error: "invalid_showcase_request" });
      }

      if (body.itemId) {
        parsed.mode = "single";
        parsed.itemId = safeString(body.itemId);
      }

      const snapshot =
        typeof streamerShowcaseModule.getShowcaseSnapshot === "function"
          ? streamerShowcaseModule.getShowcaseSnapshot()
          : null;

      if (snapshot?.active) {
        return res.status(409).json({ ok: false, error: "showcase_busy", showcase: snapshot });
      }

      const userLabel = safeString(body.userLabel, "VasaSpinak");

      void streamerShowcaseModule
        .runShowcaseSequence(parsed, {
          userLabel,
          normalized: { message: body.message || "mia pust testy", eventType: "COMMENT" },
          runtimeConfig,
          env: process.env,
          executeOverlay,
          overlayStateModule,
          overlayState,
          videoEngine,
          kojTestModeModule,
          kojnozoutVitalsModule,
          kojnozoutDuelModule,
          getKojState: getKojnozoutState,
          setKojState: setKojnozoutState,
          getDuelState,
          setDuelState,
          scheduleWorldSave
        })
        .catch((err) => {
          writeLog("mia-errors", {
            source: "streamer_showcase_api",
            error: err.message
          });
        });

      res.json({
        ok: true,
        queued: true,
        mode: parsed.mode,
        itemId: parsed.itemId || null,
        showcase:
          typeof streamerShowcaseModule.getShowcaseSnapshot === "function"
            ? streamerShowcaseModule.getShowcaseSnapshot()
            : null
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/showcase/koj-states", localAdminGuard, async (req, res) => {
    try {
      if (typeof streamerShowcaseModule.runKojStateShowcase !== "function") {
        return res.status(500).json({ ok: false, error: "koj_state_showcase_missing" });
      }

      const body = req.body || {};
      const snapshot =
        typeof streamerShowcaseModule.getShowcaseSnapshot === "function"
          ? streamerShowcaseModule.getShowcaseSnapshot()
          : null;

      if (snapshot?.active) {
        return res.status(409).json({ ok: false, error: "showcase_busy", showcase: snapshot });
      }

      const userLabel = safeString(body.userLabel, "VasaSpinak");

      void streamerShowcaseModule
        .runKojStateShowcase({
          userLabel,
          runtimeConfig,
          executeOverlay,
          speakLine: speakMiaShowcaseLine
        })
        .catch((err) => {
          writeLog("mia-errors", { source: "koj_state_showcase_api", error: err.message });
        });

      res.json({
        ok: true,
        queued: true,
        kind: "koj_state_showcase",
        states:
          typeof streamerShowcaseModule.listKojStateShowcase === "function"
            ? streamerShowcaseModule.listKojStateShowcase()
            : []
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/showcase/koj-states", (_req, res) => {
    res.json({
      ok: true,
      states:
        typeof streamerShowcaseModule.listKojStateShowcase === "function"
          ? streamerShowcaseModule.listKojStateShowcase()
          : []
    });
  });

  return {
    ok: true,
    routes: [
      "GET /koj/snapshot",
      "POST /koj/wake",
      "POST /koj/test-mode",
      "POST /showcase/start",
      "POST /showcase/koj-states",
      "GET /showcase/koj-states"
    ]
  };
}

module.exports = { registerKojRoutes };
