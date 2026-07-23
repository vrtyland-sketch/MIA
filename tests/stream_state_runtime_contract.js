"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("createStreamStateRuntime owns session and ledger state", () => {
    const api = createStreamStateRuntime({
      streamSessionModule: {
        createStreamSession: () => ({ phase: "LIVE" }),
        markEnded: (session) => ({ ...session, phase: "ENDED" })
      },
      giftUserLedgerModule: {
        createGiftUserLedger: () => ({ entries: ["a"] })
      },
      giftSupporterProfileModule: {
        createGiftSupporterProfile: () => ({ supporters: { x: 1 } })
      },
      streamStateModule: {
        createStreamState: () => ({ audience: { viewerCount: 5 } })
      },
      mediaCatalogModule: {
        loadCatalog: () => ({}),
        buildObsSourceAudioMap: () => ({ T1: "audio" })
      },
      writeLog: () => {},
      serverStartedAt: 1000
    });

    assert.equal(api.getStreamSession().phase, "LIVE");
    assert.deepEqual(api.getGiftUserLedger(), { entries: ["a"] });
    assert.equal(api.getStreamState().audience.viewerCount, 5);
    api.setLastGiftMapping({ tier: "T1" });
    assert.deepEqual(api.getLastGiftMapping(), { tier: "T1" });
    assert.deepEqual(api.getObsSourceAudioMap(), { T1: "audio" });
    assert.equal(api.markStreamSessionEnded("test").phase, "ENDED");
  });

  await test("index.js uses initStreamStateRuntime and thin accessors", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function initStreamStateRuntime\(\)/);
    assert.match(indexSrc, /MIA_STREAM_STATE_RUNTIME/);
    assert.match(indexSrc, /MIA_STREAM_STATE_CTX/);
    assert.match(indexSrc, /function getStreamSession\(\)/);
    assert.doesNotMatch(indexSrc, /let giftUserLedger =/);
    assert.match(indexSrc, /function initMediaSingletonsRuntime\(\)/);
    assert.match(indexSrc, /initStreamStateRuntime\(\);/);
    assert.doesNotMatch(indexSrc, /let streamState =/);
    assert.doesNotMatch(indexSrc, /obsSourceAudioMapCache/);
  });

  console.log("stream_state_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
