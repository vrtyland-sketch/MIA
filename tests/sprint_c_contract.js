"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const giftTiers = require("../scripts/MIA_GIFT_TIERS");
const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");
const giftMap = require("../scripts/MIA_GIFT_MAP");
const supportResolver = require("../scripts/MIA_SUPPORT_RESOLVER");
const legacyShim = require("../legacy/MIA_SUPPORT_RESOLVER");

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

console.log("\n---- SPRINT C CONTRACT ----\n");

test("central tier module exposes canon coin thresholds", () => {
  assert.deepEqual(giftTiers.COIN_TIER_THRESHOLDS, {
    T1: 1,
    T2: 100,
    T3: 1000,
    T4: 5000,
    T5: 10000,
    T6: 25000
  });
  assert.equal(giftTiers.MIA_POINTS_PER_COIN, 7.5);
  assert.equal(giftTiers.resolveStreamTierFromCoins(1000), "T3");
});

test("economy and tiers stay in sync", () => {
  assert.deepEqual(giftEconomy.COIN_TIER_THRESHOLDS, giftTiers.COIN_TIER_THRESHOLDS);
  assert.equal(giftEconomy.resolveStreamTierFromCoins(25000), "T6");
});

test("gift map coin buckets use shared thresholds", () => {
  const label = "Zzqxwvk99";
  const small = giftMap.resolveGiftMapping({ giftName: label, totalCoins: 50, coins: 50 });
  const mid = giftMap.resolveGiftMapping({ giftName: label, totalCoins: 100, coins: 100 });
  const epic = giftMap.resolveGiftMapping({ giftName: label, totalCoins: 5000, coins: 5000 });

  assert.ok(["unknown", "keyword_fallback"].includes(small.mappingSource));
  assert.equal(mid.mappingSource, "coin_tier");
  assert.equal(mid.profile.coinsBucket, "mid");
  assert.equal(epic.profile.coinsBucket, "epic");
});

test("support resolver lives under scripts and enriches support", () => {
  const normalized = supportResolver.enrichNormalizedSupport(
    {
      platform: "tiktok",
      support: { giftName: "Rose", coins: 5, repeatCount: 1 }
    },
    {}
  );

  assert.equal(normalized.support.streamTier, "T1");
  assert.equal(normalized.support.totalCoins, 5);
  assert.equal(
    normalized.support.economy.sourceOfTruth,
    "MIA_SUPPORT_RESOLVER+shared/gifts"
  );
  assert.equal(normalized.support.giftKey, "ROSE");
  assert.equal(normalized.support.obsTier, "T1");
  assert.equal(normalized.support.economy.miaPointsPerUnit, 7.5);
});

test("legacy shim re-exports scripts resolver", () => {
  assert.equal(legacyShim.enrichNormalizedSupport, supportResolver.enrichNormalizedSupport);
  assert.equal(legacyShim.MIA_POINTS_PER_UNIT, 7.5);
});

test("dead ingest route archived with deprecation stub", () => {
  const archivePath = path.resolve(
    __dirname,
    "../archive/deprecated/code/src/routes/ingestroute.js"
  );
  const stubPath = path.resolve(__dirname, "../src/routes/ingestroute.js");

  assert.equal(fs.existsSync(archivePath), true);
  assert.equal(fs.existsSync(stubPath), true);

  const archived = require(archivePath);
  assert.equal(typeof archived.registerIngestRoute, "function");

  const stub = require(stubPath);
  assert.equal(stub.registerIngestRoute, archived.registerIngestRoute);
});

test("spam session exports engine with shared resolver path", () => {
  const spam = require("../MIA_NEXT/engine_spam_session");
  assert.equal(typeof spam.createSpamSessionEngine, "function");
  assert.equal(giftTiers.computeMiaPointsFromCoins(10), 75);
});
