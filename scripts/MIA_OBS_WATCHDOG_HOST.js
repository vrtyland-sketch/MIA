"use strict";

/**
 * Assemble grouped OBS watchdog host bindings from flat index bindings.
 */

function buildObsWatchdogHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      config: b.config
    },
    handlers: {
      isProcessRunning: b.isProcessRunning,
      log: b.log,
      now: b.now
    }
  };
}

module.exports = { buildObsWatchdogHost };
