"use strict";

/**
 * Stream/koj state impact from ingest events + world persistence scheduling.
 */

function createRuntimeStateRuntime(deps = {}) {
  const {
    upper,
    extractSupportPayload,
    extractCommunityImpact,
    streamStateModule,
    getStreamState,
    setStreamState,
    kojnozoutModule,
    getKojnozoutState,
    setKojnozoutState,
    runtimeConfig,
    gameConfig,
    kojnozoutPersistenceModule,
    kojnozoutWorldPersistenceModule,
    getKojnozoutBackpackState,
    getDuelState,
    writeLog
  } = deps;

  function scheduleWorldSave() {
    if (typeof kojnozoutWorldPersistenceModule?.scheduleSaveWorld !== "function") return;
    const backpack =
      typeof getKojnozoutBackpackState === "function" ? getKojnozoutBackpackState() : {};
    const duel = typeof getDuelState === "function" ? getDuelState() : {};
    kojnozoutWorldPersistenceModule.scheduleSaveWorld({
      backpack,
      duel
    });
  }

  function applyRuntimeStateImpact(normalized = {}) {
    const eventType = upper(normalized.eventType || normalized.type);
    let evolutionLevelUp = null;
    let streamState = typeof getStreamState === "function" ? getStreamState() : {};
    let kojnozoutState = typeof getKojnozoutState === "function" ? getKojnozoutState() : {};

    try {
      if (eventType === "GIFT") {
        if (typeof streamStateModule?.applySupportImpact === "function") {
          const result = streamStateModule.applySupportImpact(
            streamState,
            extractSupportPayload(normalized)
          );

          if (result && typeof result === "object") {
            streamState = result.state || result.streamState || result;
            if (typeof setStreamState === "function") setStreamState(streamState);
          }
        }

        if (typeof kojnozoutModule?.applySupportToKojnozout === "function") {
          const result = kojnozoutModule.applySupportToKojnozout(
            kojnozoutState,
            extractSupportPayload(normalized),
            { streamState }
          );

          if (result && typeof result === "object") {
            kojnozoutState = result.state || result.kojnozoutState || result;
            if (typeof setKojnozoutState === "function") setKojnozoutState(kojnozoutState);
            if (result.evolutionLevelUp) {
              evolutionLevelUp = result.evolutionLevelUp;
            }
          }
        }
      }

      if (eventType === "COMMENT") {
        if (typeof streamStateModule?.applyCommunityImpact === "function") {
          const result = streamStateModule.applyCommunityImpact(streamState, normalized, {
            runtimeConfig,
            gameConfig
          });

          if (result && typeof result === "object") {
            streamState = result.state || result.streamState || result;
            if (typeof setStreamState === "function") setStreamState(streamState);
          }
        }

        if (typeof kojnozoutModule?.applyCommunityPingToKojnozout === "function") {
          const result = kojnozoutModule.applyCommunityPingToKojnozout(
            kojnozoutState,
            extractCommunityImpact(normalized),
            {
              user: normalized.user || null,
              eventType,
              ctx: { streamState }
            }
          );

          if (result && typeof result === "object") {
            kojnozoutState = result.state || result.kojnozoutState || result;
            if (typeof setKojnozoutState === "function") setKojnozoutState(kojnozoutState);
            if (result.evolutionLevelUp) {
              evolutionLevelUp = result.evolutionLevelUp;
            }
          }
        }
      }
    } catch (err) {
      writeLog("mia-errors", {
        source: "runtime_state_impact",
        eventType,
        error: err.message
      });
    }

    if (typeof kojnozoutPersistenceModule?.scheduleSaveKojnozoutState === "function") {
      kojnozoutPersistenceModule.scheduleSaveKojnozoutState(kojnozoutState);
    }

    return { evolutionLevelUp, eventType };
  }

  return { applyRuntimeStateImpact, scheduleWorldSave };
}

module.exports = { createRuntimeStateRuntime };
