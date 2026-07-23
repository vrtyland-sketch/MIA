"use strict";

/**
 * Phase 4 — User Mode stub (not a full product).
 * Default OFF. Enable only with MIA_USER_MODE=1.
 * Multi-tenant is explicitly deferred — see docs/MIA_PHASE4_PROGRESS.md.
 */

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

/**
 * Default OFF. Unset or MIA_USER_MODE=0 → false.
 */
function isUserModeEnabled(runtimeConfig = {}) {
  const env = envFlag("MIA_USER_MODE");
  if (env === true) return true;
  if (env === false) return false;
  const cfg = runtimeConfig?.phase4?.userMode ?? runtimeConfig?.userMode;
  if (cfg && cfg.enabled === true) return true;
  return false;
}

function getUserModePublicSnapshot(runtimeConfig = {}) {
  const enabled = isUserModeEnabled(runtimeConfig);
  return {
    enabled,
    stub: true,
    multiTenant: false,
    multiTenantStatus: "deferred",
    note: enabled
      ? "User Mode flag ON — stub only; no multi-tenant product surface"
      : "User Mode OFF (default). Set MIA_USER_MODE=1 to acknowledge stub flag."
  };
}

module.exports = {
  isUserModeEnabled,
  getUserModePublicSnapshot
};
