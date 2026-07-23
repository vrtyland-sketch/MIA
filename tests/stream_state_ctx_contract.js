"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildStreamStateCtx } = require("../scripts/MIA_STREAM_STATE_CTX");
const { createStreamStateRuntime } = require("../scripts/MIA_STREAM_STATE_RUNTIME");

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
  await test("buildStreamStateCtx flattens grouped host", () => {
    const ctx = buildStreamStateCtx({
      modules: {
        streamSessionModule: {},
        giftUserLedgerModule: {},
        giftSupporterProfileModule: {},
        streamStateModule: {},
        mediaCatalogModule: {}
      },
      core: { writeLog: () => {}, serverStartedAt: 1000 }
    });
    assert.equal(ctx.serverStartedAt, 1000);
    assert.equal(ctx.streamSessionModule, ctx.streamSessionModule);
  });

  await test("createStreamStateRuntime accepts buildStreamStateCtx shape", () => {
    const api = createStreamStateRuntime(
      buildStreamStateCtx({
        modules: {
          streamSessionModule: { createStreamSession: () => ({ phase: "LIVE" }) },
          giftUserLedgerModule: { createGiftUserLedger: () => ({ entries: [] }) },
          giftSupporterProfileModule: { createGiftSupporterProfile: () => ({ supporters: {} }) },
          streamStateModule: { createStreamState: () => ({}) },
          mediaCatalogModule: {}
        },
        core: { writeLog: () => {}, serverStartedAt: 1000 }
      })
    );
    assert.equal(api.getStreamSession().phase, "LIVE");
  });

  await test("index.js uses collectStreamStateHost and buildStreamStateCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectStreamStateHost\(\)/);
    assert.match(indexSrc, /MIA_STREAM_STATE_CTX/);
    assert.match(indexSrc, /MIA_STREAM_STATE_HOST/);
    assert.match(indexSrc, /buildHost\(collectStreamStateBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createStreamStateRuntime\(\{\s*streamSessionModule,/);
  });

  console.log("stream_state_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
