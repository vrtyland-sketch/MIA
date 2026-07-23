"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const paintAi = require("../shared/mia-paint-ai");
const graphicsStudio = require("../shared/mia-graphics-studio");

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
  await test("12c modules implemented in catalog", () => {
    for (const id of ["upscale", "restore", "recolor"]) {
      const def = graphicsStudio.getCommand(id);
      assert.equal(def.status, "implemented", id);
      assert.equal(def.phase, "12c", id);
      assert.ok(def.aiKind);
    }
    const mods = graphicsStudio.listAiModules();
    assert.equal(mods.length, 7);
    assert.ok(mods.some((m) => m.route === "/mia/graphics/ai/upscale"));
    assert.ok(mods.some((m) => m.id === "true_alpha"));
  });

  await test("upscaleBuffer doubles dimensions", async () => {
    const sharp = require("sharp");
    const input = await paintAi.proceduralImage(32, 32, "up");
    const meta = await sharp(input).metadata();
    const result = await paintAi.upscaleBuffer(input, { scale: 2 });
    assert.equal(result.width, meta.width * 2);
    assert.equal(result.height, meta.height * 2);
    assert.ok(result.buffer.length > input.length);
  });

  await test("restoreBuffer returns sharpened png", async () => {
    const sharp = require("sharp");
    const input = await paintAi.proceduralImage(48, 48, "restore");
    const meta = await sharp(input).metadata();
    const result = await paintAi.restoreBuffer(input, { strength: 0.5 });
    assert.equal(result.width, meta.width);
    assert.equal(result.height, meta.height);
    assert.ok(result.buffer.length > 0);
    assert.equal(result.provider, "sharp_restore");
  });

  await test("recolorBuffer applies palette", async () => {
    const input = await paintAi.proceduralImage(48, 48, "color");
    const result = await paintAi.recolorBuffer(input, { palette: "neon" });
    assert.equal(result.palette, "neon");
    assert.ok(result.buffer.length > 0);
  });

  await test("runAiModule upscale via bridge", async () => {
    const input = await paintAi.proceduralImage(24, 24, "x");
    const b64 = input.toString("base64");
    const result = await graphicsStudio.runAiModule(
      "upscale",
      { dataBase64: b64, scale: 2 },
      {
        aiBridge: require("../scripts/MIA_PAINT_AI"),
        paintAi: { logPaintAi() {} }
      }
    );
    assert.equal(result.ok, true);
    assert.equal(result.api, "MIA.upscale");
    assert.ok(result.width >= 24);
    assert.ok(result.clientStep.args.replaceDocumentSize);
  });

  await test("pipeline chains upscale after generate", async () => {
    const gen = await paintAi.proceduralImage(20, 20, "a");
    const pipeline = await graphicsStudio.runPipeline(
      [
        {
          command: "upscale",
          args: { dataBase64: gen.toString("base64"), scale: 2 }
        }
      ],
      {
        bridge: { runCommand() { return { ok: true }; } },
        aiBridge: require("../scripts/MIA_PAINT_AI"),
        paintAi: { logPaintAi() {} }
      }
    );
    assert.equal(pipeline.ok, true);
    assert.ok(pipeline.executed.some((e) => e.command === "MIA.upscale" && e.ok));
  });

  await test("routes expose 12c endpoints", () => {
    const routes = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
    assert.match(routes, /\/mia\/graphics\/ai\/upscale/);
    assert.match(routes, /\/mia\/graphics\/ai\/restore/);
    assert.match(routes, /\/mia\/graphics\/ai\/recolor/);
  });

  await test("editor UI has 12c controls", () => {
    const html = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "index.html"),
      "utf8"
    );
    const appJs = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "app.js"),
      "utf8"
    );
    assert.match(html, /btnAiUpscale/);
    assert.match(html, /btnAiRecolor/);
    assert.match(appJs, /aiUpscale/);
    assert.match(appJs, /aiRecolor/);
  });

  console.log("mia_graphics_studio_12c_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
