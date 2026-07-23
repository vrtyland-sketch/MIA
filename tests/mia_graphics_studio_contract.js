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
  await test("catalog lists MIA.* APIs", () => {
  const summary = graphicsStudio.getCatalogSummary();
  assert.equal(summary.product, "MIA Graphics Studio");
  assert.ok(summary.commandCount >= 20);
  assert.ok(summary.apis.some((a) => a.api === "MIA.generateImage"));
  assert.ok(summary.apis.some((a) => a.api === "MIA.exportVideo" && a.status === "implemented"));
  assert.ok(summary.apis.some((a) => a.api === "MIA.createParticles" && a.status === "implemented"));
  assert.ok(summary.templates.some((t) => t.id === "tiktok"));
});

  await test("export templates dimensions", () => {
  const tt = graphicsStudio.getTemplate("tiktok");
  assert.equal(tt.width, 1080);
  assert.equal(tt.height, 1920);
  const tw = graphicsStudio.getTemplate("twitch");
  assert.equal(tw.width, 1920);
  assert.equal(tw.height, 1080);
});

  await test("resolveIntentToPipeline — cyberpunk example", () => {
  const intent = graphicsStudio.resolveIntentToPipeline(
    "Vytvoř cyberpunkovou Miu, odstraň pozadí, modré částice, exportuj jako WEBM"
  );
  assert.equal(intent.ok, true);
  assert.ok(intent.steps.some((s) => s.command === "generateImage"));
  assert.ok(intent.steps.some((s) => s.command === "removeBackground"));
  assert.ok(intent.steps.some((s) => s.command === "createParticles"));
  assert.ok(intent.steps.some((s) => s.command === "exportVideo"));
});

  await test("pipeline executes implemented steps and marks planned", async () => {
  const result = await graphicsStudio.runPipeline(
    [
      { command: "createFromTemplate", args: { template: "tiktok", name: "Test" } },
      { command: "generateImage", args: { prompt: "test mascot", width: 64, height: 64 } },
      { command: "exportVideo", args: { format: "webm" } }
    ],
    {
      bridge: {
        runCommand(body) {
          if (body.action === "set_canvas_size") return { ok: true, width: body.width, height: body.height };
          if (body.action === "set_document_name") return { ok: true, name: body.name };
          return { ok: false };
        }
      },
      aiBridge: {
        async runAiJob(kind) {
          if (kind === "generate") {
            return {
              ok: true,
              provider: "test",
              width: 64,
              height: 64,
              pngBase64: Buffer.from("fake").toString("base64"),
              byteLength: 4
            };
          }
          return { ok: false };
        }
      }
    }
  );

  assert.equal(result.ok, true);
  assert.ok(result.executed.some((e) => e.command === "MIA.createFromTemplate" && e.ok));
  assert.ok(result.executed.some((e) => e.command === "MIA.generateImage" && e.ok));
  assert.ok(result.executed.some((e) => e.command === "MIA.exportVideo" && e.ok));
  assert.ok(result.clientSteps.some((s) => s.command === "export_collect_frames"));
  assert.ok(result.clientSteps.length >= 1);
});

  await test("graphics agent catalog endpoint shape", () => {
  const cat = graphicsAgent.getGraphicsCatalog();
  assert.equal(cat.ok, true);
  assert.ok(cat.commandCount > 0);
});

  await test("routes expose graphics API", () => {
  const fs = require("fs");
  const path = require("path");
  const routes = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
  assert.match(routes, /\/mia\/graphics\/catalog/);
  assert.match(routes, /\/mia\/graphics\/pipeline/);
});

  await test("vision doc exists", () => {
  const fs = require("fs");
  const path = require("path");
  const doc = fs.readFileSync(path.join(__dirname, "..", "docs", "MIA_GRAPHICS_STUDIO.md"), "utf8");
  assert.match(doc, /2D Content Studio/);
  assert.match(doc, /MIA\.generateImage/);
});

  console.log("mia_graphics_studio_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
