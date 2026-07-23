"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  resolvePoseCycle,
  POSE_CYCLES,
  WANDER_WALK_MOODS
} = require("../scripts/kojnozrout_pose_frames");

function run() {
  const catalogPath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "assets",
    "kojnozrout",
    "pose-catalog.js"
  );
  assert.ok(fs.existsSync(catalogPath), "pose-catalog.js present (run npm run generate:koj-poses)");

  // full bowl → full cycle, ne stretch
  const fullCycle = resolvePoseCycle({ assetKey: "full", displayMood: "full", wandering: false });
  assert.strictEqual(fullCycle?.id, "full", "full mood maps to full cycle");

  // hop při wander → hop cycle, ne walk
  const hopCycle = resolvePoseCycle({ assetKey: "hop", displayMood: "hop", wandering: true });
  assert.strictEqual(hopCycle?.id, "hop", "hop wins over wander walk");

  // wave při wander → wave cycle
  const waveCycle = resolvePoseCycle({ assetKey: "wave", displayMood: "wave", wandering: true });
  assert.strictEqual(waveCycle?.id, "wave", "wave wins over wander walk");

  // idle při wander → walk cycle
  const walkCycle = resolvePoseCycle({ assetKey: "idle", displayMood: "idle", wandering: true });
  assert.strictEqual(walkCycle?.id, "walk", "idle + wander maps to walk cycle");

  // stressed → vlastní cycle
  const stressedCycle = resolvePoseCycle({ assetKey: "stressed", displayMood: "stressed", wandering: false });
  assert.strictEqual(stressedCycle?.id, "stressed", "stressed has dedicated cycle");

  // sip → snack cycle
  const sipCycle = resolvePoseCycle({ assetKey: "sip", displayMood: "sip", wandering: false });
  assert.strictEqual(sipCycle?.id, "snack", "sip maps to snack cycle");

  // walk cycle nemá when funkci (serializovatelný katalog)
  const walkDef = POSE_CYCLES.find((c) => c.id === "walk");
  assert.ok(walkDef && !walkDef.when, "walk cycle has no when() — catalog is JSON-safe");

  assert.ok(WANDER_WALK_MOODS.has("idle"), "idle is wander-walk eligible");
  assert.ok(!WANDER_WALK_MOODS.has("hop"), "hop is not wander-walk eligible");

  console.log("✅ pose resolve contract");
  console.log("\n---- KOJ POSE RESOLVE CONTRACT ----");
  console.log("passed");
}

run();
