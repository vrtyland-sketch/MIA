"use strict";

const assert = require("assert");
const graphicsStudio = require("../shared/mia-graphics-studio");
const graphicsAgent = require("../scripts/MIA_GRAPHICS_AGENT");

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
  await test("12b AI modules listed with routes", () => {
    const mods = graphicsStudio.listAiModules();
    assert.ok(mods.length >= 3);
    assert.ok(mods.every((m) => m.status === "implemented"));
    assert.ok(mods.some((m) => m.route === "/mia/graphics/ai/generate"));
    assert.ok(mods.some((m) => m.api === "MIA.editRegion"));
  });

  await test("runAiModule generate", async () => {
    const result = await graphicsStudio.runAiModule(
      "generate_image",
      { prompt: "test", width: 64, height: 64 },
      {
        aiBridge: {
          async runAiJob(kind) {
            assert.equal(kind, "generate");
            return {
              provider: "test",
              width: 64,
              height: 64,
              pngBase64: Buffer.from("x").toString("base64"),
              byteLength: 1
            };
          }
        },
        paintAi: { logPaintAi() {} }
      }
    );
    assert.equal(result.ok, true);
    assert.equal(result.api, "MIA.generateImage");
    assert.ok(result.clientStep);
  });

  await test("runAiModule edit with maskRect", async () => {
    const result = await graphicsStudio.runAiModule(
      "edit_region",
      {
        dataBase64: Buffer.from("img").toString("base64"),
        maskRect: { x: 10, y: 10, width: 20, height: 20 },
        docWidth: 64,
        docHeight: 64
      },
      {
        aiBridge: {
          async runAiJob(kind, args) {
            assert.equal(kind, "inpaint");
            assert.ok(args.maskBase64);
            return { pngBase64: Buffer.from("out").toString("base64"), note: "inpaint_neighbor_fill" };
          }
        },
        paintAi: { logPaintAi() {} }
      }
    );
    assert.equal(result.ok, true);
    assert.equal(result.api, "MIA.editRegion");
  });

  await test("runAiModule remove chains lastImageBase64", async () => {
    const result = await graphicsStudio.runAiModule(
      "remove_background",
      { tolerance: 24 },
      {
        lastImageBase64: Buffer.from("prev").toString("base64"),
        aiBridge: {
          async runAiJob(kind, args) {
            assert.equal(kind, "remove-bg");
            assert.ok(args.dataBase64);
            return { pngBase64: Buffer.from("cut").toString("base64"), byteLength: 3 };
          }
        },
        paintAi: { logPaintAi() {} }
      }
    );
    assert.equal(result.ok, true);
    assert.equal(result.api, "MIA.removeBackground");
  });

  await test("graphics agent command strips module from args", async () => {
    const result = await graphicsAgent.runGraphicsAiCommand({
      module: "generate",
      prompt: "mascot",
      width: 32,
      height: 32
    });
    assert.equal(result.ok, true);
    assert.equal(result.module, "generate_image");
  });

  await test("routes expose 12b graphics AI", () => {
    const fs = require("fs");
    const path = require("path");
    const routes = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
    assert.match(routes, /\/mia\/graphics\/ai\/generate/);
    assert.match(routes, /\/mia\/graphics\/ai\/edit/);
    assert.match(routes, /\/mia\/graphics\/ai\/remove-background/);
  });

  await test("editor uses graphics client", () => {
    const fs = require("fs");
    const path = require("path");
    const html = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "index.html"),
      "utf8"
    );
    const appJs = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "app.js"),
      "utf8"
    );
    assert.match(html, /mia-graphics-client/);
    assert.match(html, /btnAiEdit/);
    assert.match(appJs, /aiEditRegion/);
    assert.match(appJs, /\/mia\/graphics\/ai\//);
  });

  console.log("mia_graphics_studio_12b_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
