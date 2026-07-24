"use strict";

const assert = require("assert/strict");
const display = require("../scripts/MIA_KOJNOZROUT_DISPLAY");

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

console.log("\n---- KOJNOZROUT DISPLAY MOOD CONTRACT ----\n");

test("sleepy state maps to sleepy sprite even when bowl is full", () => {
  const mood = display.resolveKojDisplayMood(
    {
      mood: "sleepy",
      isSleeping: true,
      bowlPercent: 98,
      affliction: null
    },
    { need: "sleepy" }
  );
  assert.equal(mood, "sleepy");
  assert.equal(display.resolveKojSpriteAssetKey(mood), "sleepy");
});

test("sick state maps to sick sprite", () => {
  const mood = display.resolveKojDisplayMood(
    { mood: "sick", affliction: "sick", bowlPercent: 80 },
    { need: "sick", needLabel: "Je nemocný" }
  );
  assert.equal(mood, "sick");
  assert.equal(display.resolveKojSpriteAssetKey(mood), "sick");
});

test("happy state maps to happy sprite", () => {
  const mood = display.resolveKojDisplayMood(
    { mood: "happy", bowlPercent: 70, hunger: 20 },
    { need: "happy" }
  );
  assert.equal(mood, "happy");
});

test("recent feed pulse maps to eating sprite", () => {
  const now = Date.now();
  const mood = display.resolveKojDisplayMood(
    {
      mood: "hungry",
      hunger: 60,
      bowlPercent: 40,
      behavior: "big_feed",
      lastFedAt: now - 2000
    },
    { need: "hungry" },
    now
  );
  assert.equal(mood, "eating");
  assert.match(display.resolveKojSpriteAssetKey(mood, {
    behavior: "big_feed",
    lastFedAt: now - 2000,
    feedPoints: 7
  }, now), /^eating-/);
});

test("warm mood maps to warm sprite", () => {
  const mood = display.resolveKojDisplayMood(
    { mood: "warm", bowlPercent: 40, hunger: 30 },
    { need: "idle" }
  );
  assert.equal(mood, "warm");
  assert.equal(display.resolveKojSpriteAssetKey(mood), "warm");
});

test("sleepy feed keeps sleepy sprite", () => {
  const now = Date.now();
  const mood = display.resolveKojDisplayMood(
    {
      mood: "sleepy",
      isSleeping: true,
      behavior: "sleepy_feed",
      lastFedAt: now - 1000
    },
    { need: "sleepy" },
    now
  );
  assert.equal(mood, "sleepy");
});

test("display snapshot aligns bowl label with sprite mood", () => {
  const snap = display.buildKojDisplaySnapshot(
    { mood: "sick", affliction: "sick", bowlPercent: 55 },
    { need: "sick", needLabel: "Je nemocný", needEmoji: "🤢" }
  );
  assert.equal(snap.mood, "sick");
  assert.equal(snap.spriteAsset, "sick");
  assert.ok(snap.spriteUrl.includes("kojnozout-sick.png"));
  assert.equal(snap.panelClass, "sick");
  assert.equal(snap.needLabel, "Je nemocný");
});

test("feeding snapshot shows eating label", () => {
  const now = Date.now();
  const snap = display.buildKojDisplaySnapshot(
    {
      mood: "hungry",
      behavior: "support_feed",
      lastFedAt: now - 500,
      bowlPercent: 30
    },
    { need: "hungry", needLabel: "Má hlad" },
    now
  );
  assert.equal(snap.feeding, true);
  assert.equal(snap.needLabel, "Jí z misky");
  assert.match(snap.spriteAsset, /^eating-/);
});

test("sad snapshot uses sad sprite", () => {
  const snap = display.buildKojDisplaySnapshot(
    { mood: "sad", affliction: "sad", bowlPercent: 40 },
    { need: "sad", needLabel: "Je smutný" }
  );
  assert.equal(snap.mood, "sad");
  assert.equal(snap.spriteAsset, "sad");
  assert.equal(snap.needLabel, "Je smutný");
  assert.equal(snap.panelClass, "sad");
});

