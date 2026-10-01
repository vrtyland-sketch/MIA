"use strict";

/**
 * Master Canon 0003 — logical event queues (§8) mapped to runtime modules.
 */

const EVENT_QUEUE = Object.freeze({
  STREAM: "stream",
  AI: "ai",
  GRAPHICS: "graphics",
  DATABASE: "database",
  SCHEDULER: "scheduler",
  NETWORK: "network"
});

/** Canon queue → runtime implementation anchor (no business logic here). */
const EVENT_QUEUE_RUNTIME = Object.freeze({
  [EVENT_QUEUE.STREAM]: {
    module: "scripts/MIA_INGEST_QUEUE.js",
    lanes: ["support", "community", "audience"]
  },
  [EVENT_QUEUE.AI]: {
    module: "MIA_NEXT/engine_shadow_runtime.js",
    note: "shadow decision inside pipeline phase_decide"
  },
  [EVENT_QUEUE.GRAPHICS]: {
    module: "scripts/MIA_DELIVERY_RUNTIME.js",
    note: "overlayQueue + voiceSpeakQueue"
  },
  [EVENT_QUEUE.DATABASE]: {
    module: "data/*.json persistence",
    note: "session memory, koj state, gift stats"
  },
  [EVENT_QUEUE.SCHEDULER]: {
    module: "scripts/MIA_RUNTIME_LOOPS.js",
    note: "timers, watchdogs, overlay refresh"
  },
  [EVENT_QUEUE.NETWORK]: {
    module: "scripts/MIA_PLATFORM_BRIDGES.js",
    note: "Kick bridge, TikFinity ingest HTTP"
  }
});

function isEventQueue(value) {
  return typeof value === "string" && Object.values(EVENT_QUEUE).includes(value);
}

function resolveIngestLaneQueue(lane = "") {
  const key = String(lane || "").toLowerCase();
  if (key === "support" || key === "community" || key === "audience") {
    return EVENT_QUEUE.STREAM;
  }
  return EVENT_QUEUE.STREAM;
}

module.exports = {
  EVENT_QUEUE,
  EVENT_QUEUE_RUNTIME,
  isEventQueue,
  resolveIngestLaneQueue
};
