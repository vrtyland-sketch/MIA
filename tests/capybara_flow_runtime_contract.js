"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createCapybaraFlowRuntime } = require("../scripts/MIA_CAPYBARA_FLOW_RUNTIME");

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
  await test("createCapybaraFlowRuntime exposes capybara API", () => {
    const api = createCapybaraFlowRuntime({
      capybaraFlowModule: {},
      getOutputState: () => ({}),
      responseEngine: {},
      runtimeConfig: {},
      getKojnozoutState: () => ({}),
      ecosystemState: {},
      deliverActionVoice: async () => ({}),
      executeOverlay: async () => ({}),
      writeLog: () => {},
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Viewer",
      maybeDeliverMiaVoice: async () => ({})
    });
    assert.equal(typeof api.deliverCapybaraWaitPrompt, "function");
    assert.equal(typeof api.tryHandleCapybaraWaitingComment, "function");
  });

  await test("tryHandleCapybaraWaitingComment returns handled false when module missing", async () => {
    const result = await createCapybaraFlowRuntime({
      capybaraFlowModule: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({}),
      ecosystemState: {},
      deliverActionVoice: async () => ({}),
      executeOverlay: async () => ({}),
      writeLog: () => {},
      getUserLabel: () => "Viewer"
    }).tryHandleCapybaraWaitingComment({ message: "ahoj" });

    assert.deepEqual(result, { handled: false });
  });

  await test("deliverCapybaraWaitPrompt skips empty text", async () => {
    let overlayCalled = false;
    await createCapybaraFlowRuntime({
      executeOverlay: async () => {
        overlayCalled = true;
      },
      maybeDeliverMiaVoice: async () => ({}),
      safeString: (v) => String(v ?? "")
    }).deliverCapybaraWaitPrompt({});

    assert.equal(overlayCalled, false);
  });

  await test("deliverCapybaraWaitPrompt is voice-first (no duplicate bubble)", async () => {
    let overlayCalled = false;
    let voiceCalled = false;
    await createCapybaraFlowRuntime({
      executeOverlay: async () => {
        overlayCalled = true;
      },
      maybeDeliverMiaVoice: async () => {
        voiceCalled = true;
        return {
          meta: { overlaySuppressed: true },
          voicePlayback: { audioUrl: "/audio-cache/x.mp3" }
        };
      },
      safeString: (v) => String(v ?? "")
    }).deliverCapybaraWaitPrompt({ text: "Ahoj", priority: 2 });

    assert.equal(voiceCalled, true);
    assert.equal(overlayCalled, false);
  });

  await test("capybara comment reply does not re-emit suppressed overlay", async () => {
    let overlayCalls = 0;
    const api = createCapybaraFlowRuntime({
      capybaraFlowModule: {
        handleWaitingComment: async () => ({
          handled: true,
          actionResult: {
            overlayPayload: { owner: "mia", text: "Díky" },
            speech_text: "Díky"
          }
        })
      },
      getOutputState: () => ({}),
      getKojnozoutState: () => ({}),
      ecosystemState: {},
      deliverActionVoice: async (ar) => ({
        ...ar,
        overlayPayload: null,
        meta: { ...(ar.meta || {}), overlaySuppressed: true }
      }),
      executeOverlay: async () => {
        overlayCalls += 1;
      },
      writeLog: () => {},
      getUserLabel: () => "Viewer"
    });

    await api.tryHandleCapybaraWaitingComment({ message: "ahoj" });
    assert.equal(overlayCalls, 0);
  });

  await test("capybara comment reply voices once via deliverActionVoice only", async () => {
    let voiceCalls = 0;
    let miaVoiceCalls = 0;
    const api = createCapybaraFlowRuntime({
      capybaraFlowModule: {
        handleWaitingComment: async () => ({
          handled: true,
          actionResult: {
            overlayPayload: { owner: "mia", text: "Díky za komentář." },
            speech_text: "Díky za komentář."
          }
        })
      },
      getOutputState: () => ({}),
      getKojnozoutState: () => ({}),
      ecosystemState: {},
      deliverActionVoice: async (ar) => {
        voiceCalls += 1;
        return {
          ...ar,
          overlayPayload: null,
          voicePlayback: {
            audioUrl: "/audio-cache/x.mp3",
            audioSink: "mia_voice",
            exclusiveAudio: true,
            speaker: "mia"
          },
          meta: { ...(ar.meta || {}), overlaySuppressed: true }
        };
      },
      maybeDeliverMiaVoice: async () => {
        miaVoiceCalls += 1;
        return {};
      },
      executeOverlay: async () => {},
      writeLog: () => {},
      getUserLabel: () => "Viewer"
    });

    await api.tryHandleCapybaraWaitingComment({ message: "ahoj" });
    assert.equal(voiceCalls, 1);
    assert.equal(miaVoiceCalls, 0);
  });

  await test("index.js wires capybaraFlowRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initCapybaraFlowRuntime/);
    assert.match(indexSrc, /MIA_CAPYBARA_FLOW_RUNTIME/);
    assert.match(indexSrc, /MIA_CAPYBARA_FLOW_CTX/);
    assert.doesNotMatch(indexSrc, /stage: "capybara_comment_reply"/);
  });

  console.log("capybara_flow_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
