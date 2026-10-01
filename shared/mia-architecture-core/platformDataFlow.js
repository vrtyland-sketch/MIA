"use strict";

/**
 * Master Canon 0006 §19 — reference platform data flow.
 */

const CANON_PLATFORM_DATA_FLOW = Object.freeze([
  { step: 1, node: "Externí zdroj", examples: ["TikTok", "Kick", "TikFinity"] },
  { step: 2, node: "Integration System", runtime: "scripts/MIA_PLATFORM_BRIDGES.js, OBS WS" },
  { step: 3, node: "Stream / Network System", runtime: "routes/ingest, MIA_INGEST_HTTP.js" },
  { step: 4, node: "Event Bus (Core)", runtime: "scripts/MIA_INGEST_QUEUE.js" },
  { step: 5, node: "Normalizer", runtime: "shared/platform_normalizers/normalize_event.js" },
  { step: 6, node: "Event Pipeline (Core)", runtime: "scripts/pipeline/run.js" },
  { step: 7, node: "AI / Game / Graphics / Economy", runtime: "shadow, Koj, animation, gift map" },
  { step: 8, node: "Action Orchestrator", runtime: "scripts/MIA_DELIVERY_RUNTIME.js" },
  {
    step: 9,
    node: "Výstup",
    examples: ["OBS", "Overlay", "Chat", "Databáze", "AI"]
  }
]);

function describePlatformDataFlow() {
  return CANON_PLATFORM_DATA_FLOW.map((row) => row.node).join(" → ");
}

module.exports = {
  CANON_PLATFORM_DATA_FLOW,
  describePlatformDataFlow
};
