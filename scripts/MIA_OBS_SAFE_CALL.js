"use strict";

/**
 * Throttled OBS WebSocket calls with screenshot source alias fallback.
 */

function createObsSafeCall(deps = {}) {
  const {
    ensureObsConnected,
    getObs,
    safeString,
    writeLog
  } = deps;

  const obsCallErrorLogAt = new Map();
  const OBS_ERROR_LOG_COOLDOWN_MS = 30000;

  const OBS_SOURCE_ALIASES = {
    MIA_SPEECH: ["MIA_BUBBLE", "MIA_SPEECH_OVERLAY", "SPEECH_OVERLAY", "CHAT_OVERLAY"],
    MIA_BUBBLE: ["MIA_SPEECH", "MIA_SPEECH_OVERLAY", "SPEECH_OVERLAY"],
    MIA_SPEECH_OVERLAY: ["MIA_BUBBLE", "MIA_SPEECH", "SPEECH_OVERLAY"],
    SPEECH_OVERLAY: ["MIA_BUBBLE", "MIA_SPEECH"],
    MIA_KOJ_RUNTIME: ["KOJNOZROUT_RUNTIME", "KOJ_RUNTIME", "KOJ_SPRITE"],
    KOJNOZROUT_RUNTIME: ["MIA_KOJ_RUNTIME", "KOJ_RUNTIME", "KOJ_SPRITE"],
    MIA_BOWL: ["KOJNOZROUT_BOWL_V2", "KOJNOZROUT_BOWL", "KOJ_MISKA"],
    KOJNOZROUT_BOWL_V2: ["MIA_BOWL", "KOJNOZROUT_BOWL", "KOJ_MISKA"],
    KOJNOZROUT_BOWL: ["MIA_BOWL", "KOJNOZROUT_BOWL_V2", "KOJ_MISKA"]
  };

  function shouldLogObsCallError(requestType, requestData, errorMessage) {
    const sourceName = safeString(requestData?.sourceName || requestData?.inputName || "");
    const key = `${requestType}|${sourceName}|${safeString(errorMessage).slice(0, 80)}`;
    const now = Date.now();
    const last = obsCallErrorLogAt.get(key) || 0;
    if (now - last < OBS_ERROR_LOG_COOLDOWN_MS) return false;
    obsCallErrorLogAt.set(key, now);
    return true;
  }

  function resolveObsSourceCandidates(sourceName = "") {
    const primary = safeString(sourceName);
    if (!primary) return [];
    const aliases =
      OBS_SOURCE_ALIASES[primary] || OBS_SOURCE_ALIASES[primary.toUpperCase()] || [];
    return [primary, ...aliases].filter((name, index, arr) => name && arr.indexOf(name) === index);
  }

  async function safeObsCall(requestType, requestData = {}) {
    const ready = await ensureObsConnected(`safeObsCall:${requestType}`);
    const obs = typeof getObs === "function" ? getObs() : null;

    if (!ready.ok || !obs || typeof obs.call !== "function") {
      return {
        ok: false,
        reason: "obs_not_connected",
        requestType,
        requestData
      };
    }

    const isScreenshot = requestType === "GetSourceScreenshot";
    const candidates = isScreenshot
      ? resolveObsSourceCandidates(requestData?.sourceName)
      : [safeString(requestData?.sourceName)].filter(Boolean);
    const attempts = candidates.length ? candidates : [null];

    let lastErr = null;
    for (let i = 0; i < attempts.length; i += 1) {
      const sourceName = attempts[i];
      const payload =
        sourceName && requestData && typeof requestData === "object"
          ? { ...requestData, sourceName }
          : requestData;

      for (let retry = 0; retry < (isScreenshot ? 2 : 1); retry += 1) {
        try {
          const response = await obs.call(requestType, payload);
          return {
            ok: true,
            requestType,
            requestData: payload,
            response
          };
        } catch (err) {
          lastErr = err;
          const message = safeString(err?.message);
          const missingSource = /no source was found/i.test(message);
          const encodeFail = /failed to encode screenshot/i.test(message);
          if (missingSource && i < attempts.length - 1) break;
          if (encodeFail && retry === 0) {
            await new Promise((r) => setTimeout(r, 120));
            continue;
          }
          if (shouldLogObsCallError(requestType, payload, message)) {
            writeLog("mia-errors", {
              source: "safeObsCall",
              requestType,
              requestData: payload,
              error: message,
              throttled: true
            });
          }
          if (!missingSource && !encodeFail) {
            return {
              ok: false,
              reason: "obs_call_failed",
              requestType,
              requestData: payload,
              error: message
            };
          }
        }
      }
    }

    return {
      ok: false,
      reason: "obs_call_failed",
      requestType,
      requestData,
      error: safeString(lastErr?.message, "obs_call_failed")
    };
  }

  return { safeObsCall };
}

module.exports = { createObsSafeCall };
