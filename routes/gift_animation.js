"use strict";

const { validateApp, safeString, mergeRoutes } = require("./_helpers");

/**
 * Gift animation API — generate / ask-words / status for stream OBS use.
 */

function registerGiftAnimationRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  let giftAnim = null;
  try {
    giftAnim = require("../shared/mia-gift-animation");
  } catch (err) {
    return { ok: false, error: err.message, routes: [] };
  }

  const localAdminGuard =
    typeof ctx.localAdminGuard === "function" ? ctx.localAdminGuard : (_req, _res, next) => next();

  // Bind overlay hooks once (idempotent).
  const ensureGiftAnimationObsVisible = async () => {
    if (typeof ctx.ensureGiftAnimationObsVisible === "function") {
      return ctx.ensureGiftAnimationObsVisible();
    }
    if (typeof ctx.getObsConnected === "function" && !ctx.getObsConnected()) return null;
    const safeObsCall =
      typeof ctx.safeObsCall === "function"
        ? ctx.safeObsCall
        : null;
    if (!safeObsCall) return null;
    const sourceName = "MIA_GIFT_ANIMATION";
    const sceneNames = [
      process.env.MIA_OBS_CAMERA_SCENE,
      "SPINAK_ENGINE_GIFTS",
      process.env.MIA_OBS_PROGRAM_SCENE
    ].filter(Boolean);
    try {
      if (!sceneNames.length) {
        const prog = await safeObsCall("GetCurrentProgramScene", {});
        const name = prog?.currentProgramSceneName;
        if (name) sceneNames.push(name);
      }
      const enabled = [];
      for (const sceneName of sceneNames) {
        const list = await safeObsCall("GetSceneItemList", { sceneName });
        const items = list?.sceneItems || [];
        const hit = items.find((i) => String(i?.sourceName || "") === sourceName);
        if (!hit) continue;
        if (!hit.sceneItemEnabled) {
          await safeObsCall("SetSceneItemEnabled", {
            sceneName,
            sceneItemId: hit.sceneItemId,
            sceneItemEnabled: true
          });
        }
        enabled.push({ sceneName, sceneItemId: hit.sceneItemId });
      }
      return { ok: true, enabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  giftAnim.bindOverlayHooks({
    getOverlayState: ctx.getOverlayState,
    overlayStateModule: ctx.overlayStateModule,
    invalidateOverlayStateCache: ctx.invalidateOverlayStateCache || ctx.overlay?.invalidateOverlayStateCache,
    writeLog: ctx.writeLog,
    ensureGiftAnimationObsVisible,
    scheduleObsBrowserRefresh:
      ctx.scheduleObsBrowserRefresh ||
      (typeof ctx.refreshObsMiaBrowserSources === "function"
        ? () => {
            void ctx.refreshObsMiaBrowserSources();
          }
        : null)
  });

  app.get("/api/gift-animation/status", (_req, res) => {
    giftAnim.pollChatFeedForWords();
    res.json(giftAnim.getStatus());
  });

  app.get("/api/gift-animation/config", (_req, res) => {
    res.json({ ok: true, config: giftAnim.getConfig() });
  });

  app.post("/api/gift-animation/config", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const next = giftAnim.saveDiskConfig(body);
    res.json({ ok: true, config: next });
  });

  app.post("/api/gift-animation/preview", (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    res.json(giftAnim.previewBrief(body));
  });

  app.post("/api/gift-animation/generate", localAdminGuard, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const mode = safeString(body.mode || body.flow, "generate");
      if (mode === "ask_words" || mode === "ask") {
        return res.json(giftAnim.startAskWords(body));
      }
      const result = await giftAnim.generateNow(body);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || "generate_failed" });
    }
  });

  app.post("/api/gift-animation/ask-words", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    res.json(giftAnim.startAskWords(body));
  });

  app.post("/api/gift-animation/words", localAdminGuard, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const words = safeString(body.words || body.extraWords || body.text);
      // Manual inject (dashboard / editor) — also try chat capture first.
      giftAnim.pollChatFeedForWords();
      if (giftAnim.getStatus().pendingAsk) {
        const out = await giftAnim.finalizeAskWords(words || null, {
          reason: words ? "manual_words" : "manual_improv"
        });
        return res.json(out);
      }
      return res.json({ ok: false, error: "no_pending_ask" });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || "words_failed" });
    }
  });

  app.get("/api/gift-animation/active", (_req, res) => {
    giftAnim.pollChatFeedForWords();
    const status = giftAnim.getStatus();
    res.json({
      ok: true,
      active: status.active,
      pendingAsk: status.pendingAsk
    });
  });

  app.get("/api/gift-animation/jobs", (_req, res) => {
    res.json({ ok: true, jobs: giftAnim.listRecentJobs(20) });
  });

  app.get("/api/gift-animation/jobs/:jobId", (req, res) => {
    const manifest = giftAnim.loadManifest(req.params.jobId);
    if (!manifest) return res.status(404).json({ ok: false, error: "not_found" });
    return res.json({ ok: true, manifest });
  });

  return {
    ok: true,
    routes: [
      "GET /api/gift-animation/status",
      "GET /api/gift-animation/config",
      "POST /api/gift-animation/config",
      "POST /api/gift-animation/preview",
      "POST /api/gift-animation/generate",
      "POST /api/gift-animation/ask-words",
      "POST /api/gift-animation/words",
      "GET /api/gift-animation/active",
      "GET /api/gift-animation/jobs",
      "GET /api/gift-animation/jobs/:jobId"
    ]
  };
}

module.exports = {
  registerGiftAnimationRoutes,
  mergeRoutes
};
