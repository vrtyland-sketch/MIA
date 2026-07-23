"use strict";

/**
 * Assemble grouped spam-session host bindings from flat index bindings.
 */

function buildSpamSessionHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      spamConfig: b.spamConfig
    }
  };
}

module.exports = { buildSpamSessionHost };
