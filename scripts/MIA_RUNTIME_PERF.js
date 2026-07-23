"use strict";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Dříve min. 18 s lock — blokoval frontu hlasu i overlay.
 * Drží lock jen po skutečné délce TTS + malý buffer.
 */
function computeVoiceHoldUntilTs(now, durationMs = 0, env = process.env) {
  const baseNow = toNumber(now, Date.now());
  const minHoldMs = toNumber(env.MIA_VOICE_HOLD_MIN_MS, 3500);
  const maxHoldMs = toNumber(env.MIA_VOICE_HOLD_MAX_MS, 45000);
  const bufferMs = toNumber(env.MIA_VOICE_HOLD_BUFFER_MS, 1200);
  const estimate = toNumber(durationMs, 0);

  if (estimate > 0) {
    return baseNow + Math.min(Math.max(estimate + bufferMs, minHoldMs), maxHoldMs);
  }

  return baseNow + toNumber(env.MIA_VOICE_HOLD_FALLBACK_MS, 8500);
}

function createOverlayStateCache(options = {}) {
  const ttlMs = Math.max(200, toNumber(options.ttlMs, 450));
  let cached = null;
  let cachedAt = 0;
  let cachedKey = "";

  return {
    get(key, builder) {
      const now = Date.now();
      const safeKey = String(key || "");
      if (
        cached &&
        cachedKey === safeKey &&
        now - cachedAt < ttlMs
      ) {
        return cached;
      }
      cached = builder();
      cachedAt = now;
      cachedKey = safeKey;
      return cached;
    },
    invalidate() {
      cached = null;
      cachedAt = 0;
      cachedKey = "";
    },
    getStats() {
      return { ttlMs, cachedAt, hasCache: Boolean(cached) };
    }
  };
}

module.exports = {
  computeVoiceHoldUntilTs,
  createOverlayStateCache
};
