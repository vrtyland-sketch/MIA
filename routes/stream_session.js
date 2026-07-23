"use strict";

/**
 * Stream session HTTP routes — PRELIVE → LIVE → ENDED (P2 architektura).
 */

function registerStreamSessionRoutes(app, ctx = {}) {
  const {
    localAdminGuard,
    streamSessionModule,
    getStreamSession,
    setStreamSession,
    writeLog,
    safeString
  } = ctx;

  if (!app || typeof app.get !== "function") {
    return { ok: false, error: "invalid_app" };
  }

  function snapshot() {
    const session =
      typeof getStreamSession === "function" ? getStreamSession() : null;
    return typeof streamSessionModule.getSnapshot === "function"
      ? streamSessionModule.getSnapshot(session)
      : { phase: session?.phase || "PRELIVE", ok: true };
  }

  app.get("/stream/session", (_req, res) => {
    res.json({
      ok: true,
      service: "MIA",
      session: snapshot()
    });
  });

  app.post("/stream/session/end", localAdminGuard, (req, res) => {
    if (typeof streamSessionModule.markEnded !== "function") {
      return res.status(503).json({ ok: false, error: "stream_session_unavailable" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const reason = safeString(body.reason || req.query?.reason, "manual_end");
    let session = typeof getStreamSession === "function" ? getStreamSession() : null;
    session = streamSessionModule.markEnded(session, reason);
    if (typeof setStreamSession === "function") {
      setStreamSession(session);
    }

    if (typeof writeLog === "function") {
      writeLog("mia-events", {
        stage: "stream_session_end",
        reason,
        phase: session?.phase || "ENDED"
      });
    }

    res.json({
      ok: true,
      session: snapshot()
    });
  });

  app.post("/stream/session/reset", localAdminGuard, (req, res) => {
    if (typeof streamSessionModule.createStreamSession !== "function") {
      return res.status(503).json({ ok: false, error: "stream_session_unavailable" });
    }

    const session = streamSessionModule.createStreamSession({ phase: "PRELIVE" });
    if (typeof setStreamSession === "function") {
      setStreamSession(session);
    }

    if (typeof writeLog === "function") {
      writeLog("mia-events", {
        stage: "stream_session_reset",
        phase: session.phase
      });
    }

    res.json({
      ok: true,
      session: snapshot()
    });
  });

  return { ok: true, routes: ["GET /stream/session", "POST /stream/session/end", "POST /stream/session/reset"] };
}

module.exports = {
  registerStreamSessionRoutes
};
