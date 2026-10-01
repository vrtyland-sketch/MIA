"use strict";

/**
 * Master Canon 0005 — naming rules (§11).
 */

const FORBIDDEN_NAME_SUFFIX_CHAIN = /(Manager|Handler|Controller)(Engine|Service|System)(Engine|Service|System)?$/i;

const LAYER_SUFFIX_HINTS = Object.freeze({
  Engine: "engine",
  Service: "service",
  Module: "module",
  Component: "component",
  System: "system",
  Subsystem: "subsystem"
});

function validateArchitectureName(name = "") {
  const errors = [];
  const safe = String(name || "").trim();
  if (!safe) {
    return { ok: false, errors: ["empty_name"], normalized: null };
  }
  if (safe.length > 64) errors.push("name_too_long");
  if (/\s/.test(safe)) errors.push("contains_whitespace");
  if (FORBIDDEN_NAME_SUFFIX_CHAIN.test(safe)) errors.push("stacked_suffix_chain");
  if (/ManagerEngineSystem|HandlerServiceSystem/i.test(safe)) errors.push("ambiguous_stacked_name");

  return {
    ok: errors.length === 0,
    errors,
    normalized: errors.length === 0 ? safe : null
  };
}

function inferLayerFromName(name = "") {
  const n = String(name || "");
  if (/Subsystem$/i.test(n)) return "subsystem";
  if (/System$/i.test(n) && !/Subsystem$/i.test(n)) return "system";
  if (/Module$/i.test(n)) return "module";
  if (/Engine$/i.test(n)) return "engine";
  if (/Service$/i.test(n)) return "service";
  if (/Component$/i.test(n)) return "component";
  return null;
}

module.exports = {
  LAYER_SUFFIX_HINTS,
  validateArchitectureName,
  inferLayerFromName
};
