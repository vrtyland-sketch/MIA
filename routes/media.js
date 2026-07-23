"use strict";

const { validateApp, safeString } = require("./_helpers");

function registerMediaRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    localAdminGuard,
    mediaCatalogModule,
    mediaOrchestratorModule,
    mediaApplyObsModule,
    mediaTemplateRendererModule,
    ensureObsConnectedWithRetry,
    selfRestartModule,
    runtimeConfig
  } = ctx;

  app.get("/media/narrative-arcs", localAdminGuard, (_req, res) => {
    try {
      const catalog =
        typeof mediaCatalogModule.loadCatalog === "function"
          ? mediaCatalogModule.loadCatalog()
          : null;
      const arcs =
        catalog?.narrativeArcs ||
        (typeof mediaCatalogModule.buildNarrativeArcs === "function"
          ? mediaCatalogModule.buildNarrativeArcs(
              (catalog?.items || []).filter((row) => row.kind === "videos")
            )
          : []);
      const bossArcs = arcs.filter((arc) => arc.bossMissionReady);
      res.json({
        ok: true,
        arcCount: arcs.length,
        bossMissionArcs: bossArcs.length,
        arcs,
        bossArcs
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/media/graphic-references", localAdminGuard, (_req, res) => {
    try {
      const catalog =
        typeof mediaCatalogModule.loadCatalog === "function"
          ? mediaCatalogModule.loadCatalog()
          : null;
      const videos = (catalog?.items || []).filter((row) => row.kind === "videos");
      const pool =
        catalog?.graphicReferencePool ||
        (typeof mediaCatalogModule.buildGraphicReferencePool === "function"
          ? mediaCatalogModule.buildGraphicReferencePool(videos)
          : []);
      res.json({
        ok: true,
        count: pool.length,
        policy: catalog?.graphicReferencePolicy || {
          rule: "Pouze animovaná videa z Prahy jsou vzorem pro avatary a budoucí stream grafiku.",
          provider: "mia_graphic_reference_v1"
        },
        items: pool
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/media/catalog/summary", (_req, res) => {
    try {
      if (typeof mediaOrchestratorModule.getCatalogSnapshot === "function") {
        return res.json(mediaOrchestratorModule.getCatalogSnapshot());
      }
      res.status(503).json({ ok: false, error: "orchestrator_unavailable" });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/media/catalog", (_req, res) => {
    try {
      const catalog =
        typeof mediaCatalogModule.loadCatalog === "function"
          ? mediaCatalogModule.loadCatalog()
          : null;
      if (!catalog && typeof mediaCatalogModule.buildCatalog === "function") {
        return res.json({ ok: true, live: true, catalog: mediaCatalogModule.buildCatalog() });
      }
      if (!catalog) {
        return res.status(404).json({ ok: false, error: "catalog_missing" });
      }
      res.json({ ok: true, catalog });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/media/catalog/scan", localAdminGuard, async (_req, res) => {
    try {
      if (typeof mediaCatalogModule.buildCatalog !== "function") {
        return res.status(503).json({ ok: false, error: "media_catalog_unavailable" });
      }
      const catalog = mediaCatalogModule.buildCatalog();
      const pathWritten =
        typeof mediaCatalogModule.saveCatalog === "function"
          ? mediaCatalogModule.saveCatalog(catalog)
          : null;
      res.json({
        ok: true,
        path: pathWritten,
        summary: catalog.summary,
        obsAssigned: catalog.obsAssignments?.length || 0,
        profilePool: catalog.profilePool?.length || 0
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/media/catalog/apply-obs", localAdminGuard, async (_req, res) => {
    if (typeof mediaApplyObsModule.applyCatalogToObs !== "function") {
      return res.status(503).json({ ok: false, error: "apply_obs_unavailable" });
    }
    const obsReady = await ensureObsConnectedWithRetry(
      "media_apply_obs",
      runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000
    );
    if (!obsReady.ok) {
      return res.status(503).json({ ok: false, error: "obs_not_connected" });
    }
    try {
      const report = await mediaApplyObsModule.applyCatalogToObs();
      let restart = { scheduled: false };
      if (typeof selfRestartModule.maybeScheduleRestartAfterMediaApply === "function") {
        restart = selfRestartModule.maybeScheduleRestartAfterMediaApply(report, "media_apply_obs_api");
      }
      res.json({ ...report, restart });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/media/template/preview", async (req, res) => {
    if (typeof mediaTemplateRendererModule.composeFromTemplate !== "function") {
      return res.status(503).json({ ok: false, error: "template_renderer_unavailable" });
    }
    try {
      const templateId = safeString(req.query?.template, "donator_spotlight");
      const userLabel = safeString(req.query?.user, "Top dárce");
      const catalog =
        typeof mediaCatalogModule.loadCatalog === "function"
          ? mediaCatalogModule.loadCatalog()
          : null;
      const result = await mediaTemplateRendererModule.composeFromTemplate(templateId, {
        userLabel,
        catalog
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "GET /media/narrative-arcs",
      "GET /media/graphic-references",
      "GET /media/catalog/summary",
      "GET /media/catalog",
      "POST /media/catalog/scan",
      "POST /media/catalog/apply-obs",
      "GET /media/template/preview"
    ]
  };
}

module.exports = { registerMediaRoutes };
