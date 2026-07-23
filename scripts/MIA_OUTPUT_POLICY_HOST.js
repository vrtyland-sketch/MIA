"use strict";

/**
 * Assemble grouped output-policy host bindings from flat index bindings.
 */

function buildOutputPolicyHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      policyInput: b.policyInput
    }
  };
}

module.exports = { buildOutputPolicyHost };
