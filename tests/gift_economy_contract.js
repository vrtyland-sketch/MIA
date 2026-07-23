"use strict";

const assert = require("assert");
const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");
const supporterProfile = require("../scripts/MIA_GIFT_SUPPORTER_PROFILE");
const {
  enrichNormalizedSupport,
  resolveTierFromEconomy,
  useCoinTierEconomy
} = require("../scripts/MIA_SUPPORT_RESOLVER");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test("coin tiers match canon ranges", () => {
  assert.equal(giftEconomy.resolveStreamTierFromCoins(1), "T1");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(99), "T1");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(100), "T2");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(999), "T2");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(1000), "T3");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(4999), "T3");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(5000), "T4");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(9999), "T4");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(10000), "T5");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(24999), "T5");
  assert.equal(giftEconomy.resolveStreamTierFromCoins(25000), "T6");
});

test("T6 maps to T5 OBS video tier", () => {
  assert.equal(giftEconomy.mapStreamTierToObsTier("T6"), "T5");
  assert.equal(giftEconomy.mapStreamTierToObsTier("T4"), "T4");
});

test("gift levels progress with cumulative xp", () => {
  assert.equal(giftEconomy.resolveGiftLevel(0).giftLevel, 1);
  assert.equal(giftEconomy.resolveGiftLevel(150).giftLevel, 2);
  assert.equal(giftEconomy.resolveGiftLevel(600).giftLevel, 3);
  assert.equal(giftEconomy.resolveGiftLevel(100000).giftLevel, 8);
});

test("combo tiers from repeat count", () => {
  assert.equal(giftEconomy.resolveComboTier(9).comboTier, null);
  assert.equal(giftEconomy.resolveComboTier(10).comboTier, "COMBO");
  assert.equal(giftEconomy.resolveComboTier(50).comboTier, "SUPER");
  assert.equal(giftEconomy.resolveComboTier(100).comboTier, "ULTIMATE");
});

test("streak bonus applies to xp award", () => {
  assert.equal(giftEconomy.resolveStreakBonusPct(2), 0);
  assert.equal(giftEconomy.resolveStreakBonusPct(3), 10);
  assert.equal(giftEconomy.applyXpBonus(100, 10), 110);
});

test("resolver uses coin tiers by default", () => {
  assert.equal(useCoinTierEconomy(), true);
  assert.equal(resolveTierFromEconomy(1000, 7500), "T3");
  assert.equal(resolveTierFromEconomy(25000, 187500), "T6");
});

test("enrichNormalizedSupport adds streamTier obsTier xp giftContext fields", () => {
  const normalized = enrichNormalizedSupport(
    {
      platform: "tiktok",
      support: {
        giftName: "Galaxy",
        coins: 1000,
        repeatCount: 1
      }
    },
    {}
  );

  // Galaxy katalog T5 > coin T3 → playback tier z gift mapy
  assert.equal(normalized.support.coinTier, "T3");
  assert.equal(normalized.support.streamTier, "T5");
  assert.equal(normalized.support.obsTier, "T5");
  assert.equal(normalized.support.giftKey, "GALAXY");
  const ctx = giftEconomy.buildResolvedGiftContext({
    support: normalized.support,
    giftProfile: normalized.support.giftProfile
  });
  assert.equal(ctx.tierKinds.coin, "T3");
  assert.equal(ctx.tierKinds.stream, "T5");
  assert.equal(ctx.mapTier, "T5");
  assert.equal(normalized.support.xpBase, 1000);
  assert.equal(normalized.support.miaPoints, 7500);
  assert.equal(normalized.support.economy.tierMode, "coins");
  assert.equal(
    normalized.support.economy.sourceOfTruth,
    "MIA_SUPPORT_RESOLVER+shared/gifts"
  );
});

test("supporter profile tracks streak and cumulative xp", () => {
  let state = supporterProfile.createGiftSupporterProfile();
  const normalized = {
    ts: Date.parse("2026-06-18T12:00:00Z"),
    user: { userId: "42", nickname: "Fan" },
    support: { giftName: "Rose", totalCoins: 100, tier: "T2" }
  };

  const first = supporterProfile.recordGiftSupport(state, normalized, normalized.support);
  state = first.state;
  assert.equal(first.xpAward, 100);
  assert.equal(first.supporter.streakDays, 1);

  const nextDay = {
    ...normalized,
    ts: Date.parse("2026-06-19T12:00:00Z")
  };
  const second = supporterProfile.recordGiftSupport(state, nextDay, nextDay.support);
  assert.equal(second.supporter.streakDays, 2);
  assert.equal(second.streakBonusPct, 0);
  assert.equal(second.supporter.cumulativeXp, 200);
});

test("resolved gift context excludes coins from overlay-facing shape", () => {
  const ctx = giftEconomy.buildResolvedGiftContext({
    support: {
      giftName: "Rose",
      totalCoins: 100,
      repeatCount: 10,
      tier: "T2",
      obsTier: "T2",
      xp: 110,
      miaPoints: 750,
      giftProfile: { canonicalKey: "rose", effectProgram: "flower_support" }
    },
    supporter: { cumulativeXp: 500, streakDays: 3, streakBonusPct: 10 }
  });

  assert.equal(ctx.streamTier, "T2");
  assert.equal(ctx.comboTier, "COMBO");
  assert.equal(ctx.giftLevel, 3);
  assert.equal(ctx.streakBonusPct, 10);
  assert.equal(ctx.power, 100);
  assert.ok(ctx.voiceReaction);
  assert.equal(ctx.bossEvent, null);
});

test("boss event activates at T4+", () => {
  const t4 = giftEconomy.buildResolvedGiftContext({
    support: { giftName: "Big", totalCoins: 5000, tier: "T4", obsTier: "T4", xp: 5000 }
  });
  assert.equal(t4.bossEvent, "boss_arrival");
  assert.equal(t4.bossBanner, "PŘIŠEL BOSS");
});

console.log("gift_economy_contract: OK");
