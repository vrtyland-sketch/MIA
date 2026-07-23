"use strict";

const assert = require("assert/strict");
const graphicsStudio = require("../shared/mia-graphics-studio");
const fs = require("fs");
const path = require("path");

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
  await test("publishBodyPreview enables head eyes hands", () => {
    graphicsStudio.resetBodyPreview();
    const published = graphicsStudio.publishBodyPreview({ mood: "wave" });
    assert.equal(published.ok, true);
    assert.equal(published.phase, "12u");
    assert.equal(published.mood, "wave");
    assert.equal(published.layout, "hero");
    assert.equal(published.parts.head, true);
    assert.equal(published.parts.eyes, false);
    assert.equal(published.parts.hands, false);
    assert.equal(published.parts.feet, false);
    assert.equal(published.source, "studio");
  });

  await test("preview speaking sets hold and studio lock", () => {
    graphicsStudio.resetBodyPreview();
    const published = graphicsStudio.publishBodyPreview({
      mood: "happy",
      speaking: true,
      speakingHoldMs: 4000,
      lockStudioMs: 15000
    });
    assert.equal(published.speaking, true);
    assert.equal(published.layout, "hero");
    assert.equal(published.parts.head, true);
    assert.equal(published.parts.eyes, false);
    assert.equal(published.parts.hands, false);
    assert.ok(published.speakingUntilTs > Date.now());
    assert.ok(published.lockUntilTs > Date.now());
  });

  await test("resetBodyPreview restores defaults", () => {
    graphicsStudio.publishBodyPreview({ mood: "duel" });
    const reset = graphicsStudio.resetBodyPreview();
    assert.equal(reset.mood, "idle");
    assert.equal(reset.parts.head, false);
    assert.equal(reset.speaking, false);
  });

  await test("routes expose body preview endpoints", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
    assert.match(src, /\/mia\/graphics\/body\/preview/);
    assert.match(src, /\/mia\/graphics\/body\/preview\/reset/);
    assert.match(src, /listBodyPreviewPresets/);
  });

  await test("streamer dashboard wires preview buttons", () => {
    const html = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(html, /btnBodyPreview/);
    assert.match(html, /\/mia\/graphics\/body\/preview/);
    assert.match(html, /bodyPreviewMood/);
  });

  await test("listBodyPreviewPresets returns wave and gift", () => {
    const presets = graphicsStudio.listBodyPreviewPresets();
    assert.ok(presets.some((row) => row.id === "wave"));
    assert.ok(presets.some((row) => row.id === "gift"));
  });

  console.log("mia_graphics_studio_12m_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
