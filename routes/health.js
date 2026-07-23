"use strict";

const { validateApp } = require("./_helpers");

function registerHealthRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  app.get("/startup/check", (_req, res) => {
    try {
      if (typeof ctx.buildStartupCheckPayload !== "function") {
        return res.status(503).json({ ok: false, error: "startup_check_unavailable" });
      }
      res.json(ctx.buildStartupCheckPayload());
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/health", (_req, res) => {
    if (typeof ctx.buildHealthPayload !== "function") {
      return res.status(503).json({ ok: false, error: "health_unavailable" });
    }
    res.json(ctx.buildHealthPayload());
  });

  app.get("/diagnose", async (_req, res) => {
    try {
      if (typeof ctx.buildDiagnosePayload !== "function") {
        return res.status(503).json({ ok: false, error: "diagnose_unavailable" });
      }
      res.json(await ctx.buildDiagnosePayload());
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: ["GET /startup/check", "GET /health", "GET /diagnose"]
  };
}

module.exports = { registerHealthRoutes };
