"use strict";

/**
 * MIA_OVERLAY_TIMING
 *
 * - řídí delay mezi overlaye
 * - zabraňuje spam efektu
 * - poskytuje snapshot pro health/debug endpointy
 */

function createOverlayTiming(deps = {}) {
  const nowTs = deps.nowTs || (() => Date.now());
  const baseDelayMs = clampMs(deps.baseDelayMs, 500);

  let lastEmitTs = 0;

  function getDelay() {
    return baseDelayMs;
  }

  function canEmitNow() {
    const now = nowTs();
    return now - lastEmitTs >= getDelay();
  }

  function markEmitted() {
    lastEmitTs = nowTs();
    return getSnapshot();
  }

  function getRemainingMs() {
    const now = nowTs();
    const remaining = getDelay() - (now - lastEmitTs);
    return Math.max(0, remaining);
  }

  function getSnapshot() {
    return {
      active: getRemainingMs() > 0,
      delayMs: getDelay(),
      lastEmitTs: Number(lastEmitTs || 0),
      remainingMs: getRemainingMs(),
      canEmitNow: canEmitNow()
    };
  }

  return {
    canEmitNow,
    markEmitted,
    getSnapshot
  };
}

function clampMs(value, fallback = 500) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(15000, Math.round(n)));
}

module.exports = {
  createOverlayTiming
};