"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createRuntimeLoops } = require("../scripts/MIA_RUNTIME_LOOPS");

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
  await test("createRuntimeLoops starts six timers and can stop", () => {
    const api = createRuntimeLoops({
      runtimeConfig: { duel: { syncIntervalMs: 3000 }, eyes: {}, mattingIngest: {} },
      writeLog: () => {},
      bowlEngine: {},
      getKojnozoutState: () => ({}),
      setKojnozoutState: () => {},
      getStreamState: () => ({}),
      videoEngine: null,
      bowlFullVideoModule: {},
      getOutputState: () => ({}),
      executeOverlay: () => {},
      capybaraFlowModule: {},
      getEcosystemState: () => ({}),
      deliverCapybaraWaitPrompt: async () => {},
      proactiveHostModule: {},
      getOverlayState: () => ({}),
      serverStartedAt: Date.now(),
      syncSoloStreamObsScene: async () => {},
      deliverProactiveHostMoment: async () => {},
      runDuelPeerSync: async () => null,
      getObsConnected: () => false,
      getMiaEyes: () => null,
      getMattingIngestBridge: () => null
    });

    assert.equal(typeof api.stop, "function");
    assert.equal(api.timerCount(), 6);
    api.stop();
    assert.equal(api.timerCount(), 0);
  });

  await test("capybara loop delivers wait prompt when tick requests it", async () => {
    let delivered = false;
    const api = createRuntimeLoops({
      runtimeConfig: {},
      writeLog: () => {},
      bowlEngine: {},
      getKojnozoutState: () => ({}),
      setKojnozoutState: () => {},
      getStreamState: () => ({}),
      videoEngine: null,
      bowlFullVideoModule: {},
      getOutputState: () => ({}),
      executeOverlay: () => {},
      capybaraFlowModule: {
        tickCapybaraFlow: () => ({ action: "send_wait_prompt", session: { id: "s1" } }),
        buildWaitPromptPayload: () => ({ text: "wait" })
      },
      getEcosystemState: () => ({}),
      deliverCapybaraWaitPrompt: async () => {
        delivered = true;
      },
      proactiveHostModule: {},
      getOverlayState: () => ({}),
      serverStartedAt: Date.now(),
      syncSoloStreamObsScene: async () => {},
      deliverProactiveHostMoment: async () => {},
      runDuelPeerSync: async () => null,
      getObsConnected: () => false,
      getMiaEyes: () => null,
      getMattingIngestBridge: () => null
    });

    await new Promise((r) => setTimeout(r, 2100));
    api.stop();
    assert.equal(delivered, true);
  });

  await test("index.js wires initRuntimeLoopsRuntime after platform bridges", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initRuntimeLoopsRuntime\(\)/);
    assert.match(indexSrc, /runtimeLoopsRuntime\(\)/);
    assert.match(indexSrc, /MIA_RUNTIME_LOOPS/);
    assert.match(indexSrc, /MIA_RUNTIME_LOOPS_CTX/);
    assert.doesNotMatch(indexSrc, /setInterval\(\(\) => \{\s*try \{\s*if \(typeof bowlEngine/);
  });

  console.log("runtime_loops_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
