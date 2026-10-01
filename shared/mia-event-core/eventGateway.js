"use strict";

/**
 * Master Canon 0011 — Event Gateway infrastructure registry and metadata contract.
 * Entry layer before Event Bus Validator (0010 §3, 0012 planned).
 */

const crypto = require("crypto");
const { EVENT_SCHEMA_VERSION } = require("./eventSchema");
const { ensureCorrelationId } = require("./eventBusInfrastructure");

const GATEWAY_COMPONENT = Object.freeze({
  INPUT_LISTENER: "input_listener",
  SOURCE_DETECTOR: "source_detector",
  AUTHENTICATION_CHECKER: "authentication_checker",
  RATE_LIMITER: "rate_limiter",
  PAYLOAD_PARSER: "payload_parser",
  METADATA_BUILDER: "metadata_builder",
  EVENT_NORMALIZER: "event_normalizer",
  SECURITY_FILTER: "security_filter",
  DUPLICATE_DETECTOR: "duplicate_detector",
  GATEWAY_LOGGER: "gateway_logger",
  VALIDATOR_CONNECTOR: "validator_connector"
});

const GATEWAY_COMPONENT_ORDER = Object.freeze(Object.values(GATEWAY_COMPONENT));

const GATEWAY_SOURCE = Object.freeze({
  TIKTOK: "tiktok",
  KICK: "kick",
  TWITCH: "twitch",
  YOUTUBE: "youtube",
  FACEBOOK: "facebook",
  OBS: "obs",
  STREAMER_BOT: "streamer_bot",
  GRAPHICS_EDITOR: "graphics_editor",
  MIA_LAUNCHER: "mia_launcher",
  OPENAI: "openai",
  LOCAL_AI: "local_ai",
  SCHEDULER: "scheduler",
  PLUGIN: "plugin",
  MEMORY: "memory",
  AI: "ai",
  ADMINISTRATOR: "administrator",
  TEST: "test"
});

const STREAM_PLATFORM_SOURCES = Object.freeze([
  GATEWAY_SOURCE.TIKTOK,
  GATEWAY_SOURCE.KICK,
  GATEWAY_SOURCE.TWITCH,
  GATEWAY_SOURCE.YOUTUBE,
  GATEWAY_SOURCE.FACEBOOK
]);

const INPUT_TRANSPORT = Object.freeze({
  HTTP: "http",
  HTTPS: "https",
  WEBSOCKET: "websocket",
  IPC: "ipc",
  LOCAL_QUEUE: "local_queue"
});

const GATEWAY_METADATA_FIELDS = Object.freeze([
  "gatewayId",
  "eventId",
  "correlationId",
  "source",
  "receiveTime",
  "gatewayVersion",
  "sessionId",
  "environment",
  "schemaVersion",
  "requestId"
]);

const GATEWAY_ERROR_CODE = Object.freeze({
  INVALID_SOURCE: "invalid_source",
  AUTHENTICATION_FAILED: "authentication_failed",
  INVALID_PAYLOAD: "invalid_payload",
  UNSUPPORTED_SCHEMA: "unsupported_schema",
  PAYLOAD_TOO_LARGE: "payload_too_large",
  DUPLICATE_EVENT: "duplicate_event",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  INTERNAL_GATEWAY_ERROR: "internal_gateway_error"
});

const GATEWAY_FORBIDDEN_ACTIVITIES = Object.freeze([
  "persist_business_data",
  "ai_decision",
  "economy_calculation",
  "trigger_animation",
  "direct_graphics_communication"
]);

/** Canon gateway journey before Validator (0011 §3–§11). */
const GATEWAY_PIPELINE_STEP = Object.freeze([
  "input_listener",
  "source_detector",
  "authentication_checker",
  "rate_limiter",
  "payload_parser",
  "metadata_builder",
  "event_normalizer",
  "security_filter",
  "duplicate_detector",
  "gateway_logger",
  "validator_connector"
]);

/** Current MIA adapters mapped to unified gateway contract (0011 §18). */
const MIA_GATEWAY_ADAPTERS = Object.freeze({
  [GATEWAY_SOURCE.TIKTOK]: Object.freeze({
    name: "TikFinity Ingest",
    transport: INPUT_TRANSPORT.HTTP,
    runtime: ["routes/ingest.js", "scripts/MIA_INGEST_HTTP_HOST.js"]
  }),
  [GATEWAY_SOURCE.KICK]: Object.freeze({
    name: "Kick Adapter",
    transport: INPUT_TRANSPORT.WEBSOCKET,
    runtime: ["scripts/MIA_KICK_BRIDGE.js"]
  }),
  [GATEWAY_SOURCE.OBS]: Object.freeze({
    name: "OBS WebSocket Listener",
    transport: INPUT_TRANSPORT.WEBSOCKET,
    runtime: ["index.js", "obs-websocket-js"]
  }),
  [GATEWAY_SOURCE.STREAMER_BOT]: Object.freeze({
    name: "Streamer.bot Forwarder",
    transport: INPUT_TRANSPORT.HTTP,
    runtime: ["routes/ingest.js"],
    status: "legacy_forward"
  })
});

