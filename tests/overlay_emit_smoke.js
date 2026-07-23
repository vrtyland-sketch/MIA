"use strict";

const assert = require("assert/strict");
const { finalizeOverlayEmitResult } = require("../scripts/MIA_OVERLAY_EMIT_RESULT");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("accepted overlay reports emitted even when OBS scene switch is disabled", () => {
  const result = finalizeOverlayEmitResult(
    { accepted: true, text: "ahoj" },
    { ok: true, emitted: true, reason: "ok", meta: {} },
    { emitted: false, reason: "scene_switch_disabled_variant_A" }
  );

  assert.equal(result.emitted, true);
  assert.equal(result.reason, "overlay_state_updated");
});

test("rejected overlay stays not emitted", () => {
  const result = finalizeOverlayEmitResult(
    { accepted: false, reason: "cooldown" },
    { ok: true, emitted: true, reason: "ok", meta: {} },
    { emitted: false, reason: "scene_switch_disabled_variant_A" }
  );

  assert.equal(result.emitted, false);
});
