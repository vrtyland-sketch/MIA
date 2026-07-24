"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");

const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs", "MIA_GRAPHICS_STUDIO.md");
const PAINT = path.join(ROOT, "mia-output-overlay", "mia-paint");
const DASH = path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html");

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
  await test("catalog lists operator_production_checklist as 13n", () => {
    const def = graphicsStudio.getCommand("operator_production_checklist");
    assert.equal(def.phase, "13n");
    assert.equal(def.status, "implemented");
    const exportImage = graphicsStudio.getCommand("export_image");
    assert.equal(exportImage.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "operator_production_checklist"));
  });

  await test("docs no longer mark motion/particles/export as planned red", () => {
    const docs = fs.readFileSync(DOCS, "utf8");
    assert.doesNotMatch(docs, /Oči \/ vlasy \| `motion` \| 🔴/);
    assert.doesNotMatch(docs, /Částice \| `createParticles` \| 🔴/);
    assert.doesNotMatch(docs, /Export \| `exportVideo` \| 🔴/);
    assert.match(docs, /createParticles` \| ✅/);
    assert.match(docs, /\*\*13n\*\*/);
    assert.match(docs, /bones \/ layer KF \/ kamera \(🟢 foundation/);
  });

  await test("paint wires True Alpha + MP4", () => {
    const html = fs.readFileSync(path.join(PAINT, "index.html"), "utf8");
    assert.match(html, /btnAiTrueAlpha/);
    assert.match(html, /btnExportMp4/);
    const app = fs.readFileSync(path.join(PAINT, "app.js"), "utf8");
    assert.match(app, /aiTrueAlpha/);
    assert.match(app, /exportMp4Animation/);
    assert.match(app, /true-alpha/);
    assert.match(app, /btnExportMp4/);
  });

  await test("dashboard production checklist + soft gates", () => {
    const dash = fs.readFileSync(DASH, "utf8");
    assert.match(dash, /bankProdChecklist/);
    assert.match(dash, /updateProductionChecklist/);
    assert.match(dash, /productionChecklistBlocks/);
    assert.match(dash, /lastPreviewedBankClipId/);
    assert.match(dash, /preview_required/);
    assert.match(dash, /12x[–-]13[a-z]/);
    assert.match(dash, /syncManifestLinks/);
    assert.match(dash, /gfxCacheBust/);
    assert.match(dash, /linkKojRuntime/);
  });

  console.log("mia_graphics_studio_13n_operator_polish_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
