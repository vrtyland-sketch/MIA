"use strict";

/**
 * World mode transitions — away/host scene coordination.
 */

function createWorldModeRuntime(deps = {}) {
  const {
    safeString,
    writeLog,
    awayModeModule,
    safeObsCall,
    runtimeConfig,
    getOutputState,
    getEcosystemState,
    overlayStateCache
  } = deps;

  async function applyWorldModeChange(worldMode, source = "runtime") {
    const normalized =
      typeof awayModeModule?.normalizeWorldMode === "function"
        ? awayModeModule.normalizeWorldMode(worldMode, "default")
        : safeString(worldMode, "default");

    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const ecosystemState = typeof getEcosystemState === "function" ? getEcosystemState() : {};
    const previous = outputState.worldMode || ecosystemState.worldMode || "default";
    outputState.worldMode = normalized;
    ecosystemState.worldMode = normalized;

    if (typeof awayModeModule?.applyWorldModeTransition !== "function") {
      return { ok: true, worldMode: normalized };
    }

    try {
      const obsResult = await awayModeModule.applyWorldModeTransition(normalized, {
        outputState,
        ecosystemState,
        runtimeConfig,
        env: process.env,
        safeObsCall,
        writeLog
      });

      writeLog("mia-events", {
        ts: Date.now(),
        stage: "world_mode_changed",
        source,
        previous,
        worldMode: normalized,
        obs: obsResult
      });

      if (overlayStateCache && typeof overlayStateCache.invalidate === "function") {
        overlayStateCache.invalidate();
      }

      return { ok: true, worldMode: normalized, obs: obsResult };
    } catch (err) {
      writeLog("mia-errors", {
        source: "world_mode_obs",
        error: err.message
      });
      return { ok: false, worldMode: normalized, error: err.message };
    }
  }

  return { applyWorldModeChange };
}

module.exports = { createWorldModeRuntime };
