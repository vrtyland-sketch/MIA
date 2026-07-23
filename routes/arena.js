"use strict";

const path = require("path");
const { validateApp, safeString } = require("./_helpers");

function registerArenaRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    localAdminGuard,
    runtimeConfig,
    kojnozoutDuelModule,
    kojnozoutBackpackModule,
    platformArenaModule,
    kojRosterModule,
    arenaBattleDemo,
    scheduleWorldSave,
    getDuelState,
    setDuelState,
    getBackpackState,
    getArenaState,
    setArenaState,
    saveArenaState,
    lastDuelSyncSummary,
    MIA_SPLIT_OVERLAYS,
    overlayStaticDir,
    safeRequire
  } = ctx;

  app.post("/duel/start", localAdminGuard, (req, res) => {
    try {
      const body = req.body || {};
      const duelConfig = runtimeConfig?.duel || {};
      const durationSec = Number(
        body.durationSec || body.duration || duelConfig.defaultDurationSec || 300
      );

      if (typeof kojnozoutDuelModule.startDuel !== "function") {
        return res.status(500).json({ ok: false, error: "duel_module_missing" });
      }

      setDuelState(
        kojnozoutDuelModule.startDuel(getDuelState(), {
          opponentLabel: safeString(body.opponentLabel, "Soupeř"),
          opponentStreamId: safeString(body.opponentStreamId, "opponent"),
          localLabel: safeString(body.localLabel, duelConfig.localLabel || "Náš Kojnožrout"),
          localStreamId: safeString(body.localStreamId, duelConfig.localStreamId || "local"),
          durationMs: Math.max(30000, durationSec * 1000),
          opponentSeedPoints: Number(body.opponentSeedPoints || 0),
          peerUrl: safeString(body.peerUrl, duelConfig.peerUrl || "")
        })
      );
      scheduleWorldSave();

      res.json({
        ok: true,
        duel: kojnozoutDuelModule.getDuelSnapshot(getDuelState()),
        syncEnabled: Boolean(duelConfig.enabled && getDuelState().peerUrl)
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/duel/export", (_req, res) => {
    try {
      if (typeof kojnozoutDuelModule.exportLocalSide !== "function") {
        return res.status(500).json({ ok: false, error: "duel_module_missing" });
      }
      res.json({ ok: true, export: kojnozoutDuelModule.exportLocalSide(getDuelState()) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/duel/opponent-sync", (req, res) => {
    try {
      const peerExport = req.body?.export || req.body || {};
      if (typeof kojnozoutDuelModule.syncOpponentFromPeer !== "function") {
        return res.status(500).json({ ok: false, error: "duel_module_missing" });
      }
      const result = kojnozoutDuelModule.syncOpponentFromPeer(getDuelState(), peerExport);
      if (result?.state) {
        setDuelState(result.state);
        scheduleWorldSave();
      }
      res.json({
        ok: true,
        synced: Boolean(result?.synced),
        duel: kojnozoutDuelModule.getDuelSnapshot(getDuelState())
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/duel/opponent-points", (req, res) => {
    try {
      const points = Number(req.body?.points || req.body?.miaPoints || 0);
      if (typeof kojnozoutDuelModule.reportOpponentPoints !== "function") {
        return res.status(500).json({ ok: false, error: "duel_module_missing" });
      }
      setDuelState(kojnozoutDuelModule.reportOpponentPoints(getDuelState(), points));
      scheduleWorldSave();
      res.json({ ok: true, duel: kojnozoutDuelModule.getDuelSnapshot(getDuelState()) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/duel/finish", localAdminGuard, (_req, res) => {
    try {
      if (typeof kojnozoutDuelModule.finishDuel !== "function") {
        return res.status(500).json({ ok: false, error: "duel_module_missing" });
      }
      setDuelState(kojnozoutDuelModule.finishDuel(getDuelState()));
      scheduleWorldSave();
      res.json({ ok: true, duel: kojnozoutDuelModule.getDuelSnapshot(getDuelState()) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/duel/status", (_req, res) => {
    res.json({
      ok: true,
      duel:
        typeof kojnozoutDuelModule.getDuelSnapshot === "function"
          ? kojnozoutDuelModule.getDuelSnapshot(getDuelState())
          : null,
      backpack:
        typeof kojnozoutBackpackModule.getBackpackSnapshot === "function"
          ? kojnozoutBackpackModule.getBackpackSnapshot(getBackpackState())
          : null,
      arena:
        getArenaState() && typeof platformArenaModule.getArenaSnapshot === "function"
          ? platformArenaModule.getArenaSnapshot(getArenaState())
          : null,
      sync: lastDuelSyncSummary,
      syncConfig: {
        enabled: Boolean(runtimeConfig?.duel?.enabled),
        peerUrl: safeString(getDuelState()?.peerUrl || runtimeConfig?.duel?.peerUrl)
      }
    });
  });

  app.get("/arena/status", (_req, res) => {
    if (!getArenaState() || typeof platformArenaModule.getArenaSnapshot !== "function") {
      return res.status(503).json({ ok: false, error: "arena_missing" });
    }
    setArenaState(platformArenaModule.tickArena(getArenaState()));
    res.json({
      ok: true,
      arena: platformArenaModule.getArenaSnapshot(getArenaState()),
      roster: typeof kojRosterModule.listRoster === "function" ? kojRosterModule.listRoster() : null,
      rewardRules: {
        public: "Dárek zvyšuje šanci na odměnu.",
        internal: "gift_weight_only_never_say_paid",
        domains: ["combat", "play", "love", "items", "arena", "special"]
      }
    });
  });

  app.get("/arena/roster", (_req, res) => {
    res.json({
      ok: true,
      species: "coin_eater",
      note: "Kojnožrout = žrout coinů. Ne hrášek, ne roztomilá postavička.",
      roster: typeof kojRosterModule.listRoster === "function" ? kojRosterModule.listRoster() : []
    });
  });

  app.get("/kisstube/preview", (_req, res) => {
    res.sendFile(path.join(overlayStaticDir, "kisstube-preview.html"));
  });

  app.get("/arena/memorial", localAdminGuard, (_req, res) => {
    try {
      const memorial = safeRequire("./scripts/MIA_KISS_MEMORIAL", {});
      const identity =
        typeof platformArenaModule.getPlatformIdentity === "function"
          ? platformArenaModule.getPlatformIdentity("youtube")
          : null;
      res.json({
        ok: true,
        access: "discrete",
        identity,
        memorial:
          typeof memorial.getMemorialSnapshot === "function" ? memorial.getMemorialSnapshot() : null,
        previewPng: "/assets/kojnozrout/kisstube/koj-kisstube-preview.png",
        previewPage: "/kisstube/preview"
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/arena/duel/start", localAdminGuard, (req, res) => {
    try {
      if (!getArenaState() || typeof platformArenaModule.startArenaDuel !== "function") {
        return res.status(503).json({ ok: false, error: "arena_missing" });
      }
      const body = req.body || {};
      const durationSec = Number(body.durationSec || body.duration || 300);
      setArenaState(
        platformArenaModule.startArenaDuel(getArenaState(), {
          durationMs: Math.max(30000, durationSec * 1000)
        })
      );
      if (typeof kojnozoutDuelModule.startDuel === "function") {
        setDuelState(
          kojnozoutDuelModule.startDuel(getDuelState(), {
            localLabel: "Náš Kojnožrout",
            opponentLabel: "Aréna platforem",
            durationMs: Math.max(30000, durationSec * 1000)
          })
        );
      }
      saveArenaState(getArenaState());
      scheduleWorldSave();
      res.json({
        ok: true,
        arena: platformArenaModule.getArenaSnapshot(getArenaState()),
        duel: kojnozoutDuelModule.getDuelSnapshot?.(getDuelState()) || null
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/arena/tournament/start", localAdminGuard, (req, res) => {
    try {
      if (!getArenaState() || typeof platformArenaModule.startTournament !== "function") {
        return res.status(503).json({ ok: false, error: "arena_missing" });
      }
      const body = req.body || {};
      const durationMin = Number(body.durationMin || body.minutes || 30);
      setArenaState(
        platformArenaModule.startTournament(getArenaState(), {
          durationMs: Math.max(60000, durationMin * 60 * 1000),
          withDuel: body.withDuel !== false
        })
      );
      if (body.withDuel !== false && typeof kojnozoutDuelModule.startDuel === "function") {
        setDuelState(
          kojnozoutDuelModule.startDuel(getDuelState(), {
            localLabel: "Náš Kojnožrout",
            opponentLabel: "Turnaj platforem",
            durationMs: 300000
          })
        );
      }
      saveArenaState(getArenaState());
      scheduleWorldSave();
      res.json({ ok: true, arena: platformArenaModule.getArenaSnapshot(getArenaState()) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/arena/tournament/finish", localAdminGuard, (_req, res) => {
    try {
      if (!getArenaState() || typeof platformArenaModule.finishTournament !== "function") {
        return res.status(503).json({ ok: false, error: "arena_missing" });
      }
      setArenaState(platformArenaModule.finishTournament(getArenaState()));
      saveArenaState(getArenaState());
      res.json({ ok: true, arena: platformArenaModule.getArenaSnapshot(getArenaState()) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/arena/battle/demo", (_req, res) => {
    if (!arenaBattleDemo || typeof arenaBattleDemo.status !== "function") {
      return res.status(503).json({ ok: false, error: "battle_demo_missing" });
    }
    res.json({
      ok: true,
      demo: arenaBattleDemo.status(),
      arena:
        getArenaState() && typeof platformArenaModule.getArenaSnapshot === "function"
          ? platformArenaModule.getArenaSnapshot(getArenaState())
          : null,
      obs: {
        battleTest: MIA_SPLIT_OVERLAYS().arenaBattleTest,
        battle: MIA_SPLIT_OVERLAYS().arenaBattle,
        teamBar: MIA_SPLIT_OVERLAYS().arena,
        gfxRoster: MIA_SPLIT_OVERLAYS().gfxRoster,
        gfxForms: MIA_SPLIT_OVERLAYS().gfxForms,
        gfxItems: MIA_SPLIT_OVERLAYS().gfxItems,
        gfxEvolution: MIA_SPLIT_OVERLAYS().gfxEvolution
      }
    });
  });

  app.post("/arena/battle/demo/start", localAdminGuard, (req, res) => {
    try {
      if (!arenaBattleDemo || typeof arenaBattleDemo.start !== "function") {
        return res.status(503).json({ ok: false, error: "battle_demo_missing" });
      }
      const body = req.body || {};
      const demo = arenaBattleDemo.start(body, {
        getState: () => getArenaState(),
        setState: (next) => setArenaState(next),
        saveState: (next) => {
          saveArenaState(next);
          scheduleWorldSave();
        }
      });
      if (typeof kojnozoutDuelModule.startDuel === "function") {
        setDuelState(
          kojnozoutDuelModule.startDuel(getDuelState(), {
            localLabel: "Battle Demo",
            opponentLabel: "4 platformní žrouti",
            durationMs: Math.max(60000, Number(body.durationSec || 600) * 1000)
          })
        );
      }
      res.json({
        ok: true,
        demo,
        obs: {
          battleTest: MIA_SPLIT_OVERLAYS().arenaBattleTest,
          battle: MIA_SPLIT_OVERLAYS().arenaBattle,
          teamBar: MIA_SPLIT_OVERLAYS().arena
        },
        arena:
          getArenaState() && typeof platformArenaModule.getArenaSnapshot === "function"
            ? platformArenaModule.getArenaSnapshot(getArenaState())
            : null
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/arena/battle/demo/stop", localAdminGuard, (_req, res) => {
    try {
      if (!arenaBattleDemo || typeof arenaBattleDemo.stop !== "function") {
        return res.status(503).json({ ok: false, error: "battle_demo_missing" });
      }
      const demo = arenaBattleDemo.stop();
      res.json({ ok: true, demo });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "POST /duel/start",
      "GET /duel/export",
      "POST /duel/opponent-sync",
      "POST /duel/opponent-points",
      "POST /duel/finish",
      "GET /duel/status",
      "GET /arena/status",
      "GET /arena/roster",
      "GET /kisstube/preview",
      "GET /arena/memorial",
      "POST /arena/duel/start",
      "POST /arena/tournament/start",
      "POST /arena/tournament/finish",
      "GET /arena/battle/demo",
      "POST /arena/battle/demo/start",
      "POST /arena/battle/demo/stop"
    ]
  };
}

module.exports = { registerArenaRoutes };
