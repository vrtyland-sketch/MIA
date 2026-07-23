"use strict";

const assert = require("assert/strict");
const viewerStory = require("../scripts/MIA_VIEWER_STORY_MOMENT");
const walk = require("../scripts/MIA_KOJNOZROUT_WALK");
const careOpportunities = require("../scripts/MIA_KOJNOZROUT_CARE_OPPORTUNITIES");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- SPRINT 3 CONTRACT ----\n");

test("viewer story requires at least T2", () => {
  assert.equal(
    viewerStory.shouldPublishViewerStory({ tier: "T1", userLabel: "Fan", imageUrl: "/x.png" }).ok,
    false
  );
  assert.equal(
    viewerStory.shouldPublishViewerStory({ tier: "T2", userLabel: "Fan", imageUrl: "/x.png" }).ok,
    true
  );
});

test("viewer story builds spotlight frames from composed gift image", () => {
  const visual = viewerStory.buildViewerStoryVisual({
    userLabel: "Rose Fan",
    tier: "T3",
    giftName: "Galaxy",
    imageUrl: "/generated/gift-moments/test.png",
    avatarLoaded: true
  });

  assert.equal(visual.storyId, "viewer_spotlight");
  assert.equal(visual.frames.length, 2);
  assert.match(visual.frames[0].caption, /Rose/);
});

test("walk need triggers when energy is low", () => {
  assert.equal(
    walk.resolveWalkNeed({ energy: 30, vitals: { sleepDepth: 10 }, isSleeping: false }),
    true
  );
  assert.equal(
    walk.resolveWalkNeed({ energy: 80, vitals: { sleepDepth: 10 }, isSleeping: false }),
    false
  );
});

test("applyWalkCare starts walking session", () => {
  const next = walk.applyWalkCare({ energy: 25, mood: "sad", behavior: "watching" });
  assert.equal(next.behavior, "walking");
  assert.ok(next.walkUntilTs > Date.now());
  assert.equal(next.lastCareAction, "vencit");
});

test("care opportunities expose restless need with walk commands", () => {
  const built = careOpportunities.buildCareOpportunities({
    kojnozoutState: {
      energy: 28,
      hunger: 20,
      mood: "idle",
      vitals: { sleepDepth: 12 },
      isSleeping: false
    },
    backpackState: { leaders: [] },
    duelState: null
  });

  assert.equal(built.need, "restless");
  assert.ok(built.options.some((row) => String(row.command).includes("venc")));
});