const GATEWAY_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-core/eventGateway.js",
  "routes/ingest.js",
  "shared/platform_normalizers/normalize_event.js",
  "scripts/MIA_RUNTIME_SECURITY.js",
  "scripts/MIA_INGEST_GUARD.js",
  "scripts/MIA_KICK_BRIDGE.js"
]);

const GATEWAY_VERSION = "1.0.0";

function isGatewaySource(value) {
  return typeof value === "string" && Object.values(GATEWAY_SOURCE).includes(value);
}

function isGatewayErrorCode(value) {
  return typeof value === "string" && Object.values(GATEWAY_ERROR_CODE).includes(value);
}

function resolveEnvironment(env = process.env) {
  const raw = String(env.NODE_ENV || env.MIA_ENV || "production").toLowerCase();
  if (raw === "development" || raw === "dev") return "development";
  if (raw === "test" || raw === "testing") return "testing";
  return "production";
}

function createGatewayMetadata(input = {}) {
  const eventId = String(input.eventId || "").trim();
  if (!eventId) {
    throw new Error("eventId is required for gateway metadata");
  }

  const gatewayId =
    typeof input.gatewayId === "string" && input.gatewayId.trim()
      ? input.gatewayId.trim()
      : `gw-${crypto.randomUUID()}`;

  const requestId =
    typeof input.requestId === "string" && input.requestId.trim()
      ? input.requestId.trim()
      : `req-${crypto.randomUUID()}`;

  const correlationId = ensureCorrelationId({
    eventId,
    correlationId: input.correlationId,
    traceId: input.traceId
  });

  const source = String(input.source || GATEWAY_SOURCE.TIKTOK);
  if (!isGatewaySource(source)) {
    throw new Error(`invalid gateway source: ${source}`);
  }

  return Object.freeze({
    gatewayId,
    eventId,
    correlationId,
    source,
    receiveTime: input.receiveTime != null ? String(input.receiveTime) : new Date().toISOString(),
    gatewayVersion: String(input.gatewayVersion || GATEWAY_VERSION),
    sessionId: String(input.sessionId || correlationId),
    environment: String(input.environment || resolveEnvironment()),
    schemaVersion: String(input.schemaVersion || EVENT_SCHEMA_VERSION),
    requestId
  });
}

function createGatewayLogRecord(input = {}) {
  const requestId = String(input.requestId || "").trim();
  if (!requestId) {
    throw new Error("requestId is required");
  }

  return Object.freeze({
    requestId,
    receivedAt: input.receivedAt != null ? Number(input.receivedAt) : Date.now(),
    source: String(input.source || "unknown"),
    payloadBytes: Number.isFinite(input.payloadBytes) ? input.payloadBytes : 0,
    processingDurationMs:
      input.processingDurationMs != null ? Number(input.processingDurationMs) : null,
    result: String(input.result || "accepted"),
    errorCode: input.errorCode != null ? String(input.errorCode) : null,
    errorMessage: input.errorMessage != null ? String(input.errorMessage) : null
  });
}

function createGatewayError(input = {}) {
  const code = String(input.code || GATEWAY_ERROR_CODE.INTERNAL_GATEWAY_ERROR);
  if (!isGatewayErrorCode(code)) {
    throw new Error(`invalid gateway error code: ${code}`);
  }
  return Object.freeze({
    code,
    message: String(input.message || code),
    requestId: input.requestId != null ? String(input.requestId) : null,
    at: input.at != null ? Number(input.at) : Date.now()
  });
}

function assertGatewayForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !GATEWAY_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function describeGatewayPipeline() {
  return GATEWAY_PIPELINE_STEP.join(" → ");
}

function listGatewayAdapters() {
  return Object.entries(MIA_GATEWAY_ADAPTERS).map(([source, adapter]) => ({
    source,
    ...adapter
  }));
}

module.exports = {
  GATEWAY_COMPONENT,
  GATEWAY_COMPONENT_ORDER,
  GATEWAY_SOURCE,
  STREAM_PLATFORM_SOURCES,
  INPUT_TRANSPORT,
  GATEWAY_METADATA_FIELDS,
  GATEWAY_ERROR_CODE,
  GATEWAY_FORBIDDEN_ACTIVITIES,
  GATEWAY_PIPELINE_STEP,
  MIA_GATEWAY_ADAPTERS,
  GATEWAY_RUNTIME_ANCHORS,
  GATEWAY_VERSION,
  isGatewaySource,
  isGatewayErrorCode,
  resolveEnvironment,
  createGatewayMetadata,
  createGatewayLogRecord,
  createGatewayError,
  assertGatewayForbiddenActivity,
  describeGatewayPipeline,
  listGatewayAdapters
};
