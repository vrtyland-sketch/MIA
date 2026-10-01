"use strict";

const { validateApp } = require("./_helpers");

/** Canonical + TikFinity/TikTok alias paths — same handler as /ingest */
const INGEST_ROUTE_PATHS = Object.freeze([
  "/ingest",
  "/tikfinity/webhook",
  "/tikfinity/ingest",
  "/tiktok/ingest"
]);

function registerIngestRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const { ingestAuthGuard, handleIngest, handleAudienceIngest } = ctx;
  if (typeof handleIngest !== "function") {
    return { ok: false, error: "handleIngest_missing" };
  }

  for (const route of INGEST_ROUTE_PATHS) {
    app.post(route, ingestAuthGuard, (req, res) =>
      handleIngest(req, res, route === "/ingest" ? "ingest_post" : `ingest_post:${route}`)
    );
    app.get(route, ingestAuthGuard, (req, res) =>
      handleIngest(req, res, route === "/ingest" ? "ingest_get" : `ingest_get:${route}`)
    );
  }

  app.get("/ingest/audience", ingestAuthGuard, handleAudienceIngest);
  app.post("/ingest/audience", ingestAuthGuard, handleAudienceIngest);

  return {
    ok: true,
    routes: [
      ...INGEST_ROUTE_PATHS.flatMap((p) => [`POST ${p}`, `GET ${p}`]),
      "GET /ingest/audience",
      "POST /ingest/audience"
    ]
  };
}

module.exports = { registerIngestRoutes, INGEST_ROUTE_PATHS };
