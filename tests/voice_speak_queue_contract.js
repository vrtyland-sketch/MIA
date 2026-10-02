"use strict";

const assert = require("assert/strict");
const { createDeliveryRuntime } = require("../scripts/MIA_DELIVERY_RUNTIME");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createQueueHarness() {
  const logs = [];
  const spoken = [];
  const overlays = [];
  let holdMs = 2000;
  const api = createDeliveryRuntime({
    runtimeConfig: {
      phase2: { director: { enabled: false } },
      phase1: { actionQueue: { enabled: false } }
    },
    writeLog: (_channel, entry) => {
      logs.push(entry);
    },
    safeString: (value, fallback = "") => {
      const text = value == null ? "" : String(value);
      return text.trim() ? text.trim() : fallback;
    },
    cloneJson: (value, fallback) =>
      value == null ? fallback : JSON.parse(JSON.stringify(value)),
    setOverlay: (payload) => {
      overlays.push(payload);
      return { accepted: true };
    },
    getOverlayState: () => ({}),
    overlayStateModule: {},
    invalidateOverlayStateCache: () => {},
    getOutputState: () => ({}),
    getKojnozoutState: () => ({}),
    getObsConnected: () => false,
    getUserLabel: () => "Tomino",
    tryAutoBossMissionFromGift: async () => null,
    speakerRoutingModule: {},
    ttsEngine: {
      resolveConfig: () => ({ enabled: true }),
      speak: async ({ text }) => {
        spoken.push(text);
        return {
          ok: true,
          provider: "fake",
          voice: "test",
          durationMs: 20,
          audioUrl: "mem://voice"
        };
      }
    },
    languageModule: { resolveDefaultLanguage: () => "cs" },
    sessionMemoryModule: {},
    voiceHoldUntilTs: (now) => now + holdMs
  });

  async function say(text, actionResult = {}) {
    return api.maybeDeliverMiaVoice(
      {
        ok: true,
        route: actionResult.route || "support",
        ...actionResult,
        overlayPayload: {
          owner: "kojnozout",
          text,
          userLabel: actionResult.userLabel || "Tomino",
          ...(actionResult.overlayPayload || {})
        }
      },
      {
        shouldSpeak: true,
        text,
        voiceMode: "primary",
        voiceSpeaker: "kojnozout",
        primaryOwner: "kojnozout"
      }
    );
  }

  async function anchorPlayback() {
    const result = await say("anchor-speaking", { route: "system" });
    assert.equal(result.ok, true);
    assert.equal(api.getVoiceSpeakQueueLength(), 0);
    assert.equal(spoken.length, 1);
    assert.equal(spoken[0], "anchor-speaking");
    return result;
  }

  async function release() {
    holdMs = 0;
    api.setVoicePlaybackState(null);
    const started = Date.now();
    while (api.getVoiceSpeakQueueLength() > 0) {
      if (Date.now() - started > 8000) {
        throw new Error(`queue did not drain, length=${api.getVoiceSpeakQueueLength()}`);
      }
      await sleep(40);
    }
    await sleep(80);
  }

  return { api, logs, spoken, overlays, say, anchorPlayback, release };
}

function droppedTexts(logs) {
  return logs
    .filter((entry) => entry && entry.stage === "voice_speak_dropped")
    .map((entry) => entry.textPreview);
}

async function run() {
  const previousActionQueue = process.env.MIA_ACTION_QUEUE;
  process.env.MIA_ACTION_QUEUE = "0";

  try {
    await test("seventh queued voice line drops the oldest and keeps six", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      const returned = [];
      for (let i = 1; i <= 7; i += 1) {
        returned.push(await harness.say(`gift-${i}`, {
          route: "support",
          userLabel: "Tomino",
          meta: { eventId: `evt-${i}`, userId: "tomino" }
        }));
      }

      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.equal(harness.api.getVoicePlaybackSnapshot().queueLength, 6);
      assert.deepEqual(droppedTexts(harness.logs), ["gift-1"]);
      assert.equal(returned[6].ok, true);
      assert.equal(returned[6].route, "support");
      await sleep(200);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      harness.api.setVoicePlaybackState(null);
      const head = harness.api.getVoicePlaybackSnapshot();
      assert.equal(head.textPreview, "gift-2");
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("gift-")),
        ["gift-2", "gift-3", "gift-4", "gift-5", "gift-6", "gift-7"]
      );
      assert.deepEqual(
        harness.overlays.map((row) => row.text).filter((text) => String(text).startsWith("gift-")),
        ["gift-2", "gift-3", "gift-4", "gift-5", "gift-6", "gift-7"]
      );
      assert.equal(harness.overlays.some((row) => row.text === "gift-1"), false);
    });

    await test("twenty rapid voice lines keep only the newest six", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 1; i <= 20; i += 1) {
        const result = await harness.say(`burst20-${i}`);
        assert.equal(result.ok, true);
      }
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.equal(droppedTexts(harness.logs).length, 14);
      assert.equal(droppedTexts(harness.logs)[0], "burst20-1");
      assert.equal(droppedTexts(harness.logs)[13], "burst20-14");
      harness.api.setVoicePlaybackState(null);
      assert.equal(harness.api.getVoicePlaybackSnapshot().textPreview, "burst20-15");
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("burst20-")),
        ["burst20-15", "burst20-16", "burst20-17", "burst20-18", "burst20-19", "burst20-20"]
      );
    });

    await test("one hundred rapid voice lines still keep only the newest six", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 1; i <= 100; i += 1) {
        await harness.say(`burst100-${i}`);
      }
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.equal(droppedTexts(harness.logs).length, 94);
      assert.equal(droppedTexts(harness.logs)[0], "burst100-1");
      assert.equal(droppedTexts(harness.logs)[93], "burst100-94");
      harness.api.setVoicePlaybackState(null);
      assert.equal(harness.api.getVoicePlaybackSnapshot().textPreview, "burst100-95");
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("burst100-")),
        ["burst100-95", "burst100-96", "burst100-97", "burst100-98", "burst100-99", "burst100-100"]
      );
    });

    await test("duplicate lines consume queue slots and are not coalesced", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 0; i < 7; i += 1) {
        await harness.say("Tomino, díky za Rose.", {
          route: "support",
          userLabel: "Tomino",
          meta: { eventId: `dup-${i}` }
        });
      }
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.equal(droppedTexts(harness.logs).length, 1);
      await harness.release();
      const roses = harness.spoken.filter((text) => text === "Tomino, díky za Rose.");
      assert.deepEqual(roses, ["Tomino, díky za Rose."]);
      assert.ok(harness.logs.some((entry) => entry.stage === "tts_speak_deduped"));
    });

    console.log("");
    console.log("---- VOICE SPEAK QUEUE CONTRACT ----");
    console.log("passed");
  } finally {
    if (previousActionQueue === undefined) delete process.env.MIA_ACTION_QUEUE;
    else process.env.MIA_ACTION_QUEUE = previousActionQueue;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
