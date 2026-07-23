"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildGiftRuntimeCtx } = require("../scripts/MIA_GIFT_RUNTIME_CTX");
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
  await test("buildGiftRuntimeCtx flattens grouped host", () => {
    const getGiftSupporterProfile = () => ({});
    const ctx = buildGiftRuntimeCtx({
      core: { runtimeConfig: {}, writeLog: () => {} },
      modules: {
        giftSupporterProfileModule: {},
        giftEconomyModule: {},
        awayModeModule: {},
        hostTeamPointsModule: {},
        giftMapEnterprise: {},
        giftPresentationModule: {}
      },
      state: {
        getGiftSupporterProfile,
        setGiftSupporterProfile: () => {},
        getLastGiftMapping: () => null,
        setLastGiftMapping: () => {},
        getHostTeamScoreState: () => ({}),
        setHostTeamScoreState: () => {},
        getOutputState: () => ({}),
        getEcosystemState: () => ({})
      }
    });

    assert.equal(ctx.getGiftSupporterProfile, getGiftSupporterProfile);
  });

  await test("createGiftRuntime accepts buildGiftRuntimeCtx shape", () => {
    const api = createGiftRuntime(
      buildGiftRuntimeCtx({
        core: { runtimeConfig: {}, writeLog: () => {} },
        modules: {
          giftSupporterProfileModule: {},
          giftEconomyModule: {},
          awayModeModule: {},
          hostTeamPointsModule: {},
          giftMapEnterprise: {},
          giftPresentationModule: {}
        },
        state: {
          getGiftSupporterProfile: () => ({}),
          setGiftSupporterProfile: () => {},
          getLastGiftMapping: () => null,
          setLastGiftMapping: () => {},
          getHostTeamScoreState: () => ({}),
          setHostTeamScoreState: () => {},
          getOutputState: () => ({}),
          getEcosystemState: () => ({})
        }
      })
    );
    assert.equal(typeof api.enrichGiftEconomyContext, "function");
  });

  await test("index.js uses collectGiftRuntimeHost and buildGiftRuntimeCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectGiftRuntimeHost\(\)/);
    assert.match(indexSrc, /MIA_GIFT_RUNTIME_CTX/);
    assert.match(indexSrc, /MIA_GIFT_RUNTIME_HOST/);
    assert.match(indexSrc, /buildHost\(collectGiftRuntimeBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createGiftRuntime\(\{\s*runtimeConfig,/);
  });

  console.log("gift_runtime_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
