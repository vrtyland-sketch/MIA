"use strict";

/**
 * Engine 2.0 feature flag — default OFF (no stream behavior change).
 * Enable: MIA_ENGINE2_STUB=1
 */

function isEngine2StubEnabled(env = process.env) {
  return String(env.MIA_ENGINE2_STUB || "0").trim() === "1";
}

module.exports = {
  isEngine2StubEnabled
};
