"use strict";

/**
 * Phase 1 — light stream watchdog.
 *
 * Periodic health of OBS WS / ingest freshness. Attempts safe reconnect
 * via injected hooks only (ensureObsConnected / forceReconnectObs).
 * Never kills processes, never spawns aggressive recovery.
 *
 * Enable: default ON when started; disable with MIA_STREAM_WATCHDOG=0
 * or runtimeConfig.phase1.watchdog.enabled === false.
 */

const runtimeState = require("./runtime-state");

const DEFAULT_INTERVAL_MS = 15000;
const DEFAULT_INGEST_STALE_MS = 120000;
const DEFAULT_RECONNECT_COOLDOWN_MS = 45000;

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function envDisabled(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isWatchdogEnabled(runtimeConfig = {}) {
  if (envDisabled("MIA_STREAM_WATCHDOG")) return false;
  if (envFlag("MIA_STREAM_WATCHDOG")) return true;
  const wd = runtimeConfig?.phase1?.watchdog ?? runtimeConfig?.watchdog;
  if (wd && wd.enabled === false) return false;
  if (wd && wd.enabled === true) return true;
  // Default ON once started by runtime loops (light health only).
  return true;
}

function createStreamWatchdog(options = {}) {
  const {
    getObsConnected = () => false,
    getLastIngestSummary = () => null,
    ensureObsConnected = null,
    forceReconnectObs = null,
    writeLog = null,
    runtimeConfig = {},
    intervalMs = null,
    ingestStaleMs = null,
    reconnectCooldownMs = null
  } = options;

  const wdCfg = runtimeConfig?.phase1?.watchdog || runtimeConfig?.watchdog || {};
  const pollMs = Math.max(
    5000,
    toNumber(intervalMs ?? wdCfg.intervalMs, DEFAULT_INTERVAL_MS)
  );
  const staleMs = Math.max(
    15000,
    toNumber(ingestStaleMs ?? wdCfg.ingestStaleMs, DEFAULT_INGEST_STALE_MS)
  );
  const cooldownMs = Math.max(
    10000,
    toNumber(reconnectCooldownMs ?? wdCfg.reconnectCooldownMs, DEFAULT_RECONNECT_COOLDOWN_MS)
  );

  let timer = null;
  let ticking = false;
  let lastReconnectAt = 0;
  let lastSnapshot = null;
  let consecutiveObsDown = 0;

  function log(stage, payload = {}) {
    if (typeof writeLog !== "function") return;
    try {
      writeLog("mia-events", { ts: Date.now(), stage, ...payload });
    } catch (_err) {
      /* ignore */
    }
  }

  function readIngestAge(now = Date.now()) {
    const summary = typeof getLastIngestSummary === "function" ? getLastIngestSummary() : null;
    if (!summary || typeof summary !== "object") {
      return { hasIngest: false, ageMs: null, summary: null };
    }
    const at = toNumber(
      summary.at ?? summary.ts ?? summary.updatedAt ?? summary.receivedAt,
      0
    );
    if (!at) return { hasIngest: true, ageMs: null, summary };
    return { hasIngest: true, ageMs: Math.max(0, now - at), summary };
  }

  function persistHealth(snapshot) {
    lastSnapshot = snapshot;
    try {
      const prev =
        runtimeState.getLastRuntimeState() || runtimeState.loadRuntimeState() || null;
      // Never invent a fresh runtime-state from watchdog alone (avoids wiping/polluting seeds).
      if (!prev || typeof prev !== "object") return;
      runtimeState.scheduleSaveRuntimeState(
        {
          koj: prev.koj || {},
          streamState: prev.bowl || {},
          queueSnapshot: prev.queue || null,
          extra: {
            watchdog: snapshot
          }
        },
        { delayMs: 800 }
      );
    } catch (_err) {
      /* ignore */
    }
  }

  async function maybeReconnectObs(trigger) {
    const now = Date.now();
    if (now - lastReconnectAt < cooldownMs) {
      return { attempted: false, reason: "cooldown" };
    }
    lastReconnectAt = now;

    // Prefer soft ensure; escalate to force only after repeated downs.
    const soft = typeof ensureObsConnected === "function" ? ensureObsConnected : null;
    const hard = typeof forceReconnectObs === "function" ? forceReconnectObs : null;

    try {
      if (consecutiveObsDown >= 3 && hard) {
        log("stream_watchdog_obs_force_reconnect", { trigger });
        const result = await hard(trigger);
        return { attempted: true, mode: "force", result };
      }
      if (soft) {
        log("stream_watchdog_obs_ensure", { trigger });
        const result = await soft(trigger);
        return { attempted: true, mode: "ensure", result };
      }
      if (hard) {
        log("stream_watchdog_obs_force_reconnect", { trigger, fallback: true });
        const result = await hard(trigger);
        return { attempted: true, mode: "force", result };
      }
      return { attempted: false, reason: "no_hooks" };
    } catch (err) {
      log("stream_watchdog_reconnect_error", {
        trigger,
        error: err && err.message ? err.message : String(err)
      });
      return { attempted: true, error: err.message };
    }
  }

  async function tick() {
    if (ticking) return lastSnapshot;
    if (!isWatchdogEnabled(runtimeConfig)) return lastSnapshot;
    ticking = true;
    const now = Date.now();

    try {
      const obsConnected =
        typeof getObsConnected === "function" ? Boolean(getObsConnected()) : false;
      const ingest = readIngestAge(now);
      const ingestStale =
        ingest.hasIngest && ingest.ageMs != null ? ingest.ageMs > staleMs : false;

      if (!obsConnected) consecutiveObsDown += 1;
      else consecutiveObsDown = 0;

      let reconnect = { attempted: false };
      if (!obsConnected) {
        reconnect = await maybeReconnectObs("stream_watchdog");
      }

      const snapshot = {
        ok: obsConnected && !ingestStale,
        at: now,
        obsConnected,
        consecutiveObsDown,
        ingest: {
          hasIngest: ingest.hasIngest,
          ageMs: ingest.ageMs,
          stale: ingestStale,
          staleThresholdMs: staleMs
        },
        reconnect: {
          attempted: reconnect.attempted === true,
          mode: reconnect.mode || null,
          reason: reconnect.reason || null,
          lastReconnectAt
        }
      };

      persistHealth(snapshot);

      if (!obsConnected || ingestStale) {
        log("stream_watchdog_health", {
          obsConnected,
          ingestStale,
          ingestAgeMs: ingest.ageMs,
          consecutiveObsDown,
          reconnectAttempted: snapshot.reconnect.attempted
        });
      }

      return snapshot;
    } finally {
      ticking = false;
    }
  }

  function start() {
    if (timer) return { ok: true, already: true };
    if (!isWatchdogEnabled(runtimeConfig)) {
      return { ok: false, skipped: true, reason: "disabled" };
    }
    void tick();
    timer = setInterval(() => {
      void tick();
    }, pollMs);
    if (typeof timer.unref === "function") timer.unref();
    log("stream_watchdog_started", { intervalMs: pollMs, staleMs, cooldownMs });
    return { ok: true, intervalMs: pollMs };
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function getSnapshot() {
    return lastSnapshot;
  }

  return {
    start,
    stop,
    tick,
    getSnapshot,
    get intervalMs() {
      return pollMs;
    }
  };
}

/** Process-wide instance for runtime loops. */
let sharedWatchdog = null;

function getSharedStreamWatchdog(options = {}) {
  if (!sharedWatchdog) {
    sharedWatchdog = createStreamWatchdog(options);
  }
  return sharedWatchdog;
}

function resetSharedStreamWatchdogForTest() {
  if (sharedWatchdog) {
    try {
      sharedWatchdog.stop();
    } catch (_err) {
      /* ignore */
    }
  }
  sharedWatchdog = null;
}

module.exports = {
  DEFAULT_INTERVAL_MS,
  DEFAULT_INGEST_STALE_MS,
  DEFAULT_RECONNECT_COOLDOWN_MS,
  isWatchdogEnabled,
  createStreamWatchdog,
  getSharedStreamWatchdog,
  resetSharedStreamWatchdogForTest
};
