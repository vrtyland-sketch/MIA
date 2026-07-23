"use strict";

const assert = require("assert/strict");
const paintCore = require("../shared/mia-paint-core");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintBridge = require("../scripts/MIA_PAINT_BRIDGE");
const fs = require("fs");
const path = require("path");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

(async () => {
  await test("12h pose command implemented in catalog", () => {
    const def = graphicsStudio.getCommand("pose");
    assert.equal(def.status, "implemented");
    assert.equal(def.phase, "12j");
    assert.equal(def.bridgeAction, "motion_pose_apply");
    const mods = graphicsStudio.listMotionModules();
    assert.ok(mods.some((m) => m.route === "/mia/graphics/motion/pose"));
  });

  await test("applyPoseToDocument writes layer keyframe", () => {
    const doc = paintCore.createDocument({ width: 512, height: 512 });
    const layer = paintCore.addLayer(doc, { name: "MIA" });
    doc.activeLayerId = layer.id;
    const result = graphicsStudio.applyPoseToDocument(doc, { pose: "wave", timeMs: 0 });
    assert.equal(result.ok, true);
    assert.equal(result.pose, "wave");
    const track = doc.timeline.motion.layerTracks[layer.id];
    assert.ok(track.keyframes.length >= 1);
    assert.equal(track.keyframes[0].rotation, -8);
  });

  await test("runMotionOnDocument pose via bridge", async () => {
    const doc = paintBridge.getSession().document;
    const layerId = doc.activeLayerId || paintCore.addLayer(doc, { name: "Pose test" }).id;
    const result = await graphicsStudio.runMotionOnDocument(doc, "pose", {
      layerId,
      pose: "gift",
      timeMs: 120
    });
    assert.equal(result.ok, true);
    assert.equal(result.pose, "gift");
    assert.equal(result.clientStep.command, "motion_pose_apply");
  });

  await test("body publish state API", () => {
    graphicsStudio.resetBodyState();
    const published = graphicsStudio.publishBodyState({
      mood: "duel",
      speaking: true,
      parts: { head: true, eyes: true }
    });
    assert.equal(published.mood, "duel");
    assert.equal(published.speaking, true);
    assert.equal(published.parts.head, true);
    assert.equal(published.parts.hands, false);
    const snapshot = graphicsStudio.getBodyState();
    assert.equal(snapshot.mood, "duel");
  });

  await test("routes expose pose and body publish", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
    assert.match(src, /\/mia\/graphics\/motion\/pose/);
    assert.match(src, /\/mia\/graphics\/body\/publish/);
    assert.match(src, /\/mia\/graphics\/body\/state/);
  });

  await test("OBS hook phase 12h", () => {
    const hook = graphicsStudio.getObsHook(3000);
    assert.ok(hook.phase);
    assert.equal(hook.bodyParts.length, 5);
  });

  console.log("mia_graphics_studio_12h_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
