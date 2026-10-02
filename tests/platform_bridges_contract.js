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
      "youtubeOnEvent",
      "startYouTubeBridge",
      "telegramOnMessage",
      "startTelegramBridge",
      "bootstrapPlatformBridges"
    ]) {
      assert.equal(typeof api[key], "function", `missing ${key}`);
    }
  });

  await test("startKickBridge uses unified /ingest HTTP (no direct onEvent)", async () => {
    let startOpts = null;

    const api = createPlatformBridges({
      app: {},
      runtimeConfig: {
        kick: { enabled: true, ingestUrl: "http://127.0.0.1:3000/ingest" }
      },
      writeLog: () => {},
      cloneJson: (v) => v,
      safeString: (v, fb) => (v ? String(v) : fb || ""),
      processEvent: async () => ({ status: 200, body: { ok: true } }),
      kickBridgeModule: {
        async start(opts) {
          startOpts = opts;
          return { ok: true, reason: "started_by_test" };
        }
      },
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      responseEngine: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({})
    });

    await api.startKickBridge();
    assert.equal(startOpts.onEvent, null);
    assert.equal(startOpts.config.ingestUrl, "http://127.0.0.1:3000/ingest");
  });

  await test("kickOnEvent forwards to processEvent and logs", async () => {
    const logs = [];
    let processed = null;

    const api = createPlatformBridges({
      app: {},
      runtimeConfig: { kick: { enabled: true } },
      writeLog: (_prefix, payload) => logs.push(payload),
      cloneJson: (v) => v,
      safeString: String,
      processEvent: async (event) => {
        processed = event;
        return { status: 200, body: { ok: true, actionResult: {} } };
      },
      kickBridgeModule: {
        async start({ onEvent }) {
          this.captured = onEvent;
          return { ok: true, reason: "started_by_test" };
        },
        captured: null
      },
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      responseEngine: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({})
    });

    await api.startKickBridge();
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

  await test("disabled YouTube start delegates to the single bridge module", () => {
    let seen = null;
    const api = createPlatformBridges({
      app: {},
      runtimeConfig: { youtube: { enabled: false, apiKey: "yt-test-key" } },
      writeLog: () => {},
      cloneJson: (v) => v,
      safeString: (v, fb) => (typeof v === "string" && v.trim() ? v.trim() : fb || ""),
      processEvent: async () => ({ status: 200, body: { ok: true } }),
      kickBridgeModule: {},
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      youtubeBridgeModule: {
        start(opts) {
          seen = opts;
          return { ok: false, reason: "disabled" };
        }
      },
      responseEngine: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({})
    });

    const result = api.startYouTubeBridge();
    assert.equal(result.reason, "disabled");
    assert.equal(seen.config.enabled, false);
    assert.equal(api.youtubeBridge, undefined);
    assert.equal(api.getYouTubePollSnapshot, undefined);
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
