"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createGiftRuntime } = require("../scripts/MIA_GIFT_RUNTIME");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  await test("createGiftRuntime exposes gift economy API", () => {
    const api = createGiftRuntime({
      runtimeConfig: {},
      writeLog: () => {},
      giftSupporterProfileModule: {},
      giftEconomyModule: {},
      awayModeModule: {},
      hostTeamPointsModule: {},
      giftMapEnterprise: {},
      giftPresentationModule: {},
      getGiftSupporterProfile: () => ({}),
      setGiftSupporterProfile: () => {},
      getLastGiftMapping: () => null,
      setLastGiftMapping: () => {},
      getHostTeamScoreState: () => ({}),
      setHostTeamScoreState: () => {},
      getOutputState: () => ({}),
      getEcosystemState: () => ({})
    });

    for (const key of [
      "enrichGiftEconomyContext",
      "recordGiftMapRuntime",
      "prepareGiftEconomyPresentation",
      "applyGiftEconomyPresentationLegacy"
    ]) {
      assert.equal(typeof api[key], "function", `missing ${key}`);
    }
  });

  await test("enrichGiftEconomyContext records supporter XP", () => {
    let profile = { users: {} };
    const normalized = {
      support: {
        giftName: "Rose",
        coins: 5,
        repeatCount: 1
      }
    };

    createGiftRuntime({
      runtimeConfig: {},
      writeLog: () => {},
      giftSupporterProfileModule: {
        recordGiftSupport(state, event, support) {
          return {
            state: { ...state, last: support.giftName },
            supporter: { cumulativeXp: 10, giftLevel: 1, giftLevelLabel: "Bronze" },
            xpBase: 5,
            xpAward: 7,
            streakBonusPct: 0
          };
        }
      },
      giftEconomyModule: {
        buildResolvedGiftContext() {
          return { streamTier: "T1", teamPoints: 1 };
        }
      },
      awayModeModule: {},
      hostTeamPointsModule: {},
      giftMapEnterprise: {},
      giftPresentationModule: {},
      getGiftSupporterProfile: () => profile,
      setGiftSupporterProfile: (next) => {
        profile = next;
      },
      getLastGiftMapping: () => null,
      setLastGiftMapping: () => {},
      getHostTeamScoreState: () => ({}),
      setHostTeamScoreState: () => {},
      getOutputState: () => ({}),
      getEcosystemState: () => ({})
    }).enrichGiftEconomyContext(normalized);

    assert.equal(normalized.support.xp, 7);
    assert.equal(profile.last, "Rose");
    assert.equal(normalized.support.giftContext.streamTier, "T1");
  });

  await test("prepareGiftEconomyPresentation falls back to legacy patch", () => {
    const normalized = {
      support: {
        giftContext: { streamTier: "T2", obsTier: "T2", giftLevel: 2, giftLevelLabel: "Silver" }
      }
    };
    const result = createGiftRuntime({
      runtimeConfig: {},
      writeLog: () => {},
      giftSupporterProfileModule: {},
      giftEconomyModule: {},
      awayModeModule: {},
      hostTeamPointsModule: {},
      giftMapEnterprise: {},
      giftPresentationModule: {},
      getGiftSupporterProfile: () => ({}),
      setGiftSupporterProfile: () => {},
      getLastGiftMapping: () => null,
      setLastGiftMapping: () => {},
      getHostTeamScoreState: () => ({}),
      setHostTeamScoreState: () => {},
      getOutputState: () => ({}),
      getEcosystemState: () => ({})
    }).prepareGiftEconomyPresentation(normalized, { meta: {} });

    assert.equal(result.actionResult.tier, "T2");
    assert.equal(result.actionResult.meta.giftLevel, 2);
  });

  await test("index.js wires giftRuntime without inline enrichGiftEconomyContext", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initGiftRuntime/);
    assert.match(indexSrc, /MIA_GIFT_RUNTIME/);
    assert.match(indexSrc, /MIA_GIFT_RUNTIME_CTX/);
    assert.match(indexSrc, /function enrichGiftEconomyContext/);
    assert.doesNotMatch(indexSrc, /giftSupporterProfileModule\.recordGiftSupport\(/);
  });

  console.log("gift_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
