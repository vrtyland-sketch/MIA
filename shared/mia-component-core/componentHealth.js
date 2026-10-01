"use strict";

/**
 * Master Canon 0004 — component health states (§10).
 */

const COMPONENT_HEALTH = Object.freeze({
  OK: "ok",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical"
});

function isComponentHealth(value) {
  return typeof value === "string" && Object.values(COMPONENT_HEALTH).includes(value);
}

function worstHealth(a, b) {
  const rank = {
    [COMPONENT_HEALTH.OK]: 0,
    [COMPONENT_HEALTH.WARNING]: 1,
    [COMPONENT_HEALTH.ERROR]: 2,
    [COMPONENT_HEALTH.CRITICAL]: 3
  };
  const ra = rank[isComponentHealth(a) ? a : COMPONENT_HEALTH.OK] || 0;
  const rb = rank[isComponentHealth(b) ? b : COMPONENT_HEALTH.OK] || 0;
  return ra >= rb ? a : b;
}

module.exports = {
  COMPONENT_HEALTH,
  isComponentHealth,
  worstHealth
};
