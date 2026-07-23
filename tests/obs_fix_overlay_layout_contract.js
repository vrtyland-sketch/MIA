"use strict";

const assert = require("assert/strict");
const { applyObsOverlayLayout, CORE_OVERLAY_SOURCES } = require("../scripts/obs_fix_overlay_layout");

assert.equal(typeof applyObsOverlayLayout, "function");
assert.ok(Array.isArray(CORE_OVERLAY_SOURCES));
assert.ok(CORE_OVERLAY_SOURCES.includes("KOJNOZROUT_RUNTIME"));

console.log("obs_fix_overlay_layout_contract OK");
