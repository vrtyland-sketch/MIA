"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createTranslationRuntime } = require("../scripts/MIA_TRANSLATION_RUNTIME");

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
  await test("createTranslationRuntime exposes interpreter API", () => {
    const api = createTranslationRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      ttsEngine: null,
      runtimeConfig: {},
      voiceHoldUntilTs: (now) => now + 3000,
      deliveryRuntime: () => ({}),
      translationRuntime: {},
      setOverlay: () => ({}),
      invalidateOverlayStateCache: () => {},
      translateModule: {},
      languageModule: {},
      getUserLabel: () => "Viewer"
    });

    for (const key of ["speakTranslatedLine", "deliverChatTranslation", "deliverMicTranslation"]) {
      assert.equal(typeof api[key], "function", `missing ${key}`);
    }
  });

  await test("speakTranslatedLine rejects empty text", async () => {
    const result = await createTranslationRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      ttsEngine: { speak: async () => ({ ok: true }) },
      runtimeConfig: {},
      voiceHoldUntilTs: (now) => now,
      deliveryRuntime: () => ({}),
      translationRuntime: {},
      setOverlay: () => ({}),
      invalidateOverlayStateCache: () => {},
      translateModule: {},
      languageModule: {},
      getUserLabel: () => "Viewer"
    }).speakTranslatedLine({ text: "" });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "empty");
  });

  await test("deliverChatTranslation skips same language", async () => {
    const result = await createTranslationRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      ttsEngine: null,
      runtimeConfig: {},
      voiceHoldUntilTs: (now) => now,
      deliveryRuntime: () => ({}),
      translationRuntime: {
        isInterpreterEnabled: () => true,
        noteForeignLanguage: () => {}
      },
      setOverlay: () => ({}),
      invalidateOverlayStateCache: () => {},
      translateModule: {
        translateText: async () => ({ ok: true, text: "hi" }),
        resolveStreamerLanguage: () => "cs",
        isSameLanguage: () => true
      },
      languageModule: { detectLanguage: () => ({ code: "cs" }) },
      getUserLabel: () => "Viewer"
    }).deliverChatTranslation({ message: "ahoj svete" });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "same_language");
  });

  await test("speakTranslatedLine queues chat translation and withholds the caption", async () => {
    let directSpeaks = 0;
    const captions = [];
    const overlays = [];
    let seen = null;
    const result = await createTranslationRuntime({
      writeLog: () => {},
      safeString: (v, d) => (typeof v === "string" && v.trim() ? v.trim() : d || ""),
      ttsEngine: {
        speak: async () => {
          directSpeaks += 1;
          return { ok: true, audioUrl: "/audio-cache/direct.mp3", durationMs: 1000 };
        }
      },
      runtimeConfig: {},
      voiceHoldUntilTs: (now) => now + 9000,
      deliveryRuntime: () => ({
        maybeDeliverMiaVoice: async (action, plan, options) => {
          seen = { action, plan, options };
          return {
            ok: true,
            voiceAdmission: { accepted: true, queued: true, started: false, voiceClass: "chat" }
          };
        }
      }),
      translationRuntime: {
        setLiveCaption: (row) => captions.push(row)
      },
      setOverlay: (row) => overlays.push(row),
      invalidateOverlayStateCache: () => {},
      translateModule: {},
      languageModule: {},
      getUserLabel: () => "Viewer"
    }).speakTranslatedLine({
      text: "hello from chat",
      language: "cs",
      source: "chat_translation_public",
      eventId: "comment-42",
      title: "MIA · Chat",
      subtext: "hello",
      original: "hello",
      channel: "chat"
    });

    assert.equal(directSpeaks, 0);
    assert.equal(captions.length, 0);
    assert.equal(overlays.length, 0);
    assert.equal(result.ok, true);
    assert.equal(result.queued, true);
    assert.equal(result.started, false);
    assert.equal(result.audioUrl, undefined);
    assert.equal(result.durationMs, undefined);
    assert.equal(seen.action.route, "community");
    assert.equal(seen.action.eventType, "COMMENT");
    assert.equal(seen.action.eventId, "comment-42");
    assert.equal(seen.action.meta.source, "chat_translation_public");
    assert.equal(seen.action.meta.language, "cs");
    assert.equal(seen.plan.recordReply, false);
    assert.equal(seen.plan.text, "hello from chat");
    assert.equal(seen.plan.voiceSpeaker, "mia");
    assert.equal(seen.options.bypassActionQueue, true);
    assert.equal(seen.action.bypassActionQueue, undefined);
    assert.equal(seen.plan.bypassActionQueue, undefined);
    assert.equal(typeof seen.options.onPlaybackStarted, "function");
    seen.options.onPlaybackStarted({
      playbackId: 7,
      holdUntilTs: Date.now() + 4200,
      audioUrl: "/audio-cache/queued.mp3"
    });
    assert.equal(captions.length, 1);
    assert.equal(captions[0].translation, true);
    assert.equal(captions[0].publicCaption, true);
    assert.equal(captions[0].source, "chat_translation_public");
    assert.equal(captions[0].language, "cs");
    assert.equal(captions[0].translated, "hello from chat");
    assert.equal(captions[0].original, "hello");
    assert.equal(captions[0].channel, "chat");
    assert.ok(captions[0].holdMs > 0);
    assert.ok(captions[0].holdMs <= 4200);
    assert.equal(overlays[0].text, "hello from chat");
    assert.equal(overlays[0].meta.translation, true);
  });

  await test("speakTranslatedLine does not call TTS or playback setters directly", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts/MIA_TRANSLATION_RUNTIME.js"), "utf8");
    const start = src.indexOf("async function speakTranslatedLine");
    const end = src.indexOf("async function deliverChatTranslation");
    assert.ok(start > 0 && end > start);
    const body = src.slice(start, end);
    assert.doesNotMatch(body, /ttsEngine\.speak/);
    assert.doesNotMatch(body, /setVoicePlaybackState/);
    assert.doesNotMatch(body, /bumpVoicePlaybackSeq/);
    assert.match(body, /maybeDeliverMiaVoice/);
    assert.match(body, /recordReply:\s*false/);
    assert.match(body, /bypassActionQueue:\s*true/);
  });

  await test("index.js wires translationDeliveryRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initTranslationDeliveryRuntime/);
    assert.match(indexSrc, /MIA_TRANSLATION_RUNTIME/);
    assert.match(indexSrc, /MIA_TRANSLATION_CTX/);
    assert.doesNotMatch(indexSrc, /stage: "chat_translation_public"/);
  });

  console.log("translation_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
