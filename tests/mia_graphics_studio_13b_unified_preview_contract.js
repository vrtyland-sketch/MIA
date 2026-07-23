"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const {
  resolveBodyMoodFromStudioPreview,
  SPRITE_HINT_TO_BODY_MOOD,
  mapAnimationEmotionToBodyMood
} = require("../shared/mia-graphics-studio/bodyAnimationSync");
const { pushBankClipPreview } = require("../shared/mia-animation-engine/bankPreview");

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
  await test("catalog lists unified_studio_preview as 13b", () => {
    const def = graphicsStudio.getCommand("unified_studio_preview");
    assert.equal(def.phase, "13b");
    assert.equal(def.status, "implemented");
  });

  await test("spriteHint react-gift maps to gift body mood", () => {
    assert.equal(SPRITE_HINT_TO_BODY_MOOD["react-gift"], "gift");
    assert.equal(mapAnimationEmotionToBodyMood("react-gift"), "gift");
    assert.equal(mapAnimationEmotionToBodyMood("party-pop"), "combo");
  });

  await test("resolveBodyMoodFromStudioPreview prefers emotion then spriteHint", () => {
    assert.equal(
      resolveBodyMoodFromStudioPreview({
        clip: { spriteHint: "react-gift", emotion: "wave" },
        reaction: { emotion: "wave" }
      }),
      "wave"
    );
    assert.equal(
      resolveBodyMoodFromStudioPreview({
        clip: { spriteHint: "react-gift" },
        reaction: {}
      }),
      "gift"
    );
  });

  await test("pushBankClipPreview returns unified bodyMood", () => {
    const state = { animationReaction: null };
    const result = pushBankClipPreview(
      { clipId: "gift/rose", syncBody: true },
      {
        overlayStateModule: {
          setAnimationReaction(s, payload) {
            s.animationReaction = { ...payload, active: true };
            return s.animationReaction;
          }
        },
        overlayState: state
      }
    );
    assert.equal(result.ok, true);
    assert.equal(result.pushed, true);
    assert.equal(result.unifiedPreview, true);
    assert.equal(result.phase, "13b");
    assert.ok(result.bodyMood);
    assert.ok(result.bodyPreview?.ok !== false || result.bodyPreview?.mood);
  });

  await test("dashboard has Preview body+Koj and sync checkboxes", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(src, /Preview body\+Koj/);
    assert.match(src, /bankSyncBody/);
    assert.match(src, /bankSyncObs/);
    assert.match(src, /syncObs/);
  });

  await test("preview route supports async OBS sync", () => {
    const src = fs.readFileSync(path.join(ROOT, "routes", "eyes.js"), "utf8");
    assert.match(src, /syncObsBodyPreviewVisibility/);
    assert.match(src, /syncObs === true/);
  });

  console.log("mia_graphics_studio_13b_unified_preview_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
