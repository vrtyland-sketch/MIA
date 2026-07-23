"use strict";



const assert = require("assert");

const fs = require("fs");

const path = require("path");

const paintCore = require("../shared/mia-paint-core");

const graphicsStudio = require("../shared/mia-graphics-studio");

const paintBridge = require("../scripts/MIA_PAINT_BRIDGE");



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

  await test("12d motion commands implemented in catalog", () => {

    for (const id of ["animate_layer", "bones_rig", "camera_keyframe"]) {

      const def = graphicsStudio.getCommand(id);

      assert.equal(def.status, "implemented", id);

      assert.equal(def.phase, "12d", id);

      assert.ok(def.bridgeAction);

    }

    const mods = graphicsStudio.listMotionModules();

    assert.ok(mods.length >= 4, "at least core motion modules");

    assert.ok(mods.some((m) => m.route === "/mia/graphics/motion/layer-keyframe"));

    assert.ok(mods.some((m) => m.route === "/mia/graphics/motion/ai-generate"), "phase15 ai-motion");

    assert.ok(mods.some((m) => m.route === "/mia/graphics/motion/lip-sync"), "phase15 lip-sync");

  });



  await test("phase15 commands implemented in catalog", () => {

    for (const id of ["motion", "animate", "lip_sync"]) {

      const def = graphicsStudio.getCommand(id);

      assert.equal(def.status, "implemented", id);

      assert.equal(def.phase, "15", id);

      assert.ok(def.bridgeAction, id);

    }

  });



  await test("Motion.js keyframe interpolation", () => {

    const tl = paintCore.createTimeline();

    const doc = paintCore.createDocument({ timeline: tl });

    const layer = paintCore.getActiveLayer(doc);

    paintCore.addLayerKeyframe(tl, layer.id, { timeMs: 0, x: 0 });

    paintCore.addLayerKeyframe(tl, layer.id, { timeMs: 1000, x: 100 });

    const mid = paintCore.sampleMotion(tl, 500);

    assert.ok(Math.abs(mid.layers[layer.id].x - 50) < 0.01);

    const end = paintCore.sampleMotion(tl, 1000);

    assert.equal(end.layers[layer.id].x, 100);

  });



  await test("camera keyframe sampling without preset rig", () => {

    const tl = paintCore.createTimeline();

    paintCore.addCameraKeyframe(tl, { timeMs: 0, zoom: 1 });

    paintCore.addCameraKeyframe(tl, { timeMs: 2000, zoom: 2, panX: 40 });

    const sample = paintCore.sampleMotion(tl, 1000);

    assert.ok(Math.abs(sample.camera.zoom - 1.5) < 0.01);

    assert.ok(Math.abs(sample.camera.panX - 20) < 0.01);

  });



  await test("camera preset rig merges when enabled", () => {

    const tl = paintCore.createTimeline();

    paintCore.setActiveCameraPreset(tl, "C3");

    paintCore.addCameraKeyframe(tl, { timeMs: 0, zoom: 1 });

    const sample = paintCore.sampleMotion(tl, 0);

    assert.equal(sample.cameraPresetId, "C3");

    assert.ok(sample.camera.zoom > 1.2);

  });



  await test("bones rig adds rotation to layer sample", () => {

    const tl = paintCore.createTimeline();

    const doc = paintCore.createDocument({ timeline: tl });

    const layer = paintCore.getActiveLayer(doc);

    const rigResult = paintCore.createBonesRig(tl, { layerId: layer.id });

    assert.ok(rigResult.ok);

    paintCore.addBoneKeyframe(tl, rigResult.rig.id, "root", 0, 0);

    paintCore.addBoneKeyframe(tl, rigResult.rig.id, "root", 1000, 45);

    const sample = paintCore.sampleMotion(tl, 500);

    assert.ok(Math.abs(sample.layers[layer.id].rotation - 10.125) < 0.1);

  });



  await test("bridge motion_add_layer_keyframe", () => {

    paintBridge.resetSession();

    const layerId = paintBridge.getSession().document.activeLayerId;

    const result = paintBridge.runCommand({

      action: "motion_add_layer_keyframe",

      layerId,

      timeMs: 0,

      x: 12

    });

    assert.equal(result.ok, true);

    const motion = paintBridge.getSession().document.timeline.motion;

    assert.equal(motion.layerTracks[layerId].keyframes.length, 1);

    assert.equal(motion.layerTracks[layerId].keyframes[0].x, 12);

  });



  await test("bridge phase15 motion_ai_generate + lip_sync", () => {

    paintBridge.resetSession();

    const doc = paintBridge.getSession().document;

    const layerId = doc.activeLayerId;

    const ai = paintBridge.runCommand({

      action: "motion_ai_generate",

      layerId,

      style: "pulse",

      durationMs: 600

    });

    assert.equal(ai.ok, true, ai.error);

    assert.ok(doc.timeline.motion.layerTracks[layerId].keyframes.length >= 2);



    const lip = paintBridge.runCommand({

      action: "motion_lip_sync",

      layerId,

      viseme: "O",

      timeMs: 100

    });

    assert.equal(lip.ok, true, lip.error);

    assert.ok(doc.timeline.motion.lipSync.keyframes.length >= 1);

  });



  await test("runMotionOnDocument via graphics studio", async () => {

    const doc = paintCore.createDocument();

    const layerId = doc.activeLayerId;

    const result = await graphicsStudio.runMotionOnDocument(doc, "layer-keyframe", {

      layerId,

      timeMs: 250,

      y: 8

    });

    assert.equal(result.ok, true);

    assert.ok(result.clientStep);

    assert.equal(doc.timeline.motion.layerTracks[layerId].keyframes[0].y, 8);

  });



  await test("pipeline animateLayer + cameraKeyframe + motion", async () => {

    const pipeline = await graphicsStudio.runPipeline(

      [

        { command: "animateLayer", args: { timeMs: 0, x: 0 } },

        { command: "cameraKeyframe", args: { timeMs: 0, zoom: 1 } },

        { command: "motion", args: { style: "shake", intensity: 0.5 } }

      ],

      {

        bridge: paintBridge,

        aiBridge: require("../scripts/MIA_PAINT_AI"),

        paintAi: { logPaintAi() {} }

      }

    );

    assert.equal(pipeline.ok, true);

    assert.ok(pipeline.executed.some((e) => e.command === "MIA.animateLayer" && e.ok));

    assert.ok(pipeline.executed.some((e) => e.command === "MIA.cameraKeyframe" && e.ok));

    assert.ok(pipeline.executed.some((e) => e.command === "MIA.motion" && e.ok));

  });



  await test("routes expose motion endpoints including phase15", () => {

    const routes = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");

    assert.match(routes, /\/mia\/graphics\/motion\/layer-keyframe/);

    assert.match(routes, /\/mia\/graphics\/motion\/camera-keyframe/);

    assert.match(routes, /\/mia\/graphics\/motion\/bones-rig/);

    assert.match(routes, /\/mia\/graphics\/motion\/sample/);

    assert.match(routes, /\/mia\/graphics\/motion\/ai-generate/);

    assert.match(routes, /\/mia\/graphics\/motion\/lip-sync/);

    assert.match(routes, /\/mia\/graphics\/motion\/ik-solve/);

  });



  await test("editor UI + GPU motion API", () => {

    const html = fs.readFileSync(

      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "index.html"),

      "utf8"

    );

    const appJs = fs.readFileSync(

      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "app.js"),

      "utf8"

    );

    const gpuJs = fs.readFileSync(

      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js"),

      "utf8"

    );

    assert.match(html, /btnMotionKf/);

    assert.match(html, /btnMotionAi/);

    assert.match(html, /boneOverlayToggle/);

    assert.match(html, /motionPlayhead/);

    assert.match(appJs, /motionAddLayerKeyframe/);

    assert.match(appJs, /motionAiGenerate/);

    assert.match(gpuJs, /setMotionPlayhead/);

    assert.match(gpuJs, /drawBoneOverlay/);

    assert.match(gpuJs, /sampleMotion/);

  });



  console.log("mia_graphics_studio_12d_contract: all passed");

})().catch((err) => {

  console.error(err);

  process.exit(1);

});

