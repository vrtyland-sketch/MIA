"use strict";

/**
 * Remote Dev HTTP routes — extrahováno z index.js (P2 architektura).
 */

function registerRemoteDevRoutes(app, ctx = {}) {
  const {
    localAdminGuard,
    remoteDevModule,
    giftMapEnterprise,
    getLastGiftMapping,
    getServerStartedAt,
    writeLog,
    safeString
  } = ctx;

  if (!app || typeof app.get !== "function") {
    return { ok: false, error: "invalid_app" };
  }

  app.get("/mia-fold-dev", (_req, res) => {
    const secret = safeString(process.env.MIA_INGEST_SECRET);
    if (!secret) {
      return res
        .status(503)
        .send("Chybí MIA_INGEST_SECRET v .env — spusť: npm run setup:secrets");
    }
    const q = new URLSearchParams({ mia_secret: secret });
    res.redirect(302, `/mia-remote-dev.html?${q.toString()}`);
  });

  app.get("/mia/remote/dev/status", localAdminGuard, (_req, res) => {
    if (typeof remoteDevModule.getStatus !== "function") {
      return res.status(503).json({ ok: false, error: "remote_dev_unavailable" });
    }
    res.json(remoteDevModule.getStatus());
  });

  app.get("/mia/remote/dev/jobs", localAdminGuard, (req, res) => {
    if (typeof remoteDevModule.listJobs !== "function") {
      return res.status(503).json({ ok: false, error: "remote_dev_unavailable" });
    }
    const limit = Math.max(1, Math.min(40, Number(req.query?.limit) || 12));
    res.json({ ok: true, jobs: remoteDevModule.listJobs(limit) });
  });

  app.post("/mia/remote/dev/command", localAdminGuard, async (req, res) => {
    if (typeof remoteDevModule.enqueueAndMaybeRun !== "function") {
      return res.status(503).json({ ok: false, error: "remote_dev_unavailable" });
    }

    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const text = safeString(body.text || body.utterance || body.command);
      const source = safeString(body.source, "text");
      if (!text) {
        return res.status(400).json({ ok: false, error: "missing_text" });
      }

      const result = await remoteDevModule.enqueueAndMaybeRun(
        { text, source },
        {
          autoRun: body.autoRun !== false,
          getStatusPayload: () => ({
            giftMap:
              typeof giftMapEnterprise.getPublicSnapshot === "function"
                ? giftMapEnterprise.getPublicSnapshot(4)
                : null,
            lastGiftMapping:
              typeof getLastGiftMapping === "function" ? getLastGiftMapping() : null,
            uptimeSec: Math.floor((Date.now() - (getServerStartedAt?.() || Date.now())) / 1000)
          })
        }
      );

      writeLog("remote-dev", {
        id: result.job?.id || null,
        kind: result.job?.kind || null,
        source,
        ranLocally: Boolean(result.ranLocally),
        status: result.job?.status || null
      });

      res.json(result);
    } catch (err) {
      writeLog("mia-errors", {
        source: "remote_dev_command",
        error: err?.message || String(err)
      });
      res.status(500).json({ ok: false, error: err?.message || "remote_dev_failed" });
    }
  });

  return { ok: true };
}

module.exports = {
  registerRemoteDevRoutes
};
