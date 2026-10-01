"use strict";

/**
 * Master Canon 0003 — Event Bus contract (§9–§10).
 * Documents canonical flow; runtime = ingest queue + phased pipeline.
 */

const { EVENT_QUEUE } = require("./eventQueues");

const CANON_EVENT_FLOW = Object.freeze([
  { step: 1, node: "Platform", example: "TikTok / Kick / TikFinity" },
  { step: 2, node: "Ingest", module: "routes/ingest + MIA_INGEST_HTTP.js" },
  { step: 3, node: "Event Bus", module: "MIA_INGEST_QUEUE.js", queue: EVENT_QUEUE.STREAM },
  { step: 4, node: "Normalizer", module: "shared/platform_normalizers/normalize_event.js" },
  { step: 5, node: "Pipeline", module: "scripts/pipeline/run.js" },
  { step: 6, node: "Gift Engine", module: "shared/gifts/ + MIA_GIFT_MAP runtime" },
  { step: 7, node: "Decision Layer", module: "engine_shadow_runtime + decision_engine" },
  { step: 8, node: "Action Orchestrator", module: "MIA_DELIVERY_RUNTIME.js" },
  { step: 9, node: "OBS", module: "MIA_OBS_OVERLAY_SYNC.js" }
]);

const EVENT_BUS_RESPONSIBILITIES = Object.freeze([
  "accept_events",
  "validate_shape",
  "enqueue",
  "dispatch_to_modules",
  "record_processing_trace"
]);

const EVENT_BUS_FORBIDDEN = Object.freeze([
  "business_logic",
  "gift_tier_decisions",
  "overlay_text_generation",
  "direct_obs_scene_logic"
]);

function describeEventFlow() {
  return CANON_EVENT_FLOW.map((row) => `${row.step}. ${row.node}`).join(" → ");
}

module.exports = {
  CANON_EVENT_FLOW,
  EVENT_BUS_RESPONSIBILITIES,
  EVENT_BUS_FORBIDDEN,
  describeEventFlow
};
