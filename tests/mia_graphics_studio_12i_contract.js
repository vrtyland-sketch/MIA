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
  await test("body runtime supports sync=graphics mode", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "lib", "mia-body-part-runtime.js"),
      "utf8"
    );
    assert.match(src, /SYNC_GRAPHICS/);
    assert.match(src, /\/mia\/graphics\/body\/state/);
    assert.match(src, /\/overlay-state/);
    assert.match(src, /pollGraphics/);
    assert.match(src, /applyPartVisibility/);
  });

  await test("buildBodyPartUrls appends sync=graphics", () => {
    const urls = graphicsStudio.buildBodyPartUrls("http://127.0.0.1:3000", {
      syncGraphics: true
    });
    assert.match(urls.miaHead, /part=head/);
    assert.match(urls.miaHead, /sync=graphics/);
    assert.match(urls.miaEyes, /part=eyes&sync=graphics/);
  });

  await test("getObsHook exposes graphics sync URLs", () => {
    const hook = graphicsStudio.getObsHook(3000);
    assert.equal(hook.phase, "12u");
    assert.equal(hook.bodyParts.length, 5);
    assert.ok(hook.graphicsSyncUrls);
    assert.match(hook.bodyStateUrl, /\/mia\/graphics\/body\/state/);
    assert.match(hook.graphicsSyncUrls.miaHands, /sync=graphics/);
  });

  await test("body publish state phase 12i", () => {
    graphicsStudio.resetBodyState();
    const published = graphicsStudio.publishBodyState({
      mood: "wave",
      speaking: true,
      parts: { head: true, eyes: false }
    });
    assert.equal(published.phase, "12u");
    assert.equal(published.mood, "wave");
    assert.equal(published.speaking, true);
    assert.equal(published.parts.head, true);
    assert.equal(published.parts.eyes, false);
  });

  await test("routes expose graphicsSyncUrls on body catalog", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
    assert.match(src, /graphicsSyncUrls/);
    assert.match(src, /syncGraphics:\s*true/);
    assert.match(src, /getBodyState\(\)\.phase/);
  });

  console.log("mia_graphics_studio_12i_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
