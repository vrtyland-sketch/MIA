"use strict";

/**
 * Engine 2.0 — Event Bus stub (E2).
 * normalize → apply → optional re-render hook. Flag-gated only.
 */

const { normalizeEvent } = require("../../shared/platform_normalizers/normalize_event");
const { applyNormalizedEvent } = require("../event-applicator");

function ingestNormalizedEvent(state, rawInput) {
  const normalized = normalizeEvent(rawInput);
  const result = applyNormalizedEvent(state, normalized);
  return { normalized, result };
}

module.exports = {
  ingestNormalizedEvent
};
