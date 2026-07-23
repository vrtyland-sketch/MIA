"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");

const ROOT = path.resolve(__dirname, "..");
const PAINT = path.join(ROOT, "mia-output-overlay", "mia-paint");

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
  await test("catalog lists paint_ai_timeline_bridge as 13i", () => {
    const def = graphicsStudio.getCommand("paint_ai_timeline_bridge");
    assert.equal(def.phase, "13i");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    const bridge = mods.find((m) => m.id === "paint_ai_timeline_bridge");
    assert.ok(bridge);
    assert.equal(bridge.clientCommand, "import_animation_frames");
  });

  await test("generateAnimation forPaintTimeline returns framesBase64 + timeline clientStep", async () => {
    const clipId = `test-13i-${Date.now().toString(36)}`;
    const result = await graphicsStudio.generateAnimation({
      prompt: "MIA paint timeline bridge",
      motion: "nod",
      frameCount: 3,
      width: 96,
      height: 96,
      fps: 10,
      clipId,
      packSheet: true,
      persist: true,
      forPaintTimeline: true,
      includeFramesBase64: true,
      encodeGif: false,
      encodeWebm: false
    });
    assert.equal(result.ok, true);
    assert.equal(result.trueAlpha, true);
    assert.equal(result.frameCount, 3);
    assert.ok(Array.isArray(result.framesBase64));
    assert.equal(result.framesBase64.length, 3);
    assert.ok(result.framesBase64[0].length > 40);
    assert.equal(result.clientStep?.command, "import_animation_frames");
    assert.equal(result.clientStep.args.framesBase64.length, 3);
    assert.equal(result.clientStep.args.replaceTimeline, true);
    assert.ok(result.avgAlphaRatio > 0.3, `avgAlphaRatio=${result.avgAlphaRatio}`);

    fs.rmSync(path.join(ROOT, "data", "mia-ai-animations", clipId), { recursive: true, force: true });
  });

  await test("paint UI + graphics client wire 13i bridge", () => {
    const html = fs.readFileSync(path.join(PAINT, "index.html"), "utf8");
    assert.match(html, /btnAiGenerateAnim/);
    assert.match(html, /aiAnimMotion/);
    assert.match(html, /aiAnimFrames/);

    const app = fs.readFileSync(path.join(PAINT, "app.js"), "utf8");
    assert.match(app, /aiGenerateAnimation/);
    assert.match(app, /forPaintTimeline:\s*true/);
    assert.match(app, /btnAiGenerateAnim/);

    const client = fs.readFileSync(path.join(PAINT, "lib", "mia-graphics-client.js"), "utf8");
    assert.match(client, /generateAnimation/);
    assert.match(client, /importAnimationFramesToTimeline/);
    assert.match(client, /import_animation_frames/);
  });

  await test("animation generate route still registered", () => {
    const routes = fs.readFileSync(path.join(ROOT, "routes", "mia_paint.js"), "utf8");
    assert.match(routes, /\/mia\/graphics\/ai\/animation\/generate/);
  });

  console.log("mia_graphics_studio_13i_paint_timeline_bridge_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
