"use strict";

const { validateApp, safeString } = require("./_helpers");

const kojRenderReport = { last: null, receivedAt: 0 };
const speechRenderReport = { last: null, receivedAt: 0 };

function registerEyesRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const path = require("path");
  const express = require("express");
  const stagingStaticRoot = path.join(__dirname, "..", "data", "mia-ai-animations");
  app.use("/assets/mia-ai-staging", express.static(stagingStaticRoot));

  const {
    localAdminGuard,
    miaEyes,
    miaEyesModule,
    displayVisionModule,
    ensureObsConnectedWithRetry,
    runtimeConfig,
    safeObsCall,
    obsVision,
    obsVisionModule,
    buildVisionContext,
    animationEngineModule,
    overlayStateModule,
    overlayState,
    getOverlayState,
    invalidateOverlayStateCache
  } = ctx;

  async function captureSourceCoverage(sourceName, w, h) {
    if (typeof miaEyesModule.analyzePngBase64Coverage !== "function") return null;
    const shot = await safeObsCall("GetSourceScreenshot", {
      sourceName,
      imageFormat: "png",
      imageWidth: Math.max(8, Math.round(w || 320)),
      imageHeight: Math.max(8, Math.round(h || 320))
    });
    const imageData = shot?.response?.imageData || shot?.imageData || "";
    if (!shot?.ok || !imageData) {
      return { ok: false, reason: shot?.reason || "no_image" };
    }
    return miaEyesModule.analyzePngBase64Coverage(imageData, { minCoverage: 0.006 });
  }

  app.get("/mia/eyes", async (_req, res) => {
    if (!miaEyes) {
      return res.status(503).json({ ok: false, error: "mia_eyes_unavailable" });
    }

    try {
      const view = await miaEyes.getPlaybackView({ includeMedia: true });
      res.json({
        ok: true,
        snapshot: miaEyes.getSnapshot(),
        view
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/eyes/scan", async (req, res) => {
    if (!miaEyes || typeof miaEyes.scanCatalog !== "function") {
      return res.status(503).json({ ok: false, error: "mia_eyes_unavailable" });
    }

    const obsReady = await ensureObsConnectedWithRetry(
      "mia_eyes_scan",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );

    if (!obsReady.ok) {
      return res.status(503).json({
        ok: false,
        error: "obs_not_connected",
        hint: "Spusť OBS a zapni WebSocket na portu 4455."
      });
    }

    try {
      const force = String(req.query?.force || "").trim() === "1";
      const scan = await miaEyes.scanCatalog({ force });
      const view = await miaEyes.getPlaybackView({ includeMedia: true, forceScan: force });
      res.json({ ok: true, scan, view, snapshot: miaEyes.getSnapshot() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/eyes/away", async (req, res) => {
    if (!miaEyes || typeof miaEyes.scanAwayScene !== "function") {
      return res.status(503).json({ ok: false, error: "mia_eyes_away_unavailable" });
    }

    const obsReady = await ensureObsConnectedWithRetry(
      "mia_eyes_away",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );

    if (!obsReady.ok) {
      return res.status(503).json({
        ok: false,
        error: "obs_not_connected",
        hint: "Spusť OBS + npm run obs:apply-away-eyes"
      });
    }

    try {
      const force = String(req.query?.force || "").trim() === "1";
      const away = await miaEyes.scanAwayScene({
        force,
        sceneName: safeString(req.query?.scene) || undefined
      });
      res.json({
        ok: away.ok === true,
        away,
        snapshot: miaEyes.getSnapshot()
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/koj/render-report", (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    kojRenderReport.last = body;
    kojRenderReport.receivedAt = Date.now();
    res.json({ ok: true });
  });

  app.get("/mia/koj/render-report", (_req, res) => {
    const now = Date.now();
    const ageMs = kojRenderReport.receivedAt ? now - kojRenderReport.receivedAt : null;
    res.json({
      ok: !!kojRenderReport.last,
      ageMs,
      stale: ageMs == null || ageMs > 6000,
      report: kojRenderReport.last,
      receivedAt: kojRenderReport.receivedAt || null
    });
  });

  app.get("/mia/animation/bank", (_req, res) => {
    if (typeof animationEngineModule.loadBankIndex !== "function") {
      return res.status(503).json({ ok: false, error: "animation_engine_unavailable" });
    }
    try {
      const bank = animationEngineModule.loadBankIndex();
      res.json({ ok: true, bank });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/build", localAdminGuard, async (_req, res) => {
    try {
      const { buildAnimationBank } = require("../scripts/build_animation_bank");
      const result = await buildAnimationBank({ force: true, seed: true });
      res.json({ ok: true, result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/export-paint", localAdminGuard, async (req, res) => {
    try {
      const {
        exportPaintFramesToBank,
        exportPaintMultiCameraToBank,
        normalizeCameraList
      } = require("../scripts/export_paint_to_animation_bank");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const useMulti =
        body.multiCamera === true ||
        (body.framesByCamera && normalizeCameraList(body).length > 1);
      const result = useMulti
        ? await exportPaintMultiCameraToBank(body)
        : await exportPaintFramesToBank(body);
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/promote-ai", localAdminGuard, async (req, res) => {
    try {
      const { promoteAiAnimationToBank } = require("../shared/mia-animation-engine/promoteAiAnimation");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await promoteAiAnimationToBank(body);
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/mark-production", localAdminGuard, async (req, res) => {
    try {
      const { markBankClipProduction } = require("../shared/mia-animation-engine/promoteAiAnimation");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await markBankClipProduction(body);
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/animation/bank/operator", localAdminGuard, (_req, res) => {
    try {
      const { listBankOperatorClips } = require("../shared/mia-animation-engine/bankPreview");
      res.json(listBankOperatorClips());
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/animation/staging", localAdminGuard, (_req, res) => {
    try {
      const { listAiStagingClips } = require("../shared/mia-animation-engine/promoteAiAnimation");
      res.json(listAiStagingClips());
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/animation/staging/:stagingId/sheet", localAdminGuard, (req, res) => {
    try {
      const path = require("path");
      const fs = require("fs");
      const ROOT = path.resolve(__dirname, "..");
      const stagingId = String(req.params.stagingId || "")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 64);
      const sheetPath = path.join(ROOT, "data", "mia-ai-animations", stagingId, "built", "sprite_sheet.png");
      if (!stagingId || !fs.existsSync(sheetPath)) {
        return res.status(404).json({ ok: false, error: "sheet_not_found" });
      }
      res.type("png").sendFile(sheetPath);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/animation/staging/:stagingId", localAdminGuard, (req, res) => {
    try {
      const { getAiStagingClip } = require("../shared/mia-animation-engine/promoteAiAnimation");
      const includeFramesBase64 = String(req.query.frames || "1") !== "0";
      const result = getAiStagingClip({
        stagingId: req.params.stagingId,
        includeFramesBase64,
        maxFrames: req.query.maxFrames
      });
      res.status(result.ok ? 200 : 404).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/staging/:stagingId/save", localAdminGuard, async (req, res) => {
    try {
      const { writeAiStagingFrames } = require("../shared/mia-animation-engine/promoteAiAnimation");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await writeAiStagingFrames({
        ...body,
        stagingId: req.params.stagingId || body.stagingId
      });
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/staging/save", localAdminGuard, async (req, res) => {
    try {
      const { writeAiStagingFrames } = require("../shared/mia-animation-engine/promoteAiAnimation");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await writeAiStagingFrames(body);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/animation/staging/:stagingId/preview", localAdminGuard, (req, res) => {
    try {
      const { previewStagingClip } = require("../shared/mia-animation-engine/stagingPreview");
      const result = previewStagingClip({
        stagingId: req.params.stagingId,
        mood: req.query.mood
      });
      res.status(result.ok ? 200 : 404).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/staging/:stagingId/preview", localAdminGuard, async (req, res) => {
    try {
      const { pushStagingClipPreview, previewStagingClip } = require("../shared/mia-animation-engine/stagingPreview");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const stagingId = req.params.stagingId || body.stagingId;
      const push = body.push !== false;
      let result = push
        ? pushStagingClipPreview(
            { ...body, stagingId },
            {
              overlayStateModule,
              overlayState,
              getOverlayState: typeof getOverlayState === "function" ? getOverlayState : undefined,
              invalidateOverlayStateCache
            }
          )
        : previewStagingClip({ ...body, stagingId });

      let obsSync = { ok: false, skipped: true, reason: "sync_obs_disabled" };
      if (push && body.syncObs === true && result.bodyPreview?.parts) {
        try {
          const obsBodyPreview = require("../scripts/MIA_OBS_BODY_PREVIEW");
          obsSync = await obsBodyPreview.syncObsBodyPreviewVisibility({
            parts: result.bodyPreview.parts,
            sceneName: body.sceneName,
            port: Number(process.env.PORT) || 3000,
            bodySync: body.bodySync || "hybrid"
          });
        } catch (err) {
          obsSync = { ok: false, error: String(err?.message || err) };
        }
      }

      if (push) result = { ...result, obsSync };
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/staging/:stagingId/encode", localAdminGuard, async (req, res) => {
    try {
      const { encodeAiStagingPreview } = require("../shared/mia-animation-engine/stagingPreview");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await encodeAiStagingPreview({
        ...body,
        stagingId: req.params.stagingId || body.stagingId
      });
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/animation/staging/:stagingId/media", localAdminGuard, (req, res) => {
    try {
      const { listStagingMediaUrls } = require("../shared/mia-animation-engine/stagingPreview");
      const result = listStagingMediaUrls(req.params.stagingId);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/assemble", localAdminGuard, async (req, res) => {
    try {
      const { assembleStagingClips } = require("../shared/mia-animation-engine/stagingPreview");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await assembleStagingClips(body);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/animation/bank/preview", localAdminGuard, (req, res) => {
    try {
      const { previewBankClip } = require("../shared/mia-animation-engine/bankPreview");
      const result = previewBankClip({
        clipId: req.query.clipId || req.query.id,
        giftKey: req.query.giftKey
      });
      res.status(result.ok ? 200 : 404).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/bank/preview", localAdminGuard, async (req, res) => {
    try {
      const { pushBankClipPreview, previewBankClip } = require("../shared/mia-animation-engine/bankPreview");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const push = body.push !== false;
      let result = push
        ? pushBankClipPreview(body, {
            overlayStateModule,
            overlayState,
            getOverlayState: typeof getOverlayState === "function" ? getOverlayState : undefined,
            invalidateOverlayStateCache
          })
        : previewBankClip(body);

      let obsSync = { ok: false, skipped: true, reason: "sync_obs_disabled" };
      if (push && body.syncObs === true && result.bodyPreview?.parts) {
        try {
          const obsBodyPreview = require("../scripts/MIA_OBS_BODY_PREVIEW");
          obsSync = await obsBodyPreview.syncObsBodyPreviewVisibility({
            parts: result.bodyPreview.parts,
            sceneName: body.sceneName,
            port: Number(process.env.PORT) || 3000,
            bodySync: body.bodySync || "hybrid"
          });
        } catch (err) {
          obsSync = { ok: false, error: String(err?.message || err) };
        }
      }

      if (push) result = { ...result, obsSync };
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/animation/bank/bind-gift-keys", localAdminGuard, async (req, res) => {
    try {
      const { bindGiftKeysToClip } = require("../shared/mia-animation-engine/promoteAiAnimation");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await bindGiftKeysToClip(body);
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/speech/render-report", (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    speechRenderReport.last = body;
    speechRenderReport.receivedAt = Date.now();
    res.json({ ok: true });
  });

  app.get("/mia/speech/render-report", (_req, res) => {
    const now = Date.now();
    const ageMs = speechRenderReport.receivedAt ? now - speechRenderReport.receivedAt : null;
    res.json({
      ok: !!speechRenderReport.last,
      ageMs,
      stale: ageMs == null || ageMs > 6000,
      report: speechRenderReport.last,
      receivedAt: speechRenderReport.receivedAt || null
    });
  });

  app.get("/mia/display/self-check", async (req, res) => {
    if (!displayVisionModule || typeof displayVisionModule.analyzeLayout !== "function") {
      return res.status(503).json({ ok: false, error: "display_vision_unavailable" });
    }
    const sceneName =
      safeString(req.query?.scene) ||
      safeString(runtimeConfig?.obs?.sceneName) ||
      "SPINAK_ENGINE_GIFTS";
    const useEyes = String(req.query?.eyes ?? "1").trim() !== "0";

    const obsReady = await ensureObsConnectedWithRetry(
      "mia_display_self_check",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );
    if (!obsReady.ok) {
      return res.status(503).json({ ok: false, error: "obs_not_connected" });
    }

    try {
      const canvas = await displayVisionModule.readCanvas(safeObsCall);
      const items = await displayVisionModule.readSceneLayout(safeObsCall, sceneName);
      const findings = displayVisionModule.analyzeLayout(items, canvas);

      const sources = {};
      if (useEyes) {
        for (const it of items) {
          const reg = displayVisionModule.registryForName(it.name) || {};
          if (!reg.persistent || reg.invisible || !it.enabled || !it.rect) continue;
          try {
            const cov = await captureSourceCoverage(it.name, it.rect.w, it.rect.h);
            if (cov && cov.ok) {
              sources[reg.key] = { coverage: cov.coverage, blank: cov.blank, bbox: cov.bbox };
              if (cov.blank) {
                findings.push({
                  level: "warn",
                  key: reg.key,
                  msg: `${reg.role} je sice zapnutý, ale zrak v něm nevidí žádný obsah (možná chybí PNG / prázdné).`
                });
              }
            }
          } catch (_e) {
            /* per-source zrak je best-effort */
          }
        }
      }

      const now = Date.now();
      const kojRR = kojRenderReport.last
        ? { ...kojRenderReport.last, ageMs: now - kojRenderReport.receivedAt }
        : null;
      const speechRR = speechRenderReport.last
        ? { ...speechRenderReport.last, ageMs: now - speechRenderReport.receivedAt }
        : null;
      if (kojRR && kojRR.actual?.brokenImage) {
        findings.push({
          level: "fail",
          key: "runtime",
          msg: `Koj: ROZBITÝ obrázek (${kojRR.actual.slotSrc}).`
        });
      }
      if (speechRR && speechRR.visible) {
        if (speechRR.anyOffscreen) {
          const o = speechRR.offscreen || {};
          findings.push({
            level: "warn",
            key: "speech",
            msg: `Bublina přetéká mimo svůj rámec (l${o.left || 0} t${o.top || 0} r${o.right || 0} b${o.bottom || 0}px) — část textu nemusí být vidět.`
          });
        }
        if (speechRR.textOverflow) {
          findings.push({
            level: "warn",
            key: "speech",
            msg: "Text v bublině se nevejde a ořezává se — zkrať text nebo zvětš bublinu."
          });
        }
        if (speechRR.holoOverlap) {
          findings.push({
            level: "warn",
            key: "speech",
            msg: "Bublina leží z velké části přes hologram MIA — text může být hůř čitelný."
          });
        }
        const speechItem = items.find((it) => it.key === "speech" && it.rect);
        const kojItem = items.find((it) => it.key === "runtime" && it.enabled && it.rect);
        const vp = speechRR.viewport;
        if (speechItem && kojItem && speechRR.bubble && vp && vp.w > 0 && vp.h > 0) {
          const sx = speechItem.rect.w / vp.w;
          const sy = speechItem.rect.h / vp.h;
          const bub = {
            left: speechItem.rect.left + speechRR.bubble.x * sx,
            top: speechItem.rect.top + speechRR.bubble.y * sy,
            w: speechRR.bubble.w * sx,
            h: speechRR.bubble.h * sy
          };
          bub.right = bub.left + bub.w;
          bub.bottom = bub.top + bub.h;
          const inter = displayVisionModule.intersectionArea(bub, kojItem.rect);
          const smaller = Math.min(
            displayVisionModule.rectArea(bub),
            displayVisionModule.rectArea(kojItem.rect)
          );
          const frac = smaller > 0 ? inter / smaller : 0;
          if (frac >= 0.2) {
            findings.push({
              level: "warn",
              key: "speech+runtime",
              msg: `Bublina se reálně překrývá s Kojem z ${(frac * 100).toFixed(0)} % — část bubliny/Koje je zakrytá.`
            });
          }
        }
      }

      const fails = findings.filter((f) => f.level === "fail").length;
      const warns = findings.filter((f) => f.level === "warn").length;
      const verdict = fails ? "FAIL" : warns ? "WARN" : "OK";

      res.json({
        ok: true,
        verdict,
        canvas,
        sceneName,
        counts: { fail: fails, warn: warns, total: findings.length },
        findings,
        layout: items.map((it) => ({
          key: it.key,
          name: it.name,
          enabled: it.enabled,
          rect: it.rect,
          index: it.index
        })),
        sources,
        proprioception: { koj: kojRR, speech: speechRR }
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/eyes/screenshot", async (req, res) => {
    if (!miaEyes || typeof miaEyes.captureScreenshot !== "function") {
      return res.status(503).json({ ok: false, error: "mia_eyes_unavailable" });
    }

    const obsReady = await ensureObsConnectedWithRetry(
      "mia_eyes_screenshot",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );

    if (!obsReady.ok) {
      return res.status(503).json({ ok: false, error: "obs_not_connected" });
    }

    try {
      const shot = await miaEyes.captureScreenshot({
        sourceName: safeString(req.query?.source),
        sceneName: safeString(req.query?.scene),
        save: String(req.query?.save || "1").trim() !== "0"
      });
      res.json({ ok: shot.ok === true, shot, snapshot: miaEyes.getSnapshot() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/eyes/webcam/sync", async (_req, res) => {
    if (!miaEyes || typeof miaEyes.syncWebcamVisibility !== "function") {
      return res.status(503).json({ ok: false, error: "mia_eyes_unavailable" });
    }

    const obsReady = await ensureObsConnectedWithRetry(
      "mia_eyes_webcam_sync",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );

    if (!obsReady.ok) {
      return res.status(503).json({ ok: false, error: "obs_not_connected" });
    }

    try {
      const webcam = await miaEyes.syncWebcamVisibility();
      res.json({ ok: webcam.ok === true, webcam, snapshot: miaEyes.getSnapshot() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/vision", async (_req, res) => {
    if (!obsVision) {
      return res.status(503).json({ ok: false, error: "mia_vision_unavailable" });
    }

    try {
      const snapshot = obsVision.getSnapshot();
      const context = buildVisionContext();
      res.json({
        ok: true,
        context,
        vision: snapshot,
        layoutMode:
          typeof obsVisionModule.resolveLayoutMode === "function"
            ? obsVisionModule.resolveLayoutMode(context)
            : snapshot.lastMode || "idle"
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/vision/tick", async (_req, res) => {
    if (!obsVision || typeof obsVision.tick !== "function") {
      return res.status(503).json({ ok: false, error: "mia_vision_unavailable" });
    }

    const obsReady = await ensureObsConnectedWithRetry(
      "mia_vision_tick",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );
    if (!obsReady.ok) {
      return res.status(503).json({ ok: false, error: "obs_not_connected" });
    }

    try {
      const result = await obsVision.tick();
      res.json({ ok: result.ok === true, result, vision: obsVision.getSnapshot() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "GET /mia/eyes",
      "GET /mia/eyes/scan",
      "GET /mia/eyes/away",
      "POST /mia/koj/render-report",
      "GET /mia/koj/render-report",
      "GET /mia/animation/bank",
      "POST /mia/animation/build",
      "POST /mia/animation/export-paint",
      "POST /mia/animation/promote-ai",
      "POST /mia/animation/mark-production",
      "GET /mia/animation/bank/operator",
      "GET /mia/animation/staging",
      "GET /mia/animation/staging/:stagingId",
      "GET /mia/animation/staging/:stagingId/sheet",
      "POST /mia/animation/staging/:stagingId/save",
      "POST /mia/animation/staging/save",
      "GET /mia/animation/staging/:stagingId/preview",
      "POST /mia/animation/staging/:stagingId/preview",
      "POST /mia/animation/staging/:stagingId/encode",
      "GET /mia/animation/staging/:stagingId/media",
      "POST /mia/animation/assemble",
      "GET /mia/animation/bank/preview",
      "POST /mia/animation/bank/preview",
      "POST /mia/animation/bank/bind-gift-keys",
      "POST /mia/speech/render-report",
      "GET /mia/speech/render-report",
      "GET /mia/display/self-check",
      "GET /mia/eyes/screenshot",
      "POST /mia/eyes/webcam/sync",
      "GET /mia/vision",
      "POST /mia/vision/tick"
    ]
  };
}

module.exports = { registerEyesRoutes };
