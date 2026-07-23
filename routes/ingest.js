"use strict";

const { validateApp } = require("./_helpers");

function registerIngestRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const { ingestAuthGuard, handleIngest, handleAudienceIngest } = ctx;
  if (typeof handleIngest !== "function") {
    return { ok: false, error: "handleIngest_missing" };
  }

  app.post("/ingest", ingestAuthGuard, (req, res) => handleIngest(req, res, "ingest_post"));
  app.get("/ingest", ingestAuthGuard, (req, res) => handleIngest(req, res, "ingest_get"));
  app.get("/ingest/audience", ingestAuthGuard, handleAudienceIngest);
  app.post("/ingest/audience", ingestAuthGuard, handleAudienceIngest);

  return {
    ok: true,
    routes: [
      "POST /ingest",
      "GET /ingest",
      "GET /ingest/audience",
      "POST /ingest/audience"
    ]
  };
}

module.exports = { registerIngestRoutes };
