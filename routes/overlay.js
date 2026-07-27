"use strict";

const fs = require("fs");
const path = require("path");
const { validateApp, safeString } = require("./_helpers");

const RIG_ANCHOR_CHARS = new Set(["koj", "mia"]);

function registerOverlayRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    localAdminGuard,
    buildPublicOverlayStateResponse,
    overlayStateCache,
    buildOverlayStateCacheKey,
    setOverlay,
    refreshObsMiaBrowserSources,
    executeOverlay,
    clearOverlayState,
    resetOverlayState,
    PORT,
    overlayStaticDir
  } = ctx;

  const anchorsDir = overlayStaticDir
    ? path.join(overlayStaticDir, "anchors")
    : path.join(__dirname, "..", "mia-output-overlay", "anchors");

  app.get("/overlay-state", (req, res) => {
    const profile = safeString(req.query?.profile, "").toLowerCase();
    const useProfile = profile.length > 0;

    const body = useProfile
      ? buildPublicOverlayStateResponse()
      : overlayStateCache
        ? overlayStateCache.get(buildOverlayStateCacheKey(), buildPublicOverlayStateResponse)
        : buildPublicOverlayStateResponse();

    if (!useProfile) {
      return res.json(body);
    }

    try {
      const { isEngine2StubEnabled } = require("../engine2/flag");
      const { applyOverlayProfile, PROFILE_IDS } = require("../engine2/overlay-profiles");

      if (!isEngine2StubEnabled()) {
        return res.json(body);
      }

      if (!PROFILE_IDS.includes(profile)) {
        return res.status(400).json({
          ok: false,
          error: "unknown_profile",
          allowed: [...PROFILE_IDS]
        });
      }

      return res.json(applyOverlayProfile(body, profile));
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || "profile_failed" });
    }
  });

  app.get("/ping-overlay", async (_req, res) => {
    try {
      if (typeof executeOverlay !== "function") {
        return res.status(503).json({ ok: false, error: "overlay_unavailable" });
      }
      const result = await executeOverlay(
      {
        owner: "mia",
        route: "community",
        title: "MIA TEST",
        text: "Overlay funguje! Tento text by měl být vidět ~20 sekund.",
        subtext: new Date().toLocaleTimeString("cs-CZ"),
        mood: "warm",
        holdMs: 20000,
        priority: 6
      },
        { source: "ping_overlay", priority: 6, force: true }
      );
      res.json({
        ok: true,
        message: "Test overlay odeslán — refreshni OBS browser source pokud nic nevidíš",
        obsUrl: `http://127.0.0.1:${PORT}/mia-live-hub.html`,
        result
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/overlay/test", async (req, res) => {
    const testOverlay = setOverlay(
      {
        owner: "mia",
        route: "system",
        stage: "system",
        title: "MIA TEST",
        text: "Pokud vidis tento text, Browser Source funguje.",
        subtext: "Test z /overlay/test",
        holdMs: 30000
      },
      { force: true, holdMs: 30000 }
    );

    const refreshResult =
      req.query?.refresh === "1"
        ? await refreshObsMiaBrowserSources()
        : { ok: true, skipped: true, reason: "hub_poll_only" };

    res.json({
      ok: true,
      overlay: testOverlay,
      browserRefresh: refreshResult,
      openInBrowser: `http://127.0.0.1:${PORT || 3000}/mia-overlay.html`
    });
  });

  app.post("/overlay/clear", localAdminGuard, (_req, res) => {
    if (typeof ctx.resetOverlayState === "function") {
      ctx.resetOverlayState();
    }
    res.json({ ok: true });
  });

  app.get("/overlay/clear", (_req, res) => {
    if (typeof ctx.resetOverlayState === "function") {
      ctx.resetOverlayState();
    }
    res.json({ ok: true });
  });

  /**
   * Soft Neon Rig Desk — write anchors JSON next to static overlay assets.
   * Body: { characterId|character, artId?, idleAsset?, anchors|{…} }
   * Local-admin when guard is configured; still usable on loopback installs.
   */
  const saveRigAnchors = (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const characterId = safeString(
        body.characterId || body.character || body.id,
        ""
      ).toLowerCase();
      if (!RIG_ANCHOR_CHARS.has(characterId)) {
        return res.status(400).json({
          ok: false,
          error: "invalid_character",
          allowed: [...RIG_ANCHOR_CHARS]
        });
      }
      const anchors =
        body.anchors && typeof body.anchors === "object"
          ? body.anchors
          : body;
      if (!anchors.belly || !anchors.head || !anchors.neck) {
        return res.status(400).json({
          ok: false,
          error: "missing_anchors",
          need: ["belly", "head", "neck"]
        });
      }
      const doc = {
        version: Number(body.version) || 25,
        characterId,
        artId: safeString(body.artId, characterId),
        idleAsset: safeString(body.idleAsset, ""),
        note: safeString(body.note, ""),
        anchors: {
          belly: anchors.belly,
          head: anchors.head,
          neck: anchors.neck,
          root: anchors.root || { x: 0.5, y: 1 },
          body: anchors.body || anchors.torso || { x: 0.5, y: 0.7 }
        }
      };
      if (anchors.eye) doc.anchors.eye = anchors.eye;
      if (anchors.eyeOrganic) doc.anchors.eyeOrganic = anchors.eyeOrganic;
      if (anchors.hand) doc.anchors.hand = anchors.hand;

      fs.mkdirSync(anchorsDir, { recursive: true });
      const fileName = `${characterId}.json`;
      const filePath = path.join(anchorsDir, fileName);
      fs.writeFileSync(filePath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
      return res.json({
        ok: true,
        characterId,
        path: `/anchors/${fileName}`,
        absolutePath: filePath
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err.message || "write_failed"
      });
    }
  };

  if (typeof localAdminGuard === "function") {
    app.post("/api/rig-anchors", localAdminGuard, saveRigAnchors);
  } else {
    app.post("/api/rig-anchors", saveRigAnchors);
  }
  app.get("/api/rig-anchors/:characterId", (req, res) => {
    const characterId = safeString(req.params.characterId, "").toLowerCase();
    if (!RIG_ANCHOR_CHARS.has(characterId)) {
      return res.status(400).json({ ok: false, error: "invalid_character" });
    }
    const filePath = path.join(anchorsDir, `${characterId}.json`);
    try {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ ok: false, error: "not_found" });
      }
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return res.json({ ok: true, doc: raw });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "GET /overlay-state",
      "GET /ping-overlay",
      "GET /overlay/test",
      "POST /overlay/clear",
      "GET /overlay/clear",
      "POST /api/rig-anchors",
      "GET /api/rig-anchors/:characterId"
    ]
  };
}

module.exports = { registerOverlayRoutes };
