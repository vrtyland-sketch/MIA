"use strict";

/**
 * Periodic runtime loops — bowl, capybara, proactive host, duel sync, eyes, matting.
 * Phase 1: also starts light stream watchdog (OBS / ingest health).
 */

const streamWatchdogModule = require("../core/stream-watchdog");

function createRuntimeLoops(deps = {}) {
  const timers = [];

  const {
    runtimeConfig,
    writeLog,
    bowlEngine,
    getKojnozoutState,
    setKojnozoutState,
    getStreamState,
    videoEngine,
    bowlFullVideoModule,
    getOutputState,
    executeOverlay,
    capybaraFlowModule,
    getEcosystemState,
    deliverCapybaraWaitPrompt,
    proactiveHostModule,
    getOverlayState,
    serverStartedAt,
    syncSoloStreamObsScene,
    deliverProactiveHostMoment,
    runDuelPeerSync,
    getObsConnected,
    getLastIngestSummary,
    ensureObsConnected,
    forceReconnectObs,
    getMiaEyes,
    getMattingIngestBridge
  } = deps;

  function every(ms, fn) {
    timers.push(setInterval(fn, ms));
  }

  every(750, () => {
    try {
      if (typeof bowlEngine?.processBowlCycle !== "function") return;

      const kojnozoutState = getKojnozoutState?.();
      const streamState = getStreamState?.();
      const outputState = getOutputState?.();

      const result = bowlEngine.processBowlCycle(kojnozoutState, {
        runtimeConfig,
        streamState
      });

      if (result?.state && typeof setKojnozoutState === "function") {
        setKojnozoutState(result.state);
      }

      if (
        result?.event === "FULL_BOWL_TRIGGER" &&
        videoEngine &&
        typeof videoEngine.playSpecialEvent === "function" &&
        typeof bowlFullVideoModule?.resolveBowlCycleSpecialPlayback === "function"
      ) {
        const bowlPlan = bowlFullVideoModule.resolveBowlCycleSpecialPlayback({
          runtimeConfig,
          outputState,
          kojnozoutState: result?.state || kojnozoutState,
          now: Date.now()
        });

        if (bowlPlan.play) {
          if (typeof bowlFullVideoModule.noteBowlFullSpecialPlayed === "function") {
            bowlFullVideoModule.noteBowlFullSpecialPlayed(outputState, {
              at: Date.now(),
              reason: bowlPlan.reason,
              tier: bowlPlan.tier,
              sourceName: bowlPlan.sourceName
            });
          }

          writeLog("mia-events", {
            ts: Date.now(),
            stage: "bowl_cycle_t4_started",
            tier: bowlPlan.tier,
            sourceName: bowlPlan.sourceName || null,
            reason: bowlPlan.reason
          });

          void videoEngine
            .playSpecialEvent(bowlPlan.tier || "T4", { eventType: "bowl_full", platform: "mia" }, {
              sourceName: bowlPlan.sourceName || undefined,
              reason: bowlPlan.reason,
              waitForMediaEnd: false
            })
            .catch((err) => {
              writeLog("mia-errors", {
                source: "bowl_cycle_t4",
                error: err.message
              });
            });
        }
      }

      if (result?.overlayPayload && typeof executeOverlay === "function") {
        executeOverlay(result.overlayPayload, { source: "bowl" });
      }
    } catch (err) {
      writeLog("mia-errors", {
        source: "bowl_loop",
        error: err.message
      });
    }
  });

  every(2000, () => {
    void (async () => {
      try {
        if (typeof capybaraFlowModule?.tickCapybaraFlow !== "function") return;

        const outputState = getOutputState?.();
        const streamState = getStreamState?.();

        const tick = capybaraFlowModule.tickCapybaraFlow(outputState, {
          streamState,
          outputState,
          ecosystemState: getEcosystemState?.(),
          kojnozoutState: getKojnozoutState?.()
        });

        if (tick.action !== "send_wait_prompt") return;

        const payload = capybaraFlowModule.buildWaitPromptPayload(
          outputState,
          tick.session
        );
        await deliverCapybaraWaitPrompt(payload);
      } catch (err) {
        writeLog("mia-errors", {
          source: "capybara_flow_tick",
          error: err.message
        });
      }
    })();
  });

  every(20000, () => {
    void (async () => {
      try {
        if (typeof proactiveHostModule?.evaluateProactiveHostTick !== "function") return;

        const tick = proactiveHostModule.evaluateProactiveHostTick({
          streamState: getStreamState?.(),
          outputState: getOutputState?.(),
          overlayState: getOverlayState?.(),
          serverStartedAt,
          runtimeConfig,
          kojnozoutState: getKojnozoutState?.()
        });

        await syncSoloStreamObsScene(tick);

        if (!tick?.shouldSpeak) return;

        const payload =
          typeof proactiveHostModule.buildProactiveHostResult === "function"
            ? proactiveHostModule.buildProactiveHostResult(tick, getOutputState?.())
            : tick.overlayPayload;

        if (!payload) return;

        await deliverProactiveHostMoment(payload);

        if (tick.behavior === "solo_stream") {
          await syncSoloStreamObsScene(tick);
        }
      } catch (err) {
        writeLog("mia-errors", {
          source: "proactive_host_loop",
          error: err.message
        });
      }
    })();
  });

  every(Math.max(2000, Number(runtimeConfig?.duel?.syncIntervalMs || 3000)), () => {
    runDuelPeerSync().catch((err) => {
      writeLog("mia-errors", {
        source: "duel_peer_sync",
        error: err.message
      });
    });
  });

  every(Math.max(5000, Number(runtimeConfig?.eyes?.webcamPollMs || 8000)), () => {
    void (async () => {
      try {
        const miaEyes = typeof getMiaEyes === "function" ? getMiaEyes() : null;
        if (!getObsConnected?.() || !miaEyes || typeof miaEyes.syncWebcamVisibility !== "function") {
          return;
        }
        await miaEyes.syncWebcamVisibility();
      } catch (err) {
        writeLog("mia-errors", {
          source: "mia_eyes_webcam",
          error: err.message
        });
      }
    })();
  });

  every(Math.max(800, Number(runtimeConfig?.mattingIngest?.pollMs || 1200)), () => {
    void (async () => {
      try {
        const mattingIngestBridge =
          typeof getMattingIngestBridge === "function" ? getMattingIngestBridge() : null;
        if (
          !getObsConnected?.() ||
          !mattingIngestBridge ||
          typeof mattingIngestBridge.tick !== "function"
        ) {
          return;
        }
        await mattingIngestBridge.tick();
      } catch (err) {
        writeLog("mia-errors", {
          source: "matting_ingest_bridge",
          error: err.message
        });
      }
    })();
  });

  // Phase 1 stream watchdog — own interval (not counted in timerCount).
  let streamWatchdog = null;
  try {
    if (streamWatchdogModule.isWatchdogEnabled(runtimeConfig)) {
      streamWatchdog = streamWatchdogModule.createStreamWatchdog({
        runtimeConfig,
        writeLog,
        getObsConnected,
        getLastIngestSummary,
        ensureObsConnected,
        forceReconnectObs
      });
      streamWatchdog.start();
    }
  } catch (err) {
    if (typeof writeLog === "function") {
      writeLog("mia-errors", {
        source: "stream_watchdog_boot",
        error: err.message
      });
    }
  }

  function stop() {
    for (const timer of timers) {
      clearInterval(timer);
    }
    timers.length = 0;
    if (streamWatchdog && typeof streamWatchdog.stop === "function") {
      streamWatchdog.stop();
      streamWatchdog = null;
    }
  }

  return {
    stop,
    timerCount: () => timers.length,
    getStreamWatchdog: () => streamWatchdog
  };
}

module.exports = { createRuntimeLoops };
