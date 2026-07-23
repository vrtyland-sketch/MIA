"use strict";

/**
 * MIA Paint HTTP routes — agent API + editor status.
 */

const path = require("path");
const pluginLoader = require("../scripts/MIA_PAINT_PLUGIN_LOADER");
const nativeBridge = require("../scripts/MIA_PAINT_NATIVE_BRIDGE");
const paintAiBridge = require("../scripts/MIA_PAINT_AI");
const graphicsAgent = require("../scripts/MIA_GRAPHICS_AGENT");

const PLUGINS_STATIC = path.join(__dirname, "..", "plugins", "mia-paint");

function registerMiaPaintRoutes(app, ctx = {}) {
  const { localAdminGuard, paintBridge, safeString, paintWs } = ctx;

  function notifyPaintWs() {
    if (typeof paintWs?.broadcastStatus === "function") {
      paintWs.broadcastStatus();
    }
  }

  if (!app || typeof app.get !== "function") {
    return { ok: false, error: "invalid_app" };
  }

  const bridge = paintBridge || {};

  app.get("/mia-paint", (_req, res) => {
    res.redirect(302, "/mia-paint/");
  });

  app.get("/mia/paint/status", localAdminGuard, (_req, res) => {
    if (typeof bridge.getPublicStatus !== "function") {
      return res.status(503).json({ ok: false, error: "paint_unavailable" });
    }
    res.json(bridge.getPublicStatus());
  });

  app.post("/mia/paint/connect", localAdminGuard, (req, res) => {
    if (typeof bridge.connectClient !== "function") {
      return res.status(503).json({ ok: false, error: "paint_unavailable" });
    }
    const clientId = safeString(req.body?.clientId, "");
    bridge.connectClient(clientId || undefined);
    notifyPaintWs();
    res.json(bridge.getPublicStatus());
  });

  app.post("/mia/paint/sync", localAdminGuard, (req, res) => {
    if (typeof bridge.updateFromClient !== "function") {
      return res.status(503).json({ ok: false, error: "paint_unavailable" });
    }
    bridge.updateFromClient(req.body && typeof req.body === "object" ? req.body : {});
    notifyPaintWs();
    res.json(bridge.getPublicStatus());
  });

  app.post("/mia/paint/command", localAdminGuard, async (req, res) => {
    if (typeof bridge.runCommand !== "function") {
      return res.status(503).json({ ok: false, error: "paint_unavailable" });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const runner =
      typeof bridge.runCommandAsync === "function" ? bridge.runCommandAsync.bind(bridge) : bridge.runCommand;
    const result = await runner(body);
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json({
      ...result,
      status: bridge.getPublicStatus()
    });
  });

  app.post("/mia/paint/autosave", localAdminGuard, (_req, res) => {
    if (typeof bridge.autosave !== "function") {
      return res.status(503).json({ ok: false, error: "paint_unavailable" });
    }
    res.json(bridge.autosave());
  });

  app.get("/mia/paint/export/svg", localAdminGuard, (_req, res) => {
    if (typeof bridge.exportSvg !== "function") {
      return res.status(503).json({ ok: false, error: "paint_unavailable" });
    }
    const result = bridge.exportSvg();
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.send(result.svg);
  });

  app.get("/mia/paint/plugins", localAdminGuard, (_req, res) => {
    const plugins = pluginLoader.discoverPlugins();
    res.json({
      ok: true,
      count: plugins.length,
      plugins: plugins.map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        hooks: p.hooks,
        permissions: p.permissions,
        scriptUrl: p.scriptUrl
      }))
    });
  });

  app.get("/mia/paint/plugins/:id", localAdminGuard, (req, res) => {
    const plugin = pluginLoader.getPluginScript(safeString(req.params.id, ""));
    if (!plugin) return res.status(404).json({ ok: false, error: "plugin_not_found" });
    res.json({
      ok: true,
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      hooks: plugin.hooks,
      permissions: plugin.permissions
    });
  });

  app.get("/mia/paint/native/status", localAdminGuard, (req, res) => {
    const shellMode = nativeBridge.detectShellMode(req.query || {});
    res.json(
      nativeBridge.getNativeCapabilities({ shellMode, query: req.query || {} })
    );
  });

  app.get("/mia/paint/native/tauri", localAdminGuard, (_req, res) => {
    res.json({
      ok: true,
      runtime: "mia-paint-tauri",
      scaffold: "tools/mia-paint-tauri",
      launch: "npm run paint:tauri",
      fallback: "npm run paint:shell",
      editorUrl: "/mia-paint/?shell=1&native=tauri",
      rustRequired: true,
      docs: "tools/mia-paint-tauri/README.md"
    });
  });

  app.get("/mia/paint/ws/status", localAdminGuard, (_req, res) => {
    if (typeof paintWs?.getPaintWsStats === "function") {
      return res.json(paintWs.getPaintWsStats());
    }
    res.json({ ok: false, error: "ws_unavailable" });
  });

  app.get("/mia/paint/agent/snapshot", localAdminGuard, (req, res) => {
    if (typeof bridge.getSession !== "function") {
      return res.status(503).json({ ok: false, error: "paint_unavailable" });
    }
    const paintCore = require("../shared/mia-paint-core");
    const snap = paintAiBridge.getAgentSnapshot(bridge.getSession(), paintCore);
    res.json({
      ...snap,
      graphics: graphicsAgent.getGraphicsCatalog()
    });
  });

  app.get("/mia/graphics/catalog", localAdminGuard, (_req, res) => {
    res.json(graphicsAgent.getGraphicsCatalog());
  });

  app.get("/mia/graphics/ai", localAdminGuard, (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    res.json({ ok: true, modules: graphicsStudio.listAiModules() });
  });

  app.get("/mia/graphics/visual-identity", localAdminGuard, (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    res.json({ ok: true, ...graphicsStudio.getVisualIdentitySnapshot() });
  });

  app.post("/mia/graphics/ai/generate", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "generate", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/ai/edit", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "edit", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/ai/remove-background", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "remove-background", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/ai/upscale", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "upscale", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/ai/restore", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "restore", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/ai/recolor", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "recolor", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/ai/true-alpha", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "true-alpha", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get("/mia/graphics/ai/animation", localAdminGuard, (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    res.json({ ok: true, modules: graphicsStudio.listAiAnimationModules() });
  });

  app.post("/mia/graphics/ai/animation/generate", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGenerateAnimationCommand(body);
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/ai/animation/promote", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runPromoteAnimationCommand(body);
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/ai/animation/mark-production", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runPromoteAnimationCommand({
      ...body,
      markProduction: true
    });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get("/mia/graphics/motion", localAdminGuard, (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    res.json({ ok: true, modules: graphicsStudio.listMotionModules() });
  });

  app.post("/mia/graphics/motion/layer-keyframe", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsMotionCommand({ module: "layer-keyframe", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/motion/camera-keyframe", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsMotionCommand({ module: "camera-keyframe", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/motion/bones-rig", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsMotionCommand({ module: "bones-rig", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/motion/sample", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsMotionCommand({ module: "sample", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/motion/ai-generate", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsMotionCommand({ module: "ai-motion", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/motion/lip-sync", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsMotionCommand({ module: "lip-sync", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/motion/ik-solve", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsMotionCommand({ module: "ik-solve", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/motion/bone-chain", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsMotionCommand({ module: "bone-chain", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get("/mia/graphics/fx", localAdminGuard, (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    res.json({ ok: true, modules: graphicsStudio.listFxModules(), presets: graphicsStudio.listParticlePresets() });
  });

  app.post("/mia/graphics/fx/particles", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = graphicsAgent.runGraphicsFxCommand(body);
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get("/mia/graphics/export", localAdminGuard, (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    res.json({ ok: true, modules: graphicsStudio.listExportModules() });
  });

  app.post("/mia/graphics/export/gif", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsExportCommand({ module: "gif", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/export/webm", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsExportCommand({ module: "webm", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/graphics/export/mp4", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsExportCommand({ module: "mp4", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get("/mia/graphics/avatar", localAdminGuard, (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    res.json({ ok: true, modules: graphicsStudio.listAvatarModules(), presets: graphicsStudio.listAvatarPresets() });
  });

  app.post("/mia/graphics/avatar/create", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runCreateAvatarCommand(body);
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get("/mia/graphics/preview", localAdminGuard, (_req, res) => {
    res.json({
      ok: true,
      previewPage: "/mia-graphics-preview.html",
      stateUrl: "/mia/graphics/preview/state",
      publishAction: "publish_preview"
    });
  });

  app.get("/mia/graphics/preview/state", localAdminGuard, (_req, res) => {
    res.json(graphicsAgent.getPreviewState());
  });

  app.post("/mia/graphics/preview/publish", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof paintBridge.runCommand !== "function") {
      return res.status(503).json({ ok: false, error: "paint_unavailable" });
    }
    const result = paintBridge.runCommand({ action: "publish_preview", ...body });
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json({ ...graphicsAgent.getPreviewState(), publish: result });
  });

  app.get("/mia/graphics/obs", localAdminGuard, (_req, res) => {
    res.json(graphicsAgent.getGraphicsObsHook());
  });

  app.get("/mia/graphics/body", localAdminGuard, (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    const base = `http://127.0.0.1:${Number(process.env.PORT) || 3000}`;
    res.json({
      ok: true,
      phase: graphicsStudio.getBodyState().phase,
      parts: graphicsStudio.listBodyParts(),
      previewPresets: graphicsStudio.listBodyPreviewPresets(),
      urls: graphicsStudio.buildBodyPartUrls(base),
      graphicsSyncUrls: graphicsStudio.buildBodyPartUrls(base, { syncGraphics: true }),
      hybridSyncUrls: graphicsStudio.buildBodyPartUrls(base, { syncHybrid: true }),
      bodyStateUrl: `${base}/mia/graphics/body/state`,
      obsTransform: graphicsStudio.BODY_PARTS_OBS_TRANSFORM,
      posePresets: graphicsStudio.listPosePresets()
    });
  });

  app.get("/mia/graphics/body/state", (_req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    res.json(graphicsStudio.getBodyState());
  });

  app.post("/mia/graphics/body/publish", localAdminGuard, (req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    res.json(graphicsStudio.publishBodyState(body));
  });

  app.post("/mia/graphics/body/preview", localAdminGuard, async (req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const published = graphicsStudio.publishBodyPreview(body);
    let obsSync = { ok: false, skipped: true, reason: "sync_obs_disabled" };
    if (body.syncObs !== false) {
      try {
        const obsBodyPreview = require("../scripts/MIA_OBS_BODY_PREVIEW");
        obsSync = await obsBodyPreview.syncObsBodyPreviewVisibility({
          parts: published.parts,
          layout: published.layout || body.layout || "hero",
          sceneName: body.sceneName,
          port: Number(process.env.PORT) || 3000,
          bodySync: body.bodySync || "hybrid"
        });
      } catch (err) {
        obsSync = { ok: false, error: String(err?.message || err) };
      }
    }
    res.json({ ...published, obsSync });
  });

  app.post("/mia/graphics/body/preview/reset", localAdminGuard, async (req, res) => {
    const graphicsStudio = require("../shared/mia-graphics-studio");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const reset = graphicsStudio.resetBodyPreview();
    let obsSync = { ok: false, skipped: true, reason: "sync_obs_disabled" };
    if (body.syncObs !== false) {
      try {
        const obsBodyPreview = require("../scripts/MIA_OBS_BODY_PREVIEW");
        obsSync = await obsBodyPreview.hideAllObsBodyParts({
          sceneName: body.sceneName,
          port: Number(process.env.PORT) || 3000
        });
      } catch (err) {
        obsSync = { ok: false, error: String(err?.message || err) };
      }
    }
    res.json({ ...reset, obsSync });
  });

  app.post("/mia/graphics/motion/pose", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = graphicsAgent.runGraphicsMotionCommand({ module: "pose", ...body });
    Promise.resolve(result)
      .then((payload) => {
        res.status(payload.ok ? 200 : 400).json(payload);
      })
      .catch((err) => {
        res.status(500).json({ ok: false, error: String(err?.message || err) });
      });
  });

  app.post("/mia/graphics/pipeline", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsPipeline(body);
    notifyPaintWs();
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/paint/ai/generate", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "generate", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/paint/ai/remove-bg", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "remove-background", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/mia/paint/ai/inpaint", localAdminGuard, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await graphicsAgent.runGraphicsAiCommand({ module: "edit", ...body });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get("/mia-paint/shell", (_req, res) => {
    res.redirect(302, "/mia-paint/shell.html");
  });

  app.get("/mia-paint/tauri", (_req, res) => {
    res.redirect(302, "/mia/paint/native/tauri");
  });

  if (app.use && localAdminGuard) {
    const express = require("express");
    app.use(
      "/mia/paint/plugins",
      localAdminGuard,
      express.static(PLUGINS_STATIC, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.endsWith(".js")) {
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          }
        }
      })
    );
  }

  return { ok: true };
}

module.exports = { registerMiaPaintRoutes };
