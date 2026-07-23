"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const achievement = require("../scripts/MIA_ACHIEVEMENT_MOMENT");
const presentation = require("../scripts/MIA_GIFT_PRESENTATION");

test("buildAchievementDelivery creates combo flash, koj overlay and voice", () => {
  const delivery = achievement.buildAchievementDelivery(
    { id: "first_gift", label: "První gift", public: true },
    { userLabel: "Tomino Stream" }
  );

  assert.equal(delivery.comboMoment.kind, "ACHIEVEMENT");
  assert.equal(delivery.comboMoment.source, "achievement");
  assert.equal(delivery.comboMoment.title, "První gift");
  assert.equal(delivery.comboMoment.subtext, "Tomino Stream");
  assert.equal(delivery.kojOverlay.mood, "celebrate");
  assert.equal(delivery.kojOverlay.meta.achievementId, "first_gift");
  assert.match(delivery.kojOverlay.text, /Tomino/);
  assert.match(delivery.kojOverlay.text, /První gift/);
  assert.equal(delivery.voicePlan.shouldSpeak, true);
  assert.equal(delivery.voicePlan.voiceSpeaker, "kojnozout");
  assert.match(delivery.voicePlan.text, /Tomino/);
});

test("private achievements do not build a moment", () => {
  const delivery = achievement.buildAchievementDelivery(
    { id: "coins_1000", label: "1000 coins (internal)", public: false },
    { userLabel: "Tomino" }
  );
  assert.equal(delivery.comboMoment, null);
  assert.equal(delivery.kojOverlay, null);
  assert.equal(delivery.voicePlan, null);
});

test("prepareGiftPresentation attaches achievement moment to plan", () => {
  const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");
  const support = {
    giftName: "Rose",
    giftKey: "ROSE",
    giftStats: {
      achievements: [{ id: "first_gift", label: "První gift", public: true }]
    },
    giftMapRuntime: { overlay: { text: "Tomino poslal Rose" } }
  };
  support.giftContext = giftEconomy.buildResolvedGiftContext({
    support,
    giftProfile: { tier: "T1" }
  });

  const prepared = presentation.prepareGiftPresentation(
    { user: { nickname: "Tomino" }, support },
    {
      overlayPayload: {
        owner: "mia",
        text: "Tomino poslal Rose",
        holdMs: 5000
      },
      tier: "T1"
    }
  );

  assert.equal(prepared.plan.lanes.achievementMoment, true);
  assert.equal(prepared.plan.comboMoment.source, "achievement");
  assert.equal(prepared.plan.achievementKojOverlay.owner, "kojnozout");
  assert.equal(prepared.plan.achievementVoicePlan.shouldSpeak, true);
});

test("achievement combo loses to stronger boss moment", () => {
  const comboOverlay = require("../scripts/MIA_COMBO_OVERLAY");
  const achievementMoment = achievement.buildAchievementComboMoment(
    { id: "first_gift", label: "První gift" },
    { userLabel: "Tomino" }
  );
  const bossMoment = comboOverlay.buildBossComboMoment({
    streamTier: "T6",
    giftName: "Universe",
    bossBanner: "LEGEND BOSS"
  });

  const picked = comboOverlay.pickStrongerMoment(achievementMoment, bossMoment);
  assert.equal(picked.source, "boss_event");
  assert.ok(picked.priority > achievementMoment.priority);
});
