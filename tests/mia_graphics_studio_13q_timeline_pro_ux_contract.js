"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintCore = require("../shared/mia-paint-core");

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
  await test("catalog lists timeline_pro_ux as 13q", () => {
    const def = graphicsStudio.getCommand("timeline_pro_ux");
    assert.equal(def.phase, "13q");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "timeline_pro_ux" && m.phase === "13q"));
  });

  await test("ease-in / ease-out sampling curves differ from linear", () => {
    const kfsIn = [
      { timeMs: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, easing: "ease-in" },
      { timeMs: 1000, x: 100, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, easing: "ease-in" }
    ];
    const kfsOut = [
      { timeMs: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, easing: "ease-out" },
      { timeMs: 1000, x: 100, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, easing: "ease-out" }
    ];
    const earlyIn = paintCore.sampleKeyframes(kfsIn, 250).x;
    const earlyOut = paintCore.sampleKeyframes(kfsOut, 250).x;
    assert.ok(earlyIn < 25, `ease-in early should lag, got ${earlyIn}`);
    assert.ok(earlyOut > 25, `ease-out early should lead, got ${earlyOut}`);
    assert.equal(paintCore.normalizeEasing("ease_in"), "ease-in");
  });

  await test("updateLayerKeyframe normalizes easing", () => {
    const doc = paintCore.createDocument({ width: 32, height: 32, name: "13q" });
    paintCore.ensureMotion(doc.timeline);
    const layer = paintCore.getActiveLayer(doc);
    paintCore.addLayerKeyframe(doc.timeline, layer.id, { timeMs: 0, x: 0, easing: "linear" });
    const res = paintCore.updateLayerKeyframe(doc.timeline, layer.id, 0, { easing: "ease_out" });
    assert.equal(res.ok, true);
    assert.equal(res.keyframe.easing, "ease-out");
  });

  await test("paint wires onion ghosts, depth, easing UI, bone-ik", () => {
    const html = fs.readFileSync(path.join(PAINT, "index.html"), "utf8");
    assert.match(html, /id="onionDepth"/);
    assert.match(html, /data-tool="bone-ik"/);
    const gpu = fs.readFileSync(path.join(PAINT, "lib", "mia-paint-gpu.js"), "utf8");
    assert.match(gpu, /drawOnionGhosts/);
    assert.match(gpu, /_buildOnionGhostCache/);
    const app = fs.readFileSync(path.join(PAINT, "app.js"), "utf8");
    assert.match(app, /applyOnionSettingsFromUi/);
    assert.match(app, /applyIkAtWorld/);
    assert.match(app, /easing:\s*"ease"/);
    const tl = fs.readFileSync(path.join(PAINT, "lib", "timeline-editor.js"), "utf8");
    assert.match(tl, /ease-in-out/);
    assert.match(tl, /type === "select"/);
  });

  console.log("mia_graphics_studio_13q_timeline_pro_ux_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