test("annoyed snapshot maps to annoyed sprite", () => {
  const snap = display.buildKojDisplaySnapshot(
    { mood: "annoyed", bowlPercent: 30 },
    { need: "annoyed", needLabel: "Je naštvaný" }
  );
  assert.equal(snap.mood, "annoyed");
  assert.equal(snap.spriteAsset, "annoyed");
});

test("combo moment maps to combo sprite", () => {
  const now = Date.now();
  const snap = display.buildKojDisplaySnapshot(
    { mood: "happy", bowlPercent: 40 },
    { need: "happy" },
    now,
    {
      comboMoment: {
        active: true,
        holdUntilTs: now + 5000,
        kind: "COMBO"
      }
    }
  );
  assert.equal(snap.mood, "combo-fire");
  assert.equal(snap.spriteAsset, "combo-fire");
  assert.equal(snap.moodEmoji, "🔥");
  assert.equal(snap.panelClass, "combo");
});

test("full bowl trigger shows celebrate sprite", () => {
  const now = Date.now();
  const snap = display.buildKojDisplaySnapshot(
    {
      mood: "full",
      bowlPercent: 100,
      stage: "stuffed",
      bowl: {
        percent: 100,
        stage: "stuffed",
        meta: {
          fullTriggered: true,
          fullTs: now - 1000,
          lastEvent: "FULL_BOWL_TRIGGER",
          lastTransitionTs: now - 1000
        }
      }
    },
    { need: "happy" },
    now
  );
  assert.equal(snap.mood, "celebrate");
  assert.equal(snap.spriteAsset, "celebrate");
});

test("gift video hype phase uses hype sprite", () => {
  const now = Date.now();
  const reaction = display.buildKojVideoReaction(
    {
      currentPlayback: {
        tier: "T5",
        sourceName: "T5_VIDEO_01",
        startedAt: now - 30000
      }
    },
    now
  );
  assert.equal(reaction.phase, "hype");
  const snap = display.buildKojDisplaySnapshot(
    { mood: "idle", bowlPercent: 40 },
    { need: "idle" },
    now,
    { videoReaction: reaction }
  );
  assert.equal(snap.mood, "hype-jump");
  assert.equal(snap.spriteAsset, "hype-jump");
  assert.equal(snap.moodEmoji, "🚀");
  assert.equal(snap.needLabel, "Hype u videa!");
});

test("duel active maps to duel sprite", () => {
  const snap = display.buildKojDisplaySnapshot(
    { mood: "happy", bowlPercent: 50 },
    { need: "happy" },
    Date.now(),
    { duel: { active: true, phase: "live" } }
  );
  assert.equal(snap.mood, "duel-ready");
  assert.equal(snap.spriteAsset, "duel-ready");
});

test("long gift video escalates to dance then hype mood", () => {
  const now = Date.now();
  const video = {
    currentPlayback: {
      tier: "T3",
      sourceName: "T3_VIDEO_01",
      startedAt: now - 10000
    }
  };
  const reaction = display.buildKojVideoReaction(video, now);
  assert.equal(reaction.phase, "dance");
  const snap = display.buildKojDisplaySnapshot(
    { mood: "idle", bowlPercent: 40 },
    { need: "idle" },
    now,
    { video, videoReaction: reaction }
  );
  assert.equal(snap.mood, "dance");
  assert.equal(snap.spriteAsset, "dance");
  assert.equal(snap.videoReaction.phase, "dance");
});

test("sad koj dances during gift video reaction", () => {
  const now = Date.now();
  const reaction = display.buildKojVideoReaction(
    {
      currentPlayback: {
        tier: "T3",
        sourceName: "T3_VIDEO_01",
        startedAt: now - 10000
      }
    },
    now
  );
  const snap = display.buildKojDisplaySnapshot(
    { mood: "sad", affliction: "sad", bowlPercent: 40 },
    { need: "sad", needLabel: "Je smutný" },
    now,
    { videoReaction: reaction }
  );
  assert.equal(snap.mood, "dance");
  assert.equal(snap.spriteAsset, "dance");
  assert.equal(snap.needLabel, "Tancuje k videu");
});

