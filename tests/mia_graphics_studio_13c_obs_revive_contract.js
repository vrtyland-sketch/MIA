"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const {
  BODY_PARTS_OBS_TRANSFORM,
  isBodyTransformOnCanvas
} = require("../shared/mia-graphics-studio/bodyPartsCatalog");

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
  await test("catalog lists obs_body_revive as 13c", () => {
    const def = graphicsStudio.getCommand("obs_body_revive");
    assert.equal(def.phase, "13c");
    assert.equal(def.status, "implemented");
  });

  await test("body OBS transform fits portrait 1080x1920", () => {
    assert.equal(isBodyTransformOnCanvas(BODY_PARTS_OBS_TRANSFORM, {
      canvasW: 1080,
      canvasH: 1920,
      sourceWidth: 360,
      sourceHeight: 360
    }), true);
    assert.ok(BODY_PARTS_OBS_TRANSFORM.scaleX >= 1);
    assert.ok(BODY_PARTS_OBS_TRANSFORM.positionY < 1600);
  });

  await test("body preview refreshes browsers after sync", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "MIA_OBS_BODY_PREVIEW.js"), "utf8");
    assert.match(src, /MIA_STARTUP_CHECK/);
    assert.match(src, /refreshnocache/);
    assert.match(src, /phase: "13[cde]"/);
  });

  await test("dashboard has Oživit OBS + default Sync OBS", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(src, /btnBodyRevive/);
    assert.match(src, /Oživit OBS \+ ukaž body/);
    assert.match(src, /id="bankSyncObs"[^>]*checked/);
  });

  console.log("mia_graphics_studio_13c_obs_revive_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
