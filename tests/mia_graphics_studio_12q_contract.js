"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("mapAnimationEmotionToBodyMood maps bank emotions to pose moods", () => {
    assert.equal(graphicsStudio.mapAnimationEmotionToBodyMood("excited"), "gift");
    assert.equal(graphicsStudio.mapAnimationEmotionToBodyMood("party"), "combo");
    assert.equal(graphicsStudio.mapAnimationEmotionToBodyMood("angry"), "duel");
    assert.equal(graphicsStudio.mapAnimationEmotionToBodyMood("happy"), "happy");
    assert.equal(graphicsStudio.mapAnimationEmotionToBodyMood("unknown_emotion"), "gift");
  });

  await test("resolveMoodFromOverlay prefers active animationReaction", () => {
    const now = Date.now();
    assert.equal(
      graphicsStudio.resolveMoodFromOverlay(
        {
          animationReaction: {
            active: true,
            emotion: "party",
            holdUntilTs: now + 4000,
            animationId: "gift/rose"
          },
          duel: { active: true, holdUntilTs: now + 5000 }
        },
        now
      ),
      "combo"
    );
  });

  await test("syncFromOverlayPublic publishes animation-driven body mood", () => {
    graphicsStudio.resetBodyState();
    graphicsStudio.resetLiveSyncSignature();
    const now = Date.now();
    const synced = graphicsStudio.syncFromOverlayPublic(
      {
        animationReaction: {
          active: true,
          emotion: "excited",
          animationOwner: "mia",
          speechIntent: { owner: "mia", tone: "happy" },
          holdUntilTs: now + 5000,
          animationId: "gift/galaxy"
        }
      },
      now
    );
    assert.ok(synced);
    assert.equal(synced.mood, "gift");
    assert.equal(synced.speaking, true);
    assert.equal(synced.source, "live");
  });

  await test("gift media runtime passes animation mood to body gift moment", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "MIA_GIFT_MEDIA_RUNTIME.js"),
      "utf8"
    );
    assert.match(src, /mapAnimationEmotionToBodyMood/);
    assert.match(src, /getAnimationReactionSnapshot/);
    assert.match(src, /scheduleGiftBodyMomentShow/);
  });

  await test("obs hook and body state report phase 12q features", () => {
    graphicsStudio.resetBodyPreview();
    const hook = graphicsStudio.getObsHook(3000);
    assert.ok(hook.hybridSyncUrls);
    assert.ok(hook.bodyStateUrl);
  });

  console.log("mia_graphics_studio_12q_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
