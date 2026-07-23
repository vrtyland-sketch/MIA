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
