"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const {
  inspectKojnozoutAssets,
  inspectLiveKojVisuals,
  LIVE_PROP_NAMES
} = require("../scripts/MIA_KOJNOZROUT_ASSETS");
const { POSE_CYCLES, PAIRED_FRAME_SOURCES } = require("../scripts/kojnozrout_pose_frames");
const {
  emitPoseCatalog,
  selectCompletePoseCycles,
  missingPairedAiFrames
} = require("../scripts/kojnozrout_generate_pose_frames");

const ROOT = path.resolve(__dirname, "..");
const LIVE_PATHS = [
  "mia-output-overlay/assets/kojnozrout/moods",
  "mia-output-overlay/assets/kojnozrout/pose-catalog.js",
  "mia-output-overlay/assets/kojnozrout/props/bowl.png",
  "mia-output-overlay/assets/kojnozrout/props/ball.png",
  "mia-output-overlay/assets/kojnozrout/props/mic.png",
  "mia-output-overlay/assets/kojnozrout/props/hand.png"
];

function writeStub(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "stub-frame");
}

function loadCatalog(catalogPath) {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(catalogPath, "utf8"), sandbox, { filename: catalogPath });
  assert.ok(sandbox.KOJ_POSE, "emitted catalog assigns KOJ_POSE");
  assert.ok(Array.isArray(sandbox.KOJ_POSE.POSE_CYCLES), "emitted catalog has POSE_CYCLES");
  return sandbox.KOJ_POSE;
}

function assertCatalogOmitsMissingFrames() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "koj-pose-"));
  const moodsDir = path.join(root, "moods");
  writeStub(path.join(moodsDir, "kojnozout-idle.png"));
  writeStub(path.join(moodsDir, "kojnozout-idle-f2.png"));
  writeStub(path.join(moodsDir, "kojnozout-full.png"));
  writeStub(path.join(moodsDir, "kojnozout-full-f2.png"));

  const cycles = [
    { id: "walk", frames: ["walk-a", "walk-b"], halfMs: 390 },
    { id: "idle", frames: ["idle", "idle-f2", "lean-left", "lean-right"], halfMs: 1400, moods: ["idle"] },
    { id: "full", frames: ["full", "full-f2"], halfMs: 1500, moods: ["full"] }
  ];
  const plan = selectCompletePoseCycles(cycles, (key) =>
    fs.existsSync(path.join(moodsDir, `kojnozout-${key}.png`))
  );
  assert.deepEqual(plan.emitted || plan.complete.map((cycle) => cycle.id), ["full"]);
  assert.equal(plan.definedCount, 3);
  assert.deepEqual(
    plan.skipped.map((cycle) => cycle.id),
    ["walk", "idle"]
  );
  assert.ok(plan.missingFrameCount >= 4);

  const emitted = emitPoseCatalog({
    moodsDir,
    catalogPath: path.join(root, "pose-catalog.js"),
    cycles,
    moodF2Specs: { idle: {}, full: {} },
    derivedF2Specs: {},
    wanderWalkMoods: new Set(["idle"]),
    wanderWalkFrameMoods: new Set(["idle"])
  });
  assert.deepEqual(emitted.emitted, ["full"]);
  const text = fs.readFileSync(emitted.catalogPath, "utf8");
  assert.equal(text.includes("walk-a"), false);
  assert.equal(text.includes("variants/"), false);
  const pose = loadCatalog(emitted.catalogPath);
  assert.deepEqual(
    Array.from(pose.POSE_CYCLES, (cycle) => String(cycle.id)),
    ["full"]
  );
  const idle = pose.resolvePoseCycle({ displayMood: "idle", wandering: true });
  assert.equal(idle && String(idle.id), "idle-pair");
  assert.deepEqual(Array.from(idle.frames, (frame) => String(frame)), ["idle", "idle-f2"]);
  const walk = pose.resolvePoseCycle({ displayMood: "walk" });
  assert.equal(walk, null);
  fs.rmSync(root, { recursive: true, force: true });
}

function assertDefinedCyclesStayInSource() {
  assert.ok(POSE_CYCLES.some((cycle) => cycle.id === "walk"));
  assert.ok(POSE_CYCLES.some((cycle) => cycle.id === "battle-hit"));
  assert.ok(PAIRED_FRAME_SOURCES["hop-a"]);
  assert.ok(PAIRED_FRAME_SOURCES["dance-c"] || PAIRED_FRAME_SOURCES["dance-a"]);
  assert.equal(LIVE_PROP_NAMES.length, 4);
}

function assertLiveBank() {
  const missing = LIVE_PATHS.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length > 0) {
    assert.ok(false, `KOJ_LIVE_ASSET_MISSING: ${missing.join(", ")}`);
  }

  const body = inspectKojnozoutAssets();
  assert.equal(body.ok, true, "canonical mood readiness");
  const live = inspectLiveKojVisuals();
  assert.equal(live.defect, null, live.detail || "live Koj visuals");
  assert.equal(live.ok, true, "inspectLiveKojVisuals");
  assert.equal(live.liveProductionArtReady, true);
  assert.equal(live.fallbackAvailable, true);

  const catalogPath = path.join(ROOT, "mia-output-overlay/assets/kojnozrout/pose-catalog.js");
  const pose = loadCatalog(catalogPath);
  const moodsDir = path.join(ROOT, "mia-output-overlay/assets/kojnozrout/moods");
  for (const cycle of pose.POSE_CYCLES) {
    for (const frame of cycle.frames || []) {
      const png = path.join(moodsDir, `kojnozout-${frame}.png`);
      assert.ok(fs.existsSync(png) && fs.statSync(png).size > 0, `dangling catalog reference: ${frame}`);
    }
  }
}

assertCatalogOmitsMissingFrames();
assertDefinedCyclesStayInSource();
assertLiveBank();
console.log("koj_live_assets_contract: code checks passed");
if (missingPairedAiFrames().length >= 0) {
  console.log(`paired AI frames still absent: ${missingPairedAiFrames().length}`);
}
