"use strict";

/**
 * Engine 2.0 — OBS Router thin adapter (E2).
 * Maps PlatformRenderer obs projection → stable JSON envelope for OBS / debug.
 * No gift tier math, no WebSocket — render intents only.
 */

const ROUTE_VERSION = "engine2/0.1.0-e2";

function routeObsProjection(renderResult) {
  if (!renderResult || typeof renderResult !== "object") {
    throw new Error("obs-router: renderResult required");
  }

  const platform = String(renderResult.platform || "").toLowerCase();
  if (platform && platform !== "obs") {
    throw new Error(`obs-router: expected obs platform, got "${platform}"`);
  }

  const payload = renderResult.payload || {};
  const intent = payload.renderIntent || {};

  return Object.freeze({
    kind: "obs.renderRoute",
    version: ROUTE_VERSION,
    target: "obs",
    profile: payload.profile || "obs",
    channel: payload.channel || "obs-render",
    scene: intent.scene || "main",
    mediaQueue: Array.isArray(intent.mediaQueue) ? intent.mediaQueue.slice() : [],
    kojMood: payload.kojMood || "calm",
    sourceVersion: renderResult.version || null,
    routedAt: Date.now()
  });
}

module.exports = {
  ROUTE_VERSION,
  routeObsProjection
};
