"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createPlatformBridges } = require("../scripts/MIA_PLATFORM_BRIDGES");

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
  await test("createPlatformBridges exposes bridge API", () => {
    const api = createPlatformBridges({
      app: {},
      runtimeConfig: { kick: {}, twitch: { enabled: false }, telegram: {} },
      writeLog: () => {},
      cloneJson: (v) => v,
      safeString: String,
      processEvent: async () => ({ status: 200, body: { ok: true } }),
      kickBridgeModule: {},
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      responseEngine: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({})
    });

    for (const key of [
      "kickOnEvent",
      "startKickBridge",
      "twitchOnEvent",
      "startTwitchBridge",
      "telegramOnMessage",
      "startTelegramBridge",
      "bootstrapPlatformBridges"
    ]) {
      assert.equal(typeof api[key], "function", `missing ${key}`);
    }
  });

  await test("kickOnEvent forwards to processEvent and logs", async () => {
    const logs = [];
    let processed = null;

    const api = createPlatformBridges({
      app: {},
      runtimeConfig: { kick: {} },
      writeLog: (_prefix, payload) => logs.push(payload),
      cloneJson: (v) => v,
      safeString: String,
      processEvent: async (event) => {
        processed = event;
        return { status: 200, body: { ok: true, actionResult: {} } };
      },
      kickBridgeModule: {
        startKickBridge({ onEvent }) {
          this.captured = onEvent;
        },
        captured: null
      },
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      responseEngine: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({})
    });

    api.startKickBridge();
    const onEvent = api.kickOnEvent;
    const result = await onEvent({ eventType: "comment", message: "hi" });

    assert.equal(processed.message, "hi");
    assert.equal(result.status, 200);
    assert.ok(logs.some((entry) => entry.event?.message === "hi"));
  });

  await test("telegramOnMessage returns fallback when message empty", async () => {
    const api = createPlatformBridges({
      app: {},
      runtimeConfig: {},
      writeLog: () => {},
      cloneJson: (v) => v,
      safeString: String,
      processEvent: async () => ({}),
      kickBridgeModule: {},
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      responseEngine: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({})
    });

    const reply = await api.telegramOnMessage({ text: "" });
    assert.match(reply.text, /Napiš mi text/);
  });

  await test("index.js wires initPlatformBridgesRuntime and bootstrap", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initPlatformBridgesRuntime/);
    assert.match(indexSrc, /platformBridgesRuntime\(\)/);
    assert.match(indexSrc, /MIA_PLATFORM_BRIDGES_CTX/);
    assert.match(indexSrc, /MIA_PLATFORM_BRIDGES/);
    assert.match(indexSrc, /bootstrapPlatformBridges\(\)/);
    assert.doesNotMatch(indexSrc, /async function kickOnEvent\(/);
  });

  console.log("platform_bridges_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
