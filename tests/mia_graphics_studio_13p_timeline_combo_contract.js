"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintCore = require("../shared/mia-paint-core");
const {
  BODY_PART_ASSETS,
  REQUIRED_PART_FILES,
  PART_CROP_FRACTIONS,
  resolveHeadAsset
} = require("../shared/mia-graphics-studio/bodyPartsAssets");
const { generateAiMotionKeyframes } = require("../shared/mia-graphics-studio/aiMotionCommands");

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
  await test("catalog lists timeline_combo_maturity as 13p", () => {
    const def = graphicsStudio.getCommand("timeline_combo_maturity");
    assert.equal(def.phase, "13p");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "timeline_combo_maturity" && m.phase === "13p"));
  });

  await test("combo head is dedicated asset (not think alias)", () => {
    assert.equal(BODY_PART_ASSETS.head.moods.combo, "/assets/mia/parts/head/combo.png");
    assert.notEqual(BODY_PART_ASSETS.head.moods.combo, BODY_PART_ASSETS.head.moods.think);
    assert.ok(REQUIRED_PART_FILES.includes("head/combo.png"));
    assert.equal(resolveHeadAsset("combo"), "/assets/mia/parts/head/combo.png");
    assert.ok(PART_CROP_FRACTIONS.head.h >= 0.22);
  });

  await test("sampleKeyframes applies ease smoothstep mid-span", () => {
    const kfs = [
      { timeMs: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, easing: "ease" },
      { timeMs: 1000, x: 100, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, easing: "ease" }
    ];
    const mid = paintCore.sampleKeyframes(kfs, 500);
    assert.ok(Math.abs(mid.x - 50) < 0.01, `smoothstep mid should be ~50, got ${mid.x}`);
    const early = paintCore.sampleKeyframes(kfs, 250);
    assert.ok(early.x < 25, `ease early should lag linear 25, got ${early.x}`);
    const late = paintCore.sampleKeyframes(kfs, 750);
    assert.ok(late.x > 75, `ease late should lead linear 75, got ${late.x}`);
  });

  await test("AI motion keyframes carry easing ease", () => {
    const doc = paintCore.createDocument({ width: 64, height: 64, name: "13p" });
    paintCore.ensureMotion(doc.timeline);
    const layer = paintCore.getActiveLayer(doc);
    const result = generateAiMotionKeyframes(doc.timeline, layer.id, {
      style: "bounce",
      intensity: 0.5,
      durationMs: 800,
      startMs: 0
    });
    assert.equal(result.ok, true);
    const track = doc.timeline.motion.layerTracks[layer.id];
    assert.ok(track.keyframes.every((kf) => kf.easing === "ease"));
  });

  await test("paint UI + timeline + build wire 13p", () => {
    const html = fs.readFileSync(path.join(PAINT, "index.html"), "utf8");
    assert.match(html, /id="onionSkin"\s+checked/);
    const app = fs.readFileSync(path.join(PAINT, "app.js"), "utf8");
    assert.match(app, /onionSkinInput\.checked/);
    assert.match(app, /onionFrameIndices/);
    const tl = fs.readFileSync(path.join(PAINT, "lib", "timeline-editor.js"), "utf8");
    assert.match(tl, /_snapMs/);
    assert.match(tl, /tl-tick/);
    assert.match(tl, /pointerdown/);
    const build = fs.readFileSync(path.join(ROOT, "scripts", "build_mia_body_parts.js"), "utf8");
    assert.match(build, /faces\/combo\.png/);
    assert.match(build, /outMood === "combo"/);
    const runtime = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "lib", "mia-body-part-runtime.js"),
      "utf8"
    );
    const presence = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "lib", "mia-live-presence.js"),
      "utf8"
    );
    assert.match(runtime, /PRESENCE\.faces\.combo/);
    assert.match(presence, /combo:\s*IDLE|combo:\s*SPEAK|combo.*\/assets\/mia\/(?:cyber\/(?:lip\/01|speak)|parts\/head\/combo)\.png/);
  });

  console.log("mia_graphics_studio_13p_timeline_combo_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
