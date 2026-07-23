"use strict";

const { resolveIngestLane, isLikelyGiftIngestPayload } = require("./MIA_INGEST_LANE");
const { createIngestQueue } = require("./MIA_INGEST_QUEUE");

/**
 * HTTP ingest vrstva: normalizace payloadu + /ingest a /ingest/audience handlery.
 */

function normalizeIncomingEvent(deps, rawEvent = {}) {
  const {
    normalizer,
    runtimeConfig,
    languageModule,
    safeString,
    upper
  } = deps;

  if (typeof normalizer.normalizeEvent === "function") {
    const normalized = normalizer.normalizeEvent(rawEvent, { runtimeConfig });
    if (normalized && typeof normalized === "object") return normalized;
  }

  const type = upper(rawEvent.eventType || rawEvent.type);
  const message = safeString(
    rawEvent.message || rawEvent.content || rawEvent.text || rawEvent.comment
  );

  const isGift =
    type.includes("GIFT") ||
    rawEvent.giftName ||
    rawEvent.coins ||
    rawEvent.coinValue;

  const fallbackEvent = {
    eventType: isGift ? "GIFT" : message ? "COMMENT" : type || "UNKNOWN",
    route: isGift ? "support" : "community",
    platform: safeString(rawEvent.platform || rawEvent.source, "debug"),
    message,
    comment: message,
    content: message,
    text: message,
    giftName: safeString(rawEvent.giftName),
    coins: Number(rawEvent.coins || rawEvent.coinValue || 0),
    coinValue: Number(rawEvent.coins || rawEvent.coinValue || 0),
    count: Number(rawEvent.count || rawEvent.repeatCount || 1),
    user: {
      userId: safeString(
        rawEvent.userId || rawEvent.user?.userId || rawEvent.user?.id,
        "debug_user"
      ),
      username: safeString(rawEvent.username || rawEvent.user?.username, "debug"),
      nickname: safeString(
        rawEvent.nickname ||
          rawEvent.user?.nickname ||
          rawEvent.user?.displayName ||
          rawEvent.displayName,
        "Debug uživatel"
      ),
      displayName: safeString(
        rawEvent.displayName ||
          rawEvent.nickname ||
          rawEvent.user?.displayName ||
          rawEvent.user?.nickname,
        "Debug uživatel"
      )
    },
    raw: rawEvent
  };

  if (
    fallbackEvent.eventType === "COMMENT" &&
    message &&
    typeof languageModule.attachLanguageToEvent === "function"
  ) {
    languageModule.attachLanguageToEvent(fallbackEvent, runtimeConfig);
  }

  return fallbackEvent;
}
function createIngestHttpHandlers(deps = {}) {
  const ingestQueue = createIngestQueue({
    writeLog: deps.writeLog,
    safeString: deps.safeString,
    maxCommunityParallel: deps.maxCommunityParallel
  });

  function normalize(rawEvent = {}) {
    return normalizeIncomingEvent(deps, rawEvent);
  }

  async function handleIngest(req, res, source = "ingest") {
    const {
      ingestGuardModule,
      runtimeConfig,
      writeLog,
      safeString,
      processEvent
    } = deps;

    try {
      const payload =
        req.method === "POST"
          ? { ...(req.query || {}), ...(req.body || {}) }
          : { ...(req.query || {}) };

      if (
        typeof ingestGuardModule.hasIngestPayloadSignal === "function" &&
        !ingestGuardModule.hasIngestPayloadSignal(payload)
      ) {
        writeLog("ingest-rejected", {
          reason: "empty_payload",
          source,
          method: req.method,
          query: req.query || {},
          bodyKeys:
            req.body && typeof req.body === "object" ? Object.keys(req.body) : []
        });

        return res.status(400).json({
          ok: false,
          accepted: false,
          error: "empty_payload",
          message: "Ingest payload has no usable fields"
        });
      }

      const fastAck = runtimeConfig?.ingest?.fastAck !== false;
      const lane = resolveIngestLane(payload, safeString);

      if (fastAck) {
        const tikfinityTest =
          safeString(payload.content).toLowerCase().includes("it works") ||
          safeString(payload.content).toLowerCase().includes("this is a test");

        res.status(200).json({
          ok: true,
          accepted: true,
          queued: true,
          lane,
          ...(tikfinityTest ? { content: "It works! This is a test." } : {})
        });

        void ingestQueue.enqueue(lane, () => processEvent(payload)).catch((err) => {
          writeLog("mia-errors", {
            source: `${source}_async`,
            error: err.message,
            stack: err.stack,
            lane
          });
        });
        return;
      }

      const result = await ingestQueue.enqueue(lane, () => processEvent(payload));
      res.status(result.status || 200).json(result.body || result);
    } catch (err) {
      writeLog("mia-errors", {
        source,
        error: err.message,
        stack: err.stack
      });

      res.status(500).json({
        ok: false,
        error: err.message
      });
    }
  }

  function handleAudienceIngest(req, res) {
    const {
      streamAudienceModule,
      spamSessionEngine,
      recordIngestSummary,
      writeLog,
      getStreamState,
      setStreamState
    } = deps;

    try {
      const payload = {
        ...(req.query || {}),
        ...(req.body || {})
      };

      if (typeof streamAudienceModule.applyAudienceUpdate !== "function") {
        return res.status(503).json({
          ok: false,
          error: "audience module unavailable"
        });
      }

      const result = streamAudienceModule.applyAudienceUpdate(getStreamState(), {
        ...payload,
        source: payload.source || "audience_endpoint"
      });

      if (!result.ok) {
        return res.status(400).json(result);
      }

      setStreamState(result.state);
      const streamState = result.state;

      recordIngestSummary({
        source: "audience_endpoint",
        eventType: "AUDIENCE",
        platform: streamState.audience?.platform || payload.platform || "tiktok",
        viewerCount: streamState.audience?.viewerCount || null,
        audienceSource: streamState.audience?.source || null
      });

      const spamPolicy =
        typeof spamSessionEngine.applySpamAudiencePolicy === "function"
          ? spamSessionEngine.applySpamAudiencePolicy({ streamState })
          : null;

      writeLog("ingest-audience", {
        viewerCount: streamState.audience?.viewerCount,
        source: streamState.audience?.source,
        platform: streamState.audience?.platform || payload.platform || "tiktok",
        spamPolicy
      });

      res.json({
        ok: true,
        audience: streamState.audience,
        spamPolicy
      });
    } catch (err) {
      writeLog("mia-errors", {
        source: "ingest_audience",
        error: err.message,
        stack: err.stack
      });

      res.status(500).json({
        ok: false,
        error: err.message
      });
    }
  }

  return {
    ingestQueue,
    normalizeIncomingEvent: normalize,
    handleIngest,
    handleAudienceIngest,
    isLikelyGiftIngestPayload: (payload) =>
      isLikelyGiftIngestPayload(payload, deps.safeString),
    resolveIngestLane: (payload) => resolveIngestLane(payload, deps.safeString)
  };
}

module.exports = {
  normalizeIncomingEvent,
  createIngestHttpHandlers
};
