"use strict";

async function phaseSession(ctx, deps) {
  const {
    streamSessionModule,
    ingestDeduper,
    writeLog,
    safeString,
    recordIngestSummary
  } = deps;

  const { normalized, eventType } = ctx;

  if (typeof streamSessionModule.noteIngest === "function") {
    ctx.runtime.streamSession = streamSessionModule.noteIngest(
      ctx.runtime.streamSession,
      eventType
    );
  }

  if (
    ctx.runtime.streamSession?.phase === "PRELIVE" &&
    typeof streamSessionModule.shouldMarkLiveFromEvent === "function" &&
    streamSessionModule.shouldMarkLiveFromEvent(normalized) &&
    typeof streamSessionModule.markLive === "function"
  ) {
    ctx.runtime.streamSession = streamSessionModule.markLive(
      ctx.runtime.streamSession,
      "ingest"
    );
  }

  if (ingestDeduper && typeof ingestDeduper.checkDuplicate === "function") {
    const dedupe = ingestDeduper.checkDuplicate(normalized);
    if (dedupe.duplicate) {
      writeLog("ingest-deduped", {
        eventType,
        key: dedupe.key,
        ageMs: dedupe.ageMs,
        user: normalized.user?.nickname || normalized.user?.username || null,
        message: safeString(normalized.message).slice(0, 120)
      });
      ctx.meta.deduped = true;
      ctx.halt(ctx.buildDedupeResponse(normalized.eventId || null).body);
      return ctx;
    }
  }

  recordIngestSummary({
    source: safeString(normalized.source, "ingest"),
    eventType,
    platform: normalized.platform || null,
    user: normalized.user?.nickname || normalized.user?.username || null,
    message: safeString(normalized.message).slice(0, 120),
    giftName: normalized.support?.giftName || null,
    tier: normalized.support?.tier || null
  });

  writeLog("ingest", {
    eventType,
    user: normalized.user?.nickname || normalized.user?.username || null,
    message: safeString(normalized.message).slice(0, 160),
    eventId: normalized.eventId || null,
    platform: normalized.platform || null,
    lane: ctx.lane
  });

  return ctx;
}

module.exports = { phaseSession };