test("sleepy koj ignores gift video reaction", () => {
  const now = Date.now();
  const reaction = display.buildKojVideoReaction(
    {
      currentPlayback: {
        tier: "T5",
        sourceName: "T5_VIDEO_01",
        startedAt: now - 30000
      }
    },
    now
  );
  assert.equal(reaction.phase, "hype");
  const snap = display.buildKojDisplaySnapshot(
    { mood: "sleepy", isSleeping: true, bowlPercent: 40 },
    { need: "sleepy" },
    now,
    { videoReaction: reaction }
  );
  assert.equal(snap.mood, "sleepy");
  assert.equal(snap.spriteAsset, "sleepy");
});

test("spam milestone combo sets celebrationFocus and avoids wave-left chat flop", () => {
  const now = Date.now();
  const extras = {
    comboMoment: {
      kind: "SPAM_MILESTONE",
      source: "spam_reward",
      holdUntilTs: now + 8000
    }
  };
  assert.equal(display.isSpeechOrStoryMoment(extras, now), true);
  const snap = display.buildKojDisplaySnapshot(
    { mood: "happy", behavior: "play_with_chat", lastPingAt: now - 500, bowlPercent: 40 },
    { need: "happy" },
    now,
    extras
  );
  assert.equal(snap.celebrationFocus, true);
  assert.notEqual(snap.spriteAsset, "wave-left");
  assert.notEqual(snap.spriteAsset, "wave-right");
});

test("ambient wave pose is replaced during speech bubble window", () => {
  const now = Date.now();
  const mood = display.resolveAmbientSpriteMood(
    "idle",
    {},
    now,
    {
      kojnozoutOverlay: {
        text: "Ahoj komunito!",
        holdUntilTs: now + 5000
      }
    }
  );
  assert.notEqual(mood, "wave");
  assert.notEqual(mood, "wave-left");
});

test("ambient warm mood rotates sprite poses", () => {
  const a = display.resolveAmbientSpriteMood("warm", {}, 0);
  const b = display.resolveAmbientSpriteMood("warm", {}, 12000);
  assert.notEqual(a, b, `ambient pose should rotate (${a} vs ${b})`);
});

test("every derived sprite key resolves emoji", () => {
  const { resolveMoodEmoji } = require("../scripts/MIA_KOJNOZROUT_MOOD_EMOJI");
  const { DERIVED_MOOD_KEYS } = require("../scripts/KOJNOZROUT_MOOD_DERIVE");
  for (const key of DERIVED_MOOD_KEYS) {
    const emoji = resolveMoodEmoji(key);
    assert.ok(emoji && emoji.length > 0, `missing emoji for ${key}`);
  }
});

test("buildKojDisplaySnapshot always includes moodEmoji string", () => {
  const snap = display.buildKojDisplaySnapshot(
    { mood: "idle", bowlPercent: 50 },
    { need: "idle" },
    Date.now()
  );
  assert.equal(typeof snap.moodEmoji, "string");
  assert.ok(snap.moodEmoji.length > 0);
});

test("isSpeechOrStoryMoment detects active overlay and story visual", () => {
  const now = Date.now();
  assert.equal(
    display.isSpeechOrStoryMoment(
      { storyVisual: { active: true, holdUntilTs: now + 5000 } },
      now
    ),
    true
  );
  assert.equal(
    display.isSpeechOrStoryMoment(
      { miaOverlay: { text: "Ahoj", holdUntilTs: now + 3000 } },
      now
    ),
    true
  );
  assert.equal(display.isSpeechOrStoryMoment({}, now), false);
});

test("video reaction holds briefly after playback ends", () => {
  const now = Date.now();
  const reaction = display.buildKojVideoReaction(
    {
      lastStartedAt: now - 12000,
      lastEndedAt: now - 500,
      lastResult: { tier: "T3", sourceName: "T3_VIDEO_01" }
    },
    now
  );
  assert.equal(reaction.active, true);
  assert.equal(reaction.holdAfterEnd, true);
  assert.equal(reaction.phase, "dance");
});

console.log("\n---- KOJNOZROUT DISPLAY MOOD CONTRACT SUMMARY ----\n");

if (process.exitCode) {
  process.exit(process.exitCode);
}
