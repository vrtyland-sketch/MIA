"use strict";

const assert = require("assert/strict");
const {
  applyWalkCare,
  tickWalkState,
  resolveWalkVisual
} = require("../scripts/MIA_KOJNOZROUT_WALK");
const {
  buildKojDisplaySnapshot,
  resolveBehaviorContextMood
} = require("../scripts/MIA_KOJNOZROUT_DISPLAY");

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

console.log("\n---- KOJ WALK UNIFY CONTRACT ----\n");

test("resolveWalkVisual marks CARE walk as single visual path", () => {
  const walking = applyWalkCare({ energy: 40, mood: "idle", behavior: "watching" });
  const visual = resolveWalkVisual(walking);
  assert.equal(visual.active, true);
  assert.equal(visual.kind, "care");
  assert.equal(visual.cssWander, true);
  assert.equal(visual.spriteMood, "hop");
  assert.ok(visual.remainingSec > 0);
});

test("tickWalkState keeps resolveWalkVisual aligned", () => {
  const walking = applyWalkCare({ energy: 40, mood: "idle" });
  const ticked = tickWalkState(walking);
  const visual = resolveWalkVisual(ticked);
  assert.equal(ticked.walkActive, true);
  assert.equal(ticked.behavior, "walking");
  assert.equal(visual.kind, "care");
  assert.equal(visual.cssWander, true);
});

test("display snapshot exposes walk for runtime CSS wander", () => {
  const walking = applyWalkCare({ energy: 40, mood: "idle", bowlPercent: 20 });
  const snap = buildKojDisplaySnapshot(walking, {}, Date.now());
  assert.equal(snap.walk.active, true);
  assert.equal(snap.walk.kind, "care");
  assert.equal(snap.walk.cssWander, true);
  assert.equal(resolveBehaviorContextMood(walking, Date.now()), "hop");
});

test("idle state has no care walk visual", () => {
  const visual = resolveWalkVisual({ mood: "idle", behavior: "watching", walkActive: false });
  assert.equal(visual.active, false);
  assert.equal(visual.kind, null);
  assert.equal(visual.cssWander, false);
});

console.log("\n---- KOJ WALK UNIFY CONTRACT SUMMARY ----\n");
if (process.exitCode) process.exit(process.exitCode);
