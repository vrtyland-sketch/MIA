"use strict";

const assert = require("assert/strict");
const { normalizeEvent } = require("../shared/platform_normalizers/normalize_event");
const shadowRuntime = require("../MIA_NEXT/engine_shadow_runtime");
const { createPlatformBridges } = require("../scripts/MIA_PLATFORM_BRIDGES");
const kickBridge = require("../scripts/MIA_KICK_BRIDGE");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

function buildKickRealtimePayload(overrides = {}) {
  return {
    source: "kick_realtime",
    provider: "kick",
    platform: "kick",
    type: "comment",
    eventType: "comment",
    rawType: "App\\Events\\ChatMessageEvent",
    content: "ahoj MIA jak se mas",
    message: "ahoj MIA jak se mas",
    username: "kickfan",
    nickname: "KickFan",
    userId: "12345",
    chatroomId: "95746130",
    user: {
      userId: "12345",
      username: "kickfan",
      nickname: "KickFan"
    },
    ...overrides
  };
}

async function run() {
  await test("Kick realtime payload normalizes to COMMENT on kick platform", () => {
    const normalized = normalizeEvent(buildKickRealtimePayload());
    assert.equal(normalized.eventType, "COMMENT");
    assert.equal(normalized.platform, "kick");
    assert.equal(normalized.route, "community");
    assert.equal(normalized.message, "ahoj MIA jak se mas");
  });

  await test("Kick COMMENT produces overlay text via shadow pipeline", () => {
    const normalized = normalizeEvent(
      buildKickRealtimePayload({ message: "MIA ahoj", content: "MIA ahoj" })
    );
    const result = shadowRuntime.runShadowPipeline({
      rawEvent: normalized,
      normalizedEvent: normalized,
      streamState: {},
      outputState: { rotationIndex: {} },
      kojnozoutState: { bowlPercent: 40, mood: "idle" },
      runtimeConfig: {},
      ecosystemState: null
    });

    assert.equal(result.ok, true);
    assert.ok(result.actionResult?.overlayPayload?.text);
    assert.match(result.actionResult.overlayPayload.text, /KickFan|MIA|ahoj/i);
  });

  await test("kickOnEvent forwards normalized kick comment to processEvent", async () => {
    let processed = null;
    const api = createPlatformBridges({
      app: { post() {} },
      runtimeConfig: { kick: { enabled: true } },
      writeLog: () => {},
      cloneJson: (v) => v,
      safeString: String,
      processEvent: async (event) => {
        processed = event;
        return {
          status: 200,
          body: {
            ok: true,
            overlayEmit: { emitted: true },
            actionResult: { overlayPayload: { text: "reply" } }
          }
        };
      },
      kickBridgeModule: {},
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      responseEngine: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({})
    });

    const payload = buildKickRealtimePayload();
    const result = await api.kickOnEvent(payload);

    assert.equal(processed.platform, "kick");
    assert.equal(processed.message, payload.message);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
  });

  await test("startKickBridge skips when kick.enabled=false", async () => {
    const logs = [];
    const api = createPlatformBridges({
      app: {},
      runtimeConfig: { kick: { enabled: false } },
      writeLog: (_prefix, payload) => logs.push(payload),
      cloneJson: (v) => v,
      safeString: String,
      processEvent: async () => ({}),
      kickBridgeModule: {
        start() {
          throw new Error("should not start when disabled");
        }
      },
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      responseEngine: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({})
    });

    const result = await api.startKickBridge();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "disabled");
    assert.ok(logs.some((entry) => entry.status === "disabled"));
  });

  await test("resolveKickChatroomId uses explicit chatroomId", async () => {
    const id = await kickBridge.resolveKickChatroomId({
      chatroomId: "111",
      channel: "vasaspinak"
    });
    assert.equal(id, "111");
  });

  console.log("kick_chat_reply_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
