"use strict";

/**
 * Stream session fáze: PRELIVE → LIVE → ENDED
 * Oddělené od chat session memory (MIA_SESSION_MEMORY).
 */

const PHASES = Object.freeze(["PRELIVE", "LIVE", "ENDED"]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nowMs() {
  return Date.now();
}

function createStreamSession(seed = {}) {
  const phase = PHASES.includes(safeString(seed.phase).toUpperCase())
    ? safeString(seed.phase).toUpperCase()
    : "PRELIVE";

  return {
    phase,
    startedAt: Number(seed.startedAt) || nowMs(),
    liveAt: seed.liveAt || null,
    endedAt: seed.endedAt || null,
    lastTransitionAt: seed.lastTransitionAt || null,
    lastReason: safeString(seed.lastReason, "init"),
    eventCount: Math.max(0, Number(seed.eventCount) || 0)
  };
}

function transition(session, nextPhase, reason = "") {
  if (!session || !PHASES.includes(nextPhase)) {
    return session;
  }

  const from = session.phase;
  if (from === nextPhase) {
    return session;
  }

  const at = nowMs();
  const next = {
    ...session,
    phase: nextPhase,
    lastTransitionAt: at,
    lastReason: safeString(reason, nextPhase.toLowerCase())
  };

  if (nextPhase === "LIVE" && !next.liveAt) {
    next.liveAt = at;
  }
  if (nextPhase === "ENDED") {
    next.endedAt = at;
  }

  return next;
}

function markLive(session, reason = "first_ingest") {
  if (!session || session.phase === "LIVE") return session;
  if (session.phase === "ENDED") return session;
  return transition(session, "LIVE", reason);
}

function markEnded(session, reason = "shutdown") {
  if (!session || session.phase === "ENDED") return session;
  return transition(session, "ENDED", reason);
}

function noteIngest(session, eventType = "") {
  if (!session) return session;
  return {
    ...session,
    eventCount: Math.max(0, Number(session.eventCount) || 0) + 1,
    lastEventType: safeString(eventType) || session.lastEventType || null,
    lastEventAt: nowMs()
  };
}

function shouldMarkLiveFromEvent(normalized = {}) {
  const platform = safeString(normalized.platform).toLowerCase();
  if (platform === "test" || platform === "debug") return false;
  if (normalized.test === true) return false;
  return true;
}

function getSnapshot(session = null) {
  if (!session) {
    return { phase: "PRELIVE", ok: true };
  }

  return {
    ok: true,
    phase: session.phase,
    startedAt: session.startedAt,
    liveAt: session.liveAt,
    endedAt: session.endedAt,
    lastTransitionAt: session.lastTransitionAt,
    lastReason: session.lastReason,
    eventCount: session.eventCount || 0,
    lastEventType: session.lastEventType || null,
    lastEventAt: session.lastEventAt || null,
    uptimeSec: Math.max(0, Math.floor((nowMs() - (session.startedAt || nowMs())) / 1000)),
    liveSec:
      session.liveAt && session.phase !== "PRELIVE"
        ? Math.max(0, Math.floor(((session.endedAt || nowMs()) - session.liveAt) / 1000))
        : 0
  };
}

module.exports = {
  PHASES,
  createStreamSession,
  markLive,
  markEnded,
  noteIngest,
  shouldMarkLiveFromEvent,
  getSnapshot,
  transition
};
