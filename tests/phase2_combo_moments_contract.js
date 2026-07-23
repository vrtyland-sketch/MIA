"use strict";

const assert = require("assert/strict");
const {
  createComboMomentDetector,
  momentToQueueAction,
  isComboMomentsEnabled
} = require("../core/combo-moments");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("combo moments enabled by default", () => {
  assert.equal(isComboMomentsEnabled({}), true);
});

test("solo_combo after rapid gifts from same user", () => {
  const d = createComboMomentDetector({ soloMin: 3, soloWindowMs: 8000 });
  const base = Date.now();
  let last = null;
  for (let i = 0; i < 3; i++) {
    last = d.observe(
      {
        type: "gift",
        user: { id: "solo1", name: "Solo" },
        gift: { name: "Rose", miaPoints: 7.5 }
      },
      { now: base + i * 500 }
    );
  }
  assert.equal(last.moment.type, "solo_combo");
  assert.match(last.moment.subtext, /miaPoints/);
  assert.ok(!JSON.stringify(last.moment).includes("coins"));
});

test("community_burst across users", () => {
  const d = createComboMomentDetector({
    burstMinGifts: 3,
    burstMinUsers: 3,
    burstWindowMs: 10000
  });
  const base = Date.now();
  let last = null;
  for (let i = 0; i < 3; i++) {
    last = d.observe(
      {
        type: "gift",
        user: { id: `u${i}`, name: `User${i}` },
        gift: { name: "Rose", miaPoints: 15 }
      },
      { now: base + i * 200 }
    );
  }
  assert.equal(last.moment.type, "community_burst");
  assert.equal(last.moment.kind, "COMMUNITY_BURST");
});

test("first_support when wasNew", () => {
  const d = createComboMomentDetector();
  const result = d.observe(
    {
      type: "gift",
      user: { id: "newbie", name: "New" },
      gift: { name: "Rose", miaPoints: 7.5 }
    },
    { isFirstSupport: true, viewerMemoryWasNew: true }
  );
  assert.equal(result.moment.type, "first_support");
});

test("bowl_rush near full", () => {
  const d = createComboMomentDetector();
  const result = d.observe(
    {
      type: "gift",
      user: { id: "feeder", name: "Feeder" },
      gift: { name: "Lion", miaPoints: 1000 }
    },
    { bowlPercent: 92 }
  );
  assert.equal(result.moment.type, "bowl_rush");
});

test("momentToQueueAction has no coins", () => {
  const action = momentToQueueAction({
    type: "solo_combo",
    kind: "SOLO_COMBO",
    title: "SOLO",
    subtext: "x",
    priority: 4,
    holdMs: 5000
  });
  assert.equal(action.type, "overlay");
  assert.ok(!JSON.stringify(action).toLowerCase().includes('"coins"'));
});

console.log("phase2_combo_moments_contract: all passed");
