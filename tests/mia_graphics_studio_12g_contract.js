"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const manifest = require("../scripts/MIA_OBS_LIVE_MANIFEST");
const obsHands = require("../scripts/MIA_OBS_HANDS");
const bodyParts = require("../shared/mia-graphics-studio/bodyPartsCatalog");
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
  await test("body parts catalog lists five OBS layers", () => {
    const parts = bodyParts.listBodyParts();
    assert.equal(parts.length, 5);
    const ids = new Set(parts.map((row) => row.id));
    for (const required of ["mia_head", "mia_eyes", "mia_hands", "mia_feet", "mia_torso"]) {
      assert.ok(ids.has(required), `missing ${required}`);
    }
    for (const part of parts) {
      assert.equal(part.defaultVisible, false, `${part.id} must stay hidden on live`);
    }
  });

  await test("live manifest includes MIA body browser layers", () => {
    const live = manifest.buildLiveManifest({ port: 3000 });
    const ids = new Set(live.browserLayers.map((row) => row.id));
    for (const required of ["mia_head", "mia_eyes", "mia_hands", "mia_feet", "mia_torso", "graphics_preview"]) {
      assert.ok(ids.has(required), `manifest missing ${required}`);
    }
    const head = live.browserLayers.find((row) => row.id === "mia_head");
    assert.match(head.url, /mia-body-part-overlay\.html\?part=head/);
  });

  await test("split urls include body part query strings", () => {
    const urls = manifest.buildSplitUrls(3000);
    assert.match(urls.miaHead, /part=head/);
    assert.match(urls.miaEyes, /part=eyes/);
    assert.match(urls.graphicsPreview, /mia-graphics-preview\.html/);
  });

  await test("OBS hands specs cover body parts + graphics preview", () => {
    const split = manifest.buildSplitUrls(3000);
    const specs = obsHands.buildObsRecommendedSpecs(split);
    for (const id of ["mia_head", "mia_eyes", "mia_hands", "mia_feet", "mia_torso", "graphics_preview"]) {
      assert.ok(specs.some((row) => row.id === id), `hands missing ${id}`);
    }
  });

  await test("overlay html + runtime exist", () => {
    const root = path.join(__dirname, "..", "mia-output-overlay");
    assert.ok(fs.existsSync(path.join(root, "mia-body-part-overlay.html")));
    assert.ok(fs.existsSync(path.join(root, "lib", "mia-body-part-runtime.js")));
  });

  await test("OBS hook lists body parts", () => {
    const hook = graphicsStudio.getObsHook(3000);
    assert.ok(hook.phase);
    assert.ok(Array.isArray(hook.bodyParts));
    assert.equal(hook.bodyParts.length, 5);
    assert.equal(hook.bodyParts[0].inputName, "MIA_TORSO");
  });

  console.log("mia_graphics_studio_12g_contract passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
