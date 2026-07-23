"use strict";

const assert = require("assert/strict");
const t0 = require("../scripts/MIA_T0_ENGAGEMENT");
const supporterProfile = require("../scripts/MIA_GIFT_SUPPORTER_PROFILE");
const giftMap = require("../scripts/MIA_GIFT_MAP");
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

console.log("\n---- SPRINT 4 CONTRACT ----\n");

test("T0 XP awards follow canon ranges", () => {
  assert.equal(t0.resolveT0Xp("LIKE", {}), 1);
  assert.equal(t0.resolveT0Xp("FOLLOW", {}), 3);
  assert.equal(t0.resolveT0Xp("SHARE", {}), 2);
  assert.equal(t0.resolveT0Xp("COMMENT", { message: "ahoj" }), 1);
  assert.equal(t0.resolveT0Xp("COMMENT", { message: "dneska je super stream, diky!" }), 2);
});

test("community engagement records cumulative XP without gift streak side effects", () => {
  const state = supporterProfile.createGiftSupporterProfile();
  const normalized = {
    user: { userId: "u1", nickname: "Fan" }
  };

  const first = supporterProfile.recordCommunityEngagement(state, normalized, {
    eventType: "LIKE",
    xpAward: 1
  });
  const second = supporterProfile.recordCommunityEngagement(first.state, normalized, {
    eventType: "FOLLOW",
    xpAward: 3
  });

  assert.equal(first.supporter.cumulativeXp, 1);
  assert.equal(second.supporter.cumulativeXp, 4);
  assert.equal(second.supporter.engagementCounts.like, 1);
  assert.equal(second.supporter.engagementCounts.follow, 1);
  assert.equal(second.supporter.giftCount, 0);
});

test("follow overlay ack is built, comment stays silent", () => {
  t0.resetT0AckCooldowns();
  process.env.MIA_T0_OVERLAY = "on";

  const followPlan = t0.buildT0OverlayPlan(
    "FOLLOW",
    { user: { nickname: "RoseFan" } },
    { engagementCounts: { follow: 1 } }
  );
  assert.match(followPlan.text, /RoseFan/);
  assert.equal(t0.buildT0OverlayPlan("COMMENT", { message: "hi" }, {}), null);
});

test("unknown gift with 1000 coins auto-maps to coin tier profile", () => {
  const mapped = giftMap.resolveGiftMapping({
    platform: "tiktok",
    giftName: "Mystery Gift XYZ",
    coins: 1000,
    totalCoins: 1000
  });

  assert.equal(mapped.mappingSource, "coin_tier");
  assert.equal(mapped.canonicalKey, "coin_big");
  assert.equal(mapped.profile.effectProgram, "cinematic_support");
});

test("known gift keeps catalog mapping source", () => {
  const mapped = giftMap.resolveGiftMapping({
    platform: "tiktok",
    giftName: "Rose",
    coins: 1,
    totalCoins: 1
  });

  assert.equal(mapped.canonicalKey, "rose");
  assert.equal(mapped.mappingSource, "exact_name");
});

test("resolver exposes gift mapping audit fields", () => {
  const normalized = enrichNormalizedSupport(
    {
      platform: "tiktok",
      support: {
        giftName: "Unknown TikTok Gift",
        coins: 5000,
        repeatCount: 1
      }
    },
    {}
  );

  assert.equal(normalized.support.giftProfile.canonicalKey, "coin_epic");
  assert.equal(normalized.support.giftMappingSource, "coin_tier");
  assert.ok(normalized.support.giftMappingConfidence >= 0.7);
});
