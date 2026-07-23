"use strict";

const assert = require("assert/strict");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintCore = require("../shared/mia-paint-core");
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
  await test("pose motion auto-publishes body state", async () => {
    graphicsStudio.resetBodyState();
    const doc = paintBridge.getSession().document;
    const layerId = doc.activeLayerId || paintCore.addLayer(doc, { name: "Pose sync" }).id;
    const result = await graphicsStudio.runMotionOnDocument(doc, "pose", {
      layerId,
      pose: "duel",
      timeMs: 0
    });
    assert.equal(result.ok, true);
    assert.equal(result.pose, "duel");
    assert.ok(result.bodyState);
    assert.equal(result.bodyState.mood, "duel");
    const snapshot = graphicsStudio.getBodyState();
    assert.equal(snapshot.mood, "duel");
    assert.equal(snapshot.phase, "12u");
  });

  await test("lip_sync auto-publishes speaking hold", async () => {
    graphicsStudio.resetBodyState();
    const doc = paintBridge.getSession().document;
    const layerId = doc.activeLayerId || paintCore.addLayer(doc, { name: "Lip sync" }).id;
    const result = await graphicsStudio.runMotionOnDocument(doc, "lip_sync", {
      layerId,
      viseme: "A",
      timeMs: 0,
      speakingHoldMs: 5000
    });
    assert.equal(result.ok, true);
    assert.ok(result.bodyState);
    assert.equal(result.bodyState.speaking, true);
    assert.ok(result.bodyState.speakingUntilTs > Date.now());
  });

  await test("syncBody false skips auto publish", async () => {
    graphicsStudio.resetBodyState();
    graphicsStudio.publishBodyState({ mood: "idle", speaking: false });
    const doc = paintBridge.getSession().document;
    const layerId = doc.activeLayerId || paintCore.addLayer(doc, { name: "No sync" }).id;
    const result = await graphicsStudio.runMotionOnDocument(doc, "pose", {
      layerId,
      pose: "wave",
      syncBody: false
    });
    assert.equal(result.ok, true);
    assert.equal(result.bodyState, null);
    assert.equal(graphicsStudio.getBodyState().mood, "idle");
  });

  await test("pipeline pose step syncs body state", async () => {
    graphicsStudio.resetBodyState();
    const pipeline = await graphicsStudio.runPipeline([{ command: "pose", args: { pose: "wave" } }], {
      bridge: paintBridge,
      aiBridge: require("../scripts/MIA_PAINT_AI"),
      paintAi: require("../shared/mia-paint-ai")
    });
    const poseStep = pipeline.executed.find((row) => row.module === "pose");
    assert.ok(poseStep);
    assert.equal(poseStep.ok, true);
    assert.equal(poseStep.bodyState?.mood, "wave");
    assert.equal(graphicsStudio.getBodyState().mood, "wave");
  });

  await test("intent zamavej adds pose step", () => {
    const intent = graphicsStudio.resolveIntentToPipeline("zamavej");
    assert.equal(intent.ok, true);
    assert.ok(intent.steps.some((step) => step.command === "pose"));
  });

  await test("runtime resolves speakingUntilTs", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "lib", "mia-body-part-runtime.js"),
      "utf8"
    );
    assert.match(src, /resolveGraphicsSpeaking/);
    assert.match(src, /speakingUntilTs/);
  });

  await test("bodyPublishBridge exported from graphics studio", () => {
    assert.equal(typeof graphicsStudio.syncBodyStateFromPose, "function");
    assert.equal(typeof graphicsStudio.syncBodyStateFromMotionResult, "function");
  });

  console.log("mia_graphics_studio_12j_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
