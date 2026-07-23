"use strict";

const assert = require("assert/strict");
const audit = require("../scripts/MIA_RUNTIME_AUDIT");
const hostTeam = require("../scripts/MIA_HOST_TEAM_POINTS");
const giftMap = require("../scripts/MIA_GIFT_MAP");
const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");
const { enrichNormalizedSupport } = require("../scripts/MIA_SUPPORT_RESOLVER");

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

console.log("\n---- SPRINT 5 CONTRACT ----\n");

test("runtime audit aggregates T0 engagement totals", () => {
  const snapshot = audit.buildRuntimeAuditSnapshot({
    giftEconomy: {
      count: 2,
      entries: [
        {
          userLabel: "Fan A",
          cumulativeXp: 10,
          giftLevel: 1,
          engagementCounts: { like: 5, follow: 1, share: 0, comment: 2 }
        },
        {
          userLabel: "Fan B",
          cumulativeXp: 3,
          giftLevel: 1,
          engagementCounts: { like: 2, follow: 0, share: 1, comment: 0 }
        }
      ]
    },
    lastGiftMapping: {
      giftName: "Mystery",
      canonicalKey: "coin_big",
      mappingSource: "coin_tier",
      mappingConfidence: 0.72,
      streamTier: "T3",
      totalCoins: 1000
    }
  });

  assert.equal(snapshot.supporterCount, 2);
  assert.equal(snapshot.engagementTotals.like, 7);
  assert.equal(snapshot.engagementTotals.follow, 1);
  assert.equal(snapshot.lastGiftMapping.mappingSource, "coin_tier");
});

test("host team split activates in host mode", () => {
  const split = hostTeam.resolveHostTeamSplit(1000, {
    hostModeActive: true,
    worldMode: "nejsem_tu"
  });

  assert.equal(split.active, true);
  assert.equal(split.teamPoints, 1000);
  assert.equal(split.localShare + split.hostShare, 1000);
  assert.ok(split.hostShare >= 400);
});

test("host team split stays local-only in live mode", () => {
  const split = hostTeam.resolveHostTeamSplit(500, {
    hostModeActive: false,
    worldMode: "default"
  });

  assert.equal(split.active, false);
  assert.equal(split.localShare, 500);
  assert.equal(split.hostShare, 0);
});

test("gift profile includes teamPoints and rewards schema", () => {
  const mapped = giftMap.resolveGiftMapping({
    giftName: "Rose",
    coins: 1,
    totalCoins: 1
  });

  assert.equal(mapped.profile.teamPoints, 1);
  assert.ok(Array.isArray(mapped.profile.rewards));
});

test("gift context carries mapping audit and rewards", () => {
  const normalized = enrichNormalizedSupport(
    {
      platform: "tiktok",
      support: {
        giftName: "Unknown Gift",
        coins: 1000,
        repeatCount: 1
      }
    },
    {}
  );

  const ctx = giftEconomy.buildResolvedGiftContext({
    support: normalized.support,
    giftProfile: normalized.support.giftProfile,
    supporter: { cumulativeXp: 1000, giftLevel: 3 }
  });

  assert.equal(ctx.mappingSource, "coin_tier");
  assert.ok(ctx.rewards.length >= 1);
  assert.equal(ctx.teamPoints, 1000);
});

test("host team score accumulates split shares", () => {
  let score = hostTeam.createHostTeamScoreState();
  score = hostTeam.applyHostTeamScore(score, {
    active: true,
    localShare: 500,
    hostShare: 500,
    splitPct: 50
  });

  assert.equal(score.localPoints, 500);
  assert.equal(score.hostPoints, 500);
  assert.equal(score.splitPct, 50);
});
