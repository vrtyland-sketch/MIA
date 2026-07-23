"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const paintBridge = require("../scripts/MIA_PAINT_BRIDGE");
const graphicsStudio = require("../shared/mia-graphics-studio");
const graphicsAgent = require("../scripts/MIA_GRAPHICS_AGENT");
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
  await test("12f create_avatar implemented in catalog", () => {
    const def = graphicsStudio.getCommand("create_avatar");
    assert.equal(def.status, "implemented");
    assert.equal(def.phase, "12f");
    const mods = graphicsStudio.listAvatarModules();
    assert.ok(mods.some((m) => m.route === "/mia/graphics/avatar/create"));
  });

  await test("avatar presets + koj export", async () => {
    const png = await paintAi.proceduralImage(64, 64, "avatar");
    const b64 = png.toString("base64");
    const saved = await graphicsStudio.saveAvatarToKojFactory(b64, "test_avatar_12f");
    assert.ok(saved.assetUrl.includes("/assets/kojnozrout/custom/"));
    assert.ok(fs.existsSync(saved.path));
  });

  await test("runCreateAvatar with provided image", async () => {
    paintBridge.resetSession();
    const png = await paintAi.proceduralImage(48, 48, "mia");
    const result = await graphicsStudio.runCreateAvatar(
      {
        name: "unit_avatar",
        dataBase64: png.toString("base64"),
        removeBackground: false,
        exportToKoj: true
      },
      {
        bridge: paintBridge,
        aiBridge: require("../scripts/MIA_PAINT_AI"),
        paintAi: { logPaintAi() {} }
      }
    );
    assert.equal(result.ok, true);
    assert.ok(result.assetUrl);
    assert.ok(result.clientSteps.some((s) => s.command === "preview_sync"));
    const preview = graphicsStudio.getPreviewStateFromBridge(paintBridge);
    assert.equal(preview.enabled, true);
    assert.ok(preview.imageUrl || preview.pngBase64);
  });

  await test("bridge publish_preview", () => {
    paintBridge.resetSession();
    const result = paintBridge.runCommand({
      action: "publish_preview",
      enabled: true,
      name: "live",
      dataBase64: Buffer.from("x").toString("base64"),
      width: 512,
      height: 512
    });
    assert.equal(result.ok, true);
    const state = graphicsAgent.getPreviewState();
    assert.equal(state.enabled, true);
    assert.equal(state.name, "live");
  });

  await test("OBS hook manifest", () => {
    const hook = graphicsStudio.getObsHook(3000);
    assert.equal(hook.inputName, "MIA_GRAPHICS_PREVIEW");
    assert.match(hook.browserUrl, /mia-graphics-preview\.html/);
    const live = require("../scripts/MIA_OBS_LIVE_MANIFEST");
    const layer = live.BROWSER_LAYERS.find((r) => r.id === "graphics_preview");
    assert.ok(layer);
    assert.equal(layer.inputName, "MIA_GRAPHICS_PREVIEW");
    const urls = live.buildSplitUrls(3000);
    assert.match(urls.graphicsPreview, /mia-graphics-preview\.html/);
  });

  await test("pipeline createAvatar step", async () => {
    paintBridge.resetSession();
    const png = await paintAi.proceduralImage(32, 32, "a");
    const pipeline = await graphicsStudio.runPipeline(
      [
        {
          command: "createAvatar",
          args: { name: "pipe_avatar", dataBase64: png.toString("base64"), removeBackground: false }
        }
      ],
      {
        bridge: paintBridge,
        aiBridge: require("../scripts/MIA_PAINT_AI"),
        paintAi: { logPaintAi() {} }
      }
    );
    assert.equal(pipeline.ok, true);
    assert.ok(pipeline.executed.some((e) => e.command === "MIA.createAvatar" && e.ok));
  });

  await test("routes + preview page exist", () => {
    const routes = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
    assert.match(routes, /\/mia\/graphics\/avatar\/create/);
    assert.match(routes, /\/mia\/graphics\/preview\/state/);
    assert.match(routes, /\/mia\/graphics\/obs/);
    const html = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-graphics-preview.html"),
      "utf8"
    );
    const appJs = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "app.js"),
      "utf8"
    );
    assert.match(html, /mia-graphics-preview\.js/);
    assert.match(appJs, /createAvatar/);
    assert.match(appJs, /toggleObsPreview/);
  });

  console.log("mia_graphics_studio_12f_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
