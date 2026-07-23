"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const overlayStateModule = require("../scripts/MIA_OVERLAY_STATE");
const moodBrainRuntime = require("../scripts/MIA_MOOD_BRAIN");
const kojDisplay = require("../scripts/MIA_KOJNOZROUT_DISPLAY");

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
  await test("catalog lists mood_brain as 14b", () => {
    const def = graphicsStudio.getCommand("mood_brain");
    assert.equal(def.phase, "14b");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "mood_brain" && m.phase === "14b"));
  });

  await test("deriveRoomMoods maps sensitive vs upbeat chat", () => {
    const sensitive = graphicsStudio.deriveRoomMoods({
      lexiconTone: { spiceLevel: 10, energyLevel: 20, casualLevel: 30 },
      intent: { tone: "serious", moodHint: "serious", emotion: { type: "sadness" } }
    });
    assert.equal(sensitive.miaMood, "think");
    assert.equal(sensitive.kojMood, "warm");
    assert.equal(sensitive.roomTone, "sensitive");

    const upbeat = graphicsStudio.deriveRoomMoods({
      lexiconTone: { spiceLevel: 8, energyLevel: 62, casualLevel: 40 },
      intent: { tone: "neutral", moodHint: "excited", emotion: { type: "joy" } }
    });
    assert.equal(upbeat.miaMood, "happy");
    assert.ok(["excited", "laugh"].includes(upbeat.kojMood));
  });

  await test("resolveMoodFromOverlay prefers combo over community mood", () => {
    const now = Date.now();
    assert.equal(
      graphicsStudio.resolveMoodFromOverlay(
        {
          comboMoment: { active: true, holdUntilTs: now + 5000 },
          communityMood: { miaMood: "happy", holdUntilTs: now + 8000, active: true }
        },
        now
      ),
      "combo"
    );
  });

  await test("resolveMoodFromOverlay uses community mood when calm", () => {
    const now = Date.now();
    assert.equal(
      graphicsStudio.resolveMoodFromOverlay(
        {
          communityMood: {
            miaMood: "think",
            kojMood: "warm",
            holdUntilTs: now + 8000,
            active: true
          }
        },
        now
      ),
      "think"
    );
  });

  await test("overlay state stores and prunes communityMood", () => {
    const state = overlayStateModule.createOverlayState();
    const now = Date.now();
    overlayStateModule.setCommunityMood(state, {
      roomTone: "cozy",
      miaMood: "happy",
      kojMood: "warm",
      holdUntilTs: now + 5000
    });
    const snap = overlayStateModule.getOverlaySnapshot(state);
    assert.equal(snap.communityMood.miaMood, "happy");
    state.communityMood.holdUntilTs = now - 1;
    const pruned = overlayStateModule.getOverlaySnapshot(state);
    assert.equal(pruned.communityMood, null);
  });

  await test("koj display reads community mood after behavior pulses", () => {
    const now = Date.now();
    const mood = kojDisplay.resolveContextualDisplayMood(
      "idle",
      { behavior: "idle", mood: "idle" },
      {
        communityMood: {
          kojMood: "play",
          holdUntilTs: now + 5000,
          active: true
        }
      },
      now
    );
    assert.equal(mood, "play");
  });

  await test("pipeline observe hook wired", () => {
    const observe = fs.readFileSync(path.join(ROOT, "scripts", "pipeline", "phase_observe.js"), "utf8");
    assert.match(observe, /MIA_MOOD_BRAIN/);
    assert.match(observe, /observeCommentMood/);
    assert.ok(typeof moodBrainRuntime.observeCommentMood === "function");
    const speech = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "speech-overlay.html"), "utf8");
    assert.match(speech, /communityMood/);
  });

  console.log("mia_graphics_studio_14b_mood_brain_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
