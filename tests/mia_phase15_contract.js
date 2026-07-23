"use strict";

const assert = require("assert");
const paintCore = require("../shared/mia-paint-core");
const { runMotionOnDocument } = require("../shared/mia-graphics-studio/motionCommands");
const boneRig = require("../shared/mia-paint-core/boneRig");
const { generateAiMotionKeyframes } = require("../shared/mia-graphics-studio/aiMotionCommands");

function makeDoc() {
  const doc = paintCore.createDocument({ width: 256, height: 256, name: "phase15" });
  doc.timeline = paintCore.createTimeline({ fps: 12 });
  paintCore.ensureMotion(doc.timeline);
  return doc;
}

function testBoneChainAndIk() {
  const doc = makeDoc();
  const layer = doc.layers[0];
  const rigResult = paintCore.createBonesRig(doc.timeline, { layerId: layer.id, pivotX: 0, pivotY: 0 });
  assert.ok(rigResult.ok, "rig created");
  const rig = rigResult.rig;

  const chain = paintCore.computeBoneChainForRig(rig, 0);
  assert.equal(chain.length, 3, "3-bone chain");
  assert.ok(chain[0].endX > chain[0].x, "root extends");

  const ik = paintCore.applyIkToRig(doc.timeline, rig.id, 80, -40, 500);
  assert.ok(ik.ok, "IK applied");
  assert.ok(ik.angles.root != null || ik.angles.mid != null, "IK angles");
  assert.ok(rig.ikTarget, "ik target stored");

  const solved = boneRig.solveTwoBoneIK(0, 0, 60, 30, 48, 40);
  assert.ok(solved.ok);
  assert.ok(Number.isFinite(solved.rootWorld));
  assert.ok(Number.isFinite(solved.midLocal));
}

function testAiMotionKeyframes() {
  const doc = makeDoc();
  const layerId = doc.layers[0].id;
  const result = generateAiMotionKeyframes(doc.timeline, layerId, {
    style: "bounce",
    intensity: 0.7,
    durationMs: 800,
    startMs: 0
  });
  assert.ok(result.ok, result.error);
  assert.ok(result.keyframeCount >= 3, "multiple keyframes");
  const track = doc.timeline.motion.layerTracks[layerId];
  assert.ok(track?.keyframes?.length >= 3, "layer track populated");
}

function testLipSyncTrack() {
  const doc = makeDoc();
  const layerId = doc.layers[0].id;
  const keyframes = paintCore.buildVisemeTrackFromText("AHOJ", 0, 100);
  assert.ok(keyframes.length >= 4, "viseme keyframes from text");
  const applied = paintCore.applyVisemeTrack(doc.timeline, keyframes, layerId);
  assert.ok(applied.ok);
  const sample0 = paintCore.sampleLipSync(doc.timeline, 0);
  assert.ok(sample0.mouthOpen >= 0);
  const sampleMotion = paintCore.sampleMotion(doc.timeline, 50);
  assert.ok(sampleMotion.lipSync, "lip sync in motion sample");
  assert.ok(sampleMotion.layers[layerId], "mouth layer transform");
}

async function testMotionCommandsIntegration() {
  const doc = makeDoc();
  const layerId = doc.layers[0].id;

  const ai = await runMotionOnDocument(doc, "ai_motion", { layerId, style: "pulse" });
  assert.ok(ai.ok, ai.error);

  const lip = await runMotionOnDocument(doc, "lip_sync", { layerId, viseme: "O", timeMs: 200 });
  assert.ok(lip.ok, lip.error);

  const rig = await runMotionOnDocument(doc, "bones_rig", { layerId });
  assert.ok(rig.ok, rig.error);

  const ik = await runMotionOnDocument(doc, "ik_solve", {
    rigId: rig.rig.id,
    targetX: 50,
    targetY: -20,
    timeMs: 100
  });
  assert.ok(ik.ok, ik.error);

  const chain = await runMotionOnDocument(doc, "bone_chain", { rigId: rig.rig.id, timeMs: 100 });
  assert.ok(chain.ok);
  assert.equal(chain.chain.length, 3);
}

function testListMotionTracksIncludesLip() {
  const doc = makeDoc();
  const layerId = doc.layers[0].id;
  paintCore.addVisemeKeyframe(doc.timeline, { layerId, viseme: "A", timeMs: 0 });
  const tracks = paintCore.listMotionTracks(doc.timeline, doc.layers);
  assert.ok(tracks.some((t) => t.kind === "lip"), "lip track listed");
}

function testCameraPresets() {
  const doc = makeDoc();
  const presets = paintCore.listCameraPresets();
  assert.equal(presets.length, 6);
  const set = paintCore.setActiveCameraPreset(doc.timeline, "C5");
  assert.ok(set.ok);
  const sample = paintCore.sampleMotion(doc.timeline, 0);
  assert.equal(sample.cameraPresetId, "C5");
  assert.ok(sample.camera.zoom > 1);
}

function testLipSyncCrud() {
  const doc = makeDoc();
  paintCore.addVisemeKeyframe(doc.timeline, { viseme: "A", timeMs: 100 });
  const upd = paintCore.updateVisemeKeyframe(doc.timeline, 100, { viseme: "O" });
  assert.ok(upd.ok);
  assert.equal(upd.keyframe.viseme, "O");
  const del = paintCore.deleteVisemeKeyframe(doc.timeline, 100);
  assert.ok(del.ok);
  assert.equal(doc.timeline.motion.lipSync.keyframes.length, 0);
}

async function main() {
  testBoneChainAndIk();
  testAiMotionKeyframes();
  testLipSyncTrack();
  await testMotionCommandsIntegration();
  testListMotionTracksIncludesLip();
  testCameraPresets();
  testLipSyncCrud();
  console.log("mia_phase15_contract: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
