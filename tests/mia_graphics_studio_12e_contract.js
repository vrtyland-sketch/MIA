"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const paintCore = require("../shared/mia-paint-core");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintBridge = require("../scripts/MIA_PAINT_BRIDGE");
const paintAi = require("../shared/mia-paint-ai");

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
  await test("12e commands implemented in catalog", () => {
    for (const id of ["create_particles", "export_gif", "export_video"]) {
      const def = graphicsStudio.getCommand(id);
      assert.equal(def.status, "implemented", id);
      assert.equal(def.phase, "12e", id);
    }
    const fx = graphicsStudio.listFxModules();
    assert.ok(fx.some((m) => m.route === "/mia/graphics/fx/particles"));
    const exp = graphicsStudio.listExportModules();
    assert.ok(exp.some((m) => m.route === "/mia/graphics/export/gif"));
  });

  await test("particle presets map to mia-2d-fx bursts", () => {
    const presets = graphicsStudio.listParticlePresets();
    assert.ok(presets.length >= 5);
    const rain = graphicsStudio.getParticlePreset("rain");
    assert.equal(rain.burst, "trail");
    const doc = paintCore.createDocument();
    const result = paintCore.createParticleEmitter(doc, { preset: "fire" });
    assert.equal(result.ok, true);
    assert.equal(result.emitter.preset, "fire");
    assert.equal(doc.fxParticles.length, 1);
  });

  await test("runFxOnDocument returns clientStep", () => {
    const doc = paintCore.createDocument();
    const result = graphicsStudio.runFxOnDocument(doc, "create_particles", { preset: "sparkle_blue" });
    assert.equal(result.ok, true);
    assert.equal(result.clientStep.command, "particle_spawn");
    assert.ok(result.emitter.id);
  });

  await test("encodeGifFromPngBuffers", async () => {
    const a = await paintAi.proceduralImage(24, 24, "a");
    const b = await paintAi.proceduralImage(24, 24, "b");
    const result = await graphicsStudio.encodeGifFromPngBuffers([a, b], { fps: 8 });
    assert.equal(result.ok, true);
    assert.equal(result.format, "gif");
    assert.ok(result.buffer.length > 100);
  });

  await test("runExportModule without frames returns clientStep", async () => {
    const result = await graphicsStudio.runExportModule("export_gif", { fps: 10 });
    assert.equal(result.ok, true);
    assert.equal(result.partial, true);
    assert.equal(result.clientStep.command, "export_collect_frames");
  });

  await test("runExportModule gif with frames", async () => {
    const frame = await paintAi.proceduralImage(32, 32, "x");
    const result = await graphicsStudio.runExportModule("export_gif", {
      frames: [frame.toString("base64"), frame.toString("base64")],
      fps: 10
    });
    assert.equal(result.ok, true);
    assert.ok(result.dataBase64);
    assert.equal(result.provider, "sharp_gif");
  });

  await test("bridge create_particles", () => {
    paintBridge.resetSession();
    const result = paintBridge.runCommand({ action: "create_particles", preset: "heal" });
    assert.equal(result.ok, true);
    assert.equal(paintBridge.getSession().document.fxParticles.length, 1);
  });

  await test("pipeline createParticles + exportGif partial", async () => {
    const pipeline = await graphicsStudio.runPipeline(
      [{ command: "createParticles", args: { preset: "smoke" } }, { command: "exportGif" }],
      {
        bridge: paintBridge,
        aiBridge: require("../scripts/MIA_PAINT_AI"),
        paintAi: { logPaintAi() {} }
      }
    );
    assert.equal(pipeline.ok, true);
    assert.ok(pipeline.executed.some((e) => e.command === "MIA.createParticles" && e.ok));
    assert.ok(pipeline.clientSteps.some((s) => s.command === "particle_spawn"));
    assert.ok(pipeline.clientSteps.some((s) => s.command === "export_collect_frames"));
  });

  await test("routes expose 12e endpoints", () => {
    const routes = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
    assert.match(routes, /\/mia\/graphics\/fx\/particles/);
    assert.match(routes, /\/mia\/graphics\/export\/gif/);
    assert.match(routes, /\/mia\/graphics\/export\/webm/);
    assert.match(routes, /\/mia\/graphics\/export\/mp4/);
  });

  await test("editor UI + GPU export frames API", () => {
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
    assert.match(html, /btnExportGif/);
    assert.match(html, /btnAddParticles/);
    assert.match(html, /mia-2d-fx\.js/);
    assert.match(appJs, /exportAnimationDownload/);
    assert.match(appJs, /addParticles/);
    assert.match(gpuJs, /collectTimelineExportCanvases/);
  });

  console.log("mia_graphics_studio_12e_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
