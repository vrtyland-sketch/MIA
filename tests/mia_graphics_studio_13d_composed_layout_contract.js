"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const {
  BODY_PART_OBS_TRANSFORMS,
  getBodyPartObsTransform,
  areBodyPartTransformsOnCanvas
} = require("../shared/mia-graphics-studio/bodyPartsCatalog");
const {
  resolvePreviewParts,
  DEFAULT_PREVIEW_PARTS
} = require("../shared/mia-graphics-studio/bodyPreviewCommands");

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
  await test("catalog lists composed_body_layout as 13d", () => {
    const def = graphicsStudio.getCommand("composed_body_layout");
    assert.equal(def.phase, "13d");
    assert.equal(def.status, "implemented");
  });

  await test("each body part has distinct OBS transform", () => {
    const head = getBodyPartObsTransform("head");
    const hands = getBodyPartObsTransform("hands");
    const eyes = getBodyPartObsTransform("eyes");
    assert.notEqual(head.positionY, hands.positionY);
    assert.notEqual(head.positionY, eyes.positionY);
    assert.ok(Object.keys(BODY_PART_OBS_TRANSFORMS).length >= 5);
    assert.equal(areBodyPartTransformsOnCanvas({ canvasW: 1080, canvasH: 1920 }), true);
  });

  await test("preview parts stay clean — head first, eyes only when speaking", () => {
    assert.equal(DEFAULT_PREVIEW_PARTS.head, true);
    assert.equal(DEFAULT_PREVIEW_PARTS.eyes, false);
    assert.equal(DEFAULT_PREVIEW_PARTS.hands, false);
    const hero = resolvePreviewParts({ mood: "wave" });
    assert.equal(hero.head, true);
    assert.equal(hero.hands, false);
    assert.equal(hero.eyes, false);
    const composed = resolvePreviewParts({ mood: "wave", layout: "composed" });
    assert.equal(composed.head, true);
    assert.equal(composed.hands, true);
    assert.equal(composed.eyes, false);
    const speak = resolvePreviewParts({ mood: "wave", speaking: true, layout: "composed" });
    assert.equal(speak.eyes, true);
    assert.equal(speak.head, true);
    assert.equal(speak.hands, false);
  });

  await test("body preview applies composed transforms", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "MIA_OBS_BODY_PREVIEW.js"), "utf8");
    assert.match(src, /getBodyPartObsTransform/);
    assert.match(src, /getHeroObsTransform/);
    assert.match(src, /phase: "13e"/);
  });

  console.log("mia_graphics_studio_13d_composed_layout_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
