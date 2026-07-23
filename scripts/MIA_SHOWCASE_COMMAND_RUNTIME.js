"use strict";

/**
 * Chat command handlers for koj-state and streamer showcase sequences.
 */

function createShowcaseCommandRuntime(deps = {}) {
  const {
    streamerShowcaseModule,
    streamerIdentityModule,
    runtimeConfig,
    safeString,
    getUserLabel,
    writeLog,
    executeOverlay,
    speakMiaShowcaseLine,
    overlayStateModule,
    getOverlayState,
    videoEngine,
    kojTestModeModule,
    kojnozoutVitalsModule,
    kojnozoutDuelModule,
    getKojnozoutState,
    setKojnozoutState,
    getDuelState,
    setDuelState,
    scheduleWorldSave,
    getEnv
  } = deps;

  function readNormalizedMessage(normalized = {}) {
    return safeString(
      normalized.message ||
        normalized.comment ||
        normalized.content ||
        normalized.text
    );
  }

  async function tryHandleKojStateShowcaseCommand(normalized = {}) {
    if (typeof streamerShowcaseModule?.parseKojStateShowcaseCommand !== "function") {
      return null;
    }

    const parsed = streamerShowcaseModule.parseKojStateShowcaseCommand(
      readNormalizedMessage(normalized)
    );
    if (!parsed) return null;

    const userLabel = getUserLabel(normalized);
    const verdict =
      typeof streamerIdentityModule?.verifyBoss === "function"
        ? streamerIdentityModule.verifyBoss(normalized, runtimeConfig)
        : { ok: false, reason: "identity_module_missing" };

    if (!verdict.ok) {
      writeLog("mia-events", {
        ts: Date.now(),
        stage: "koj_state_showcase_denied",
        reason: verdict.reason,
        userLabel,
        userId: verdict.identity?.userId || null,
        platform: verdict.identity?.platform || null
      });
      const overlay = streamerShowcaseModule.buildRejectOverlay("streamer_only", userLabel);
      await executeOverlay(overlay, { source: "koj_state_showcase", priority: 4 });
      return {
        handled: true,
        body: { ok: true, handled: true, rejected: "streamer_only", reason: verdict.reason }
      };
    }

    if (verdict.captured) {
      writeLog("mia-events", {
        ts: Date.now(),
        stage: "koj_state_showcase_boss_captured",
        userLabel,
        userId: verdict.identity?.userId || null,
        platform: verdict.identity?.platform || null,
        persisted: verdict.persisted === true
      });
    }

    const snapshot =
      typeof streamerShowcaseModule.getShowcaseSnapshot === "function"
        ? streamerShowcaseModule.getShowcaseSnapshot()
        : null;

    if (snapshot?.active) {
      const overlay = streamerShowcaseModule.buildBusyOverlay(userLabel);
      await executeOverlay(overlay, { source: "koj_state_showcase", priority: 4 });
      return { handled: true, body: { ok: true, handled: true, rejected: "showcase_busy" } };
    }

    void streamerShowcaseModule
      .runKojStateShowcase({
        userLabel,
        runtimeConfig,
        executeOverlay,
        speakLine: speakMiaShowcaseLine
      })
      .catch((err) => {
        writeLog("mia-errors", { source: "koj_state_showcase", error: err.message });
      });

    return {
      handled: true,
      body: { ok: true, handled: true, kind: "koj_state_showcase", queued: true }
    };
  }

  async function tryHandleStreamerShowcaseCommand(normalized = {}) {
    if (typeof streamerShowcaseModule?.parseStreamerShowcaseCommand !== "function") {
      return null;
    }

    const parsed = streamerShowcaseModule.parseStreamerShowcaseCommand(
      readNormalizedMessage(normalized)
    );
    if (!parsed) return null;

    const userLabel = getUserLabel(normalized);
    const verdict =
      typeof streamerIdentityModule?.verifyBoss === "function"
        ? streamerIdentityModule.verifyBoss(normalized, runtimeConfig)
        : { ok: false, reason: "identity_module_missing" };

    if (!verdict.ok) {
      writeLog("mia-events", {
        ts: Date.now(),
        stage: "streamer_showcase_denied",
        reason: verdict.reason,
        userLabel,
        userId: verdict.identity?.userId || null,
        platform: verdict.identity?.platform || null
      });
      const overlay = streamerShowcaseModule.buildRejectOverlay("streamer_only", userLabel);
      await executeOverlay(overlay, { source: "streamer_showcase", priority: 4 });
      return {
        handled: true,
        body: { ok: true, handled: true, rejected: "streamer_only", reason: verdict.reason }
      };
    }

    const snapshot =
      typeof streamerShowcaseModule.getShowcaseSnapshot === "function"
        ? streamerShowcaseModule.getShowcaseSnapshot()
        : null;

    if (snapshot?.active) {
      const overlay = streamerShowcaseModule.buildBusyOverlay(userLabel);
      await executeOverlay(overlay, { source: "streamer_showcase", priority: 4 });
      return {
        handled: true,
        body: { ok: true, handled: true, rejected: "showcase_busy" }
      };
    }

    const overlayState =
      typeof getOverlayState === "function" ? getOverlayState() : {};
    const env = typeof getEnv === "function" ? getEnv() : process.env;

    void streamerShowcaseModule
      .runShowcaseSequence(parsed, {
        userLabel,
        normalized,
        runtimeConfig,
        env,
        executeOverlay,
        overlayStateModule,
        overlayState,
        videoEngine,
        kojTestModeModule,
        kojnozoutVitalsModule,
        kojnozoutDuelModule,
        getKojState: getKojnozoutState,
        setKojState: setKojnozoutState,
        getDuelState,
        setDuelState,
        scheduleWorldSave
      })
      .catch((err) => {
        writeLog("mia-errors", {
          source: "streamer_showcase",
          error: err.message
        });
      });

    return {
      handled: true,
      body: {
        ok: true,
        handled: true,
        kind: "showcase",
        mode: parsed.mode,
        itemId: parsed.itemId || null,
        queued: true
      }
    };
  }

  return { tryHandleKojStateShowcaseCommand, tryHandleStreamerShowcaseCommand };
}

module.exports = { createShowcaseCommandRuntime };
