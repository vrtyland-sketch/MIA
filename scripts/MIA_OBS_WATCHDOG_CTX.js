"use strict";

/**
 * Flatten grouped OBS watchdog host bindings for createObsWatchdog.
 */

function buildObsWatchdogCtx(host = {}) {
  const { core = {}, handlers = {} } = host;

  return {
    config: core.config,
    isProcessRunning: handlers.isProcessRunning,
    log: handlers.log,
    now: handlers.now
  };
}

module.exports = { buildObsWatchdogCtx };
