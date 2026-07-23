"use strict";

/**
 * Flatten grouped output-policy host bindings for createOutputPolicy.
 */

function buildOutputPolicyCtx(host = {}) {
  const { core = {} } = host;

  return core.policyInput || {};
}

module.exports = { buildOutputPolicyCtx };
