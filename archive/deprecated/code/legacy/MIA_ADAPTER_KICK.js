"use strict";

/**
 * MIA_ADAPTER_KICK.js
 *
 * Kompatibilní adapter vrstva nad MIA_KICK_BRIDGE.js
 *
 * Účel:
 * - zachovat starší importy / bootstrap flow
 * - neposílat Kick data druhou paralelní cestou
 * - delegovat realtime start/stop na jediný bridge modul
 *
 * Tohle je záměrně tenká vrstva.
 * Source-of-truth pro realtime websocket bridge je:
 *   ../scripts/MIA_KICK_BRIDGE.js
 */

const configModule = require("../scripts/MIA_CONFIG");
const kickBridgeModule = require("../scripts/MIA_KICK_BRIDGE");

const runtimeConfig =
  configModule && configModule.runtimeConfig
    ? configModule.runtimeConfig
    : (typeof configModule.buildRuntimeConfig === "function"
        ? configModule.buildRuntimeConfig(process.env)
        : null);

const startKickRealtimeBridge =
  typeof kickBridgeModule.startKickRealtimeBridge === "function"
    ? kickBridgeModule.startKickRealtimeBridge
    : null;

const stopKickRealtimeBridge =
  typeof kickBridgeModule.stopKickRealtimeBridge === "function"
    ? kickBridgeModule.stopKickRealtimeBridge
    : null;

function log(...args) {
  console.log("[MIA_ADAPTER_KICK]", ...args);
}

function warn(...args) {
  console.warn("[MIA_ADAPTER_KICK]", ...args);
}

function error(...args) {
  console.error("[MIA_ADAPTER_KICK]", ...args);
}

function resolveKickConfig(override = {}) {
  const baseKick =
    runtimeConfig && runtimeConfig.kick && typeof runtimeConfig.kick === "object"
      ? runtimeConfig.kick
      : {};

  return {
    enabled:
      Object.prototype.hasOwnProperty.call(override, "enabled")
        ? Boolean(override.enabled)
        : Boolean(baseKick.enabled),

    mode:
      typeof override.mode === "string" && override.mode.trim()
        ? override.mode.trim()
        : (typeof baseKick.mode === "string" && baseKick.mode.trim()
            ? baseKick.mode.trim()
            : "realtime"),

    ingestUrl:
      typeof override.ingestUrl === "string" && override.ingestUrl.trim()
        ? override.ingestUrl.trim()
        : (typeof baseKick.ingestUrl === "string" && baseKick.ingestUrl.trim()
            ? baseKick.ingestUrl.trim()
            : "http://127.0.0.1:3000/ingest"),

    chatroomId:
      typeof override.chatroomId === "string" && override.chatroomId.trim()
        ? override.chatroomId.trim()
        : String(baseKick.chatroomId || "95746130"),

    pusherKey:
      typeof override.pusherKey === "string" && override.pusherKey.trim()
        ? override.pusherKey.trim()
        : (typeof baseKick.pusherKey === "string" && baseKick.pusherKey.trim()
            ? baseKick.pusherKey.trim()
            : "32cbd69e4b950bf97679"),

    cluster:
      typeof override.cluster === "string" && override.cluster.trim()
        ? override.cluster.trim()
        : (typeof baseKick.cluster === "string" && baseKick.cluster.trim()
            ? baseKick.cluster.trim()
            : "us2")
  };
}

/**
 * Starší kompatibilní start point.
 * Používej ho jen jako fallback bootstrap z index.js.
 * Ve skutečnosti deleguje na MIA_KICK_BRIDGE.
 */
function startKickAdapter(override = {}) {
  if (typeof startKickRealtimeBridge !== "function") {
    throw new Error("MIA_ADAPTER_KICK: startKickRealtimeBridge is not available");
  }

  const kick = resolveKickConfig(override);

  if (!kick.enabled) {
    log("Kick adapter disabled by config");
    return {
      ok: false,
      reason: "disabled"
    };
  }

  if (kick.mode !== "realtime") {
    warn(`Kick adapter mode "${kick.mode}" is not handled here, skipping`);
    return {
      ok: false,
      reason: "unsupported_mode",
      mode: kick.mode
    };
  }

  log("Delegating realtime startup to MIA_KICK_BRIDGE", {
    ingestUrl: kick.ingestUrl,
    chatroomId: kick.chatroomId,
    cluster: kick.cluster
  });

  return startKickRealtimeBridge({
    ingestUrl: kick.ingestUrl,
    chatroomId: kick.chatroomId,
    pusherKey: kick.pusherKey,
    cluster: kick.cluster
  });
}

function stopKickAdapter() {
  if (typeof stopKickRealtimeBridge !== "function") {
    warn("stopKickRealtimeBridge is not available");
    return {
      ok: false,
      reason: "bridge_stop_missing"
    };
  }

  try {
    stopKickRealtimeBridge();
    log("Kick adapter stopped");
    return {
      ok: true,
      reason: "stopped"
    };
  } catch (err) {
    error("Kick adapter stop failed:", err.message);
    return {
      ok: false,
      reason: "stop_failed",
      message: err.message
    };
  }
}

function getKickAdapterConfig(override = {}) {
  return resolveKickConfig(override);
}

module.exports = {
  startKickAdapter,
  stopKickAdapter,
  getKickAdapterConfig
};