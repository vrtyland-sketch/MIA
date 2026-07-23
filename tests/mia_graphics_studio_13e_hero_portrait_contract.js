"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const {
  HERO_OBS_TRANSFORM,
  isHeroTransformOnCanvas,
  normalizeBodyLayout,
  resolveHeroParts
} = require("../shared/mia-graphics-studio/bodyHeroPortrait");

const ROOT = path.resolve(__dirname, "..");

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
  await test("catalog lists hero_body_portrait as 13e", () => {
    const def = graphicsStudio.getCommand("hero_body_portrait");
    assert.equal(def.phase, "13e");
    assert.equal(def.status, "implemented");
  });

  await test("hero transform sits above speech strip on portrait", () => {
    assert.equal(isHeroTransformOnCanvas(), true);
    assert.ok(HERO_OBS_TRANSFORM.scaleX >= 1.4);
    assert.ok(HERO_OBS_TRANSFORM.positionY < 1300);
    assert.equal(normalizeBodyLayout("hero"), "hero");
    assert.equal(normalizeBodyLayout("composed"), "composed");
  });

  await test("default preview is hero — head only", () => {
    graphicsStudio.resetBodyPreview();
    const published = graphicsStudio.publishBodyPreview({ mood: "wave" });
    assert.equal(published.layout, "hero");
    assert.deepEqual(resolveHeroParts(), {
      head: true,
      eyes: false,
      hands: false,
      torso: false,
      feet: false
    });
    assert.equal(published.parts.head, true);
    assert.equal(published.parts.hands, false);
    assert.equal(published.parts.eyes, false);
  });

  await test("OBS sync + speech overlay support hero mode", () => {
    const obs = fs.readFileSync(path.join(ROOT, "scripts", "MIA_OBS_BODY_PREVIEW.js"), "utf8");
    const speech = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "speech-overlay.html"),
      "utf8"
    );
    const dash = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(obs, /getHeroObsTransform/);
    assert.match(obs, /phase: "13e"/);
    assert.match(speech, /body-hero-active/);
    assert.match(speech, /syncBodyHeroPresence/);
    assert.match(speech, /body-hero-active\.speaking/);
    assert.match(speech, /opacity: 0 !important/);
    assert.match(dash, /Hero portrait/);
    assert.match(dash, /layout: "hero"/);
    const runtime = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "lib", "mia-body-part-runtime.js"),
      "utf8"
    );
    assert.match(runtime, /MiaLivePresence/);
    assert.match(runtime, /canLipSpeak/);
  });

  console.log("mia_graphics_studio_13e_hero_portrait_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
