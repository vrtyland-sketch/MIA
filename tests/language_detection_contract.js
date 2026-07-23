"use strict";

const assert = require("assert");
const languageModule = require("../scripts/MIA_LANGUAGE");
const normalizer = require("../shared/platform_normalizers/normalize_event");
const ttsEngine = require("../scripts/MIA_TTS_ENGINE");

function test(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("detects Czech", () => {
  const r = languageModule.detectLanguage("Ahoj, jak se máš? Děkuji moc!");
  assert.equal(r.code, "cs");
});

test("detects English", () => {
  const r = languageModule.detectLanguage("Hello, how are you? Thanks for the stream!");
  assert.equal(r.code, "en");
});

test("detects German", () => {
  const r = languageModule.detectLanguage("Hallo, warum ist das so gut? Danke!");
  assert.equal(r.code, "de");
});

test("detects Spanish", () => {
  const r = languageModule.detectLanguage("Hola, cómo estás? Gracias por el stream!");
  assert.equal(r.code, "es");
});

test("detects French", () => {
  const r = languageModule.detectLanguage("Bonjour, merci beaucoup, comment ça va?");
  assert.equal(r.code, "fr");
});

test("detects Russian via script", () => {
  const r = languageModule.detectLanguage("Привет, как дела?");
  assert.equal(r.code, "ru");
});

test("detects Japanese via script", () => {
  const r = languageModule.detectLanguage("こんにちは、元気ですか？");
  assert.equal(r.code, "ja");
});

test("detects Arabic via script", () => {
  const r = languageModule.detectLanguage("مرحبا كيف حالك");
  assert.equal(r.code, "ar");
});

test("normalizer attaches language on COMMENT", () => {
  const event = normalizer.normalizeEvent({
    eventType: "COMMENT",
    message: "Hello, what is this stream about?",
    user: { userId: "u1", nickname: "Tester" },
    platform: "tiktok"
  });
  assert.equal(event.language, "en");
  assert.ok(event.languageName);
});

test("LLM language instruction switches for English", () => {
  const instruction = languageModule.buildLlmLanguageInstruction("en");
  assert.match(instruction, /English|\(en\)/i);
  assert.doesNotMatch(instruction, /^česky/);
});

test("LLM language instruction for Czech stays Czech", () => {
  const instruction = languageModule.buildLlmLanguageInstruction("cs");
  assert.match(instruction, /česky/i);
});

test("Edge voice maps per language and speaker", () => {
  assert.equal(languageModule.resolveEdgeVoice("cs", "mia"), "cs-CZ-VlastaNeural");
  assert.equal(languageModule.resolveEdgeVoice("cs", "kojnozout"), "cs-CZ-AntoninNeural");
  assert.equal(languageModule.resolveEdgeVoice("en", "mia"), "en-US-JennyNeural");
  assert.equal(languageModule.resolveEdgeVoice("de", "mia"), "de-DE-KatjaNeural");
  assert.equal(languageModule.resolveEdgeVoice("es", "kojnozout"), "es-MX-JorgeNeural");
});

(async () => {
  try {
    const engine = ttsEngine.createTtsEngine({});
    const result = await engine.speak({
      text: "",
      speaker: "mia",
      language: "en",
      runtimeConfig: { tts: { enabled: true } }
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "empty_text");
    console.log("OK  TTS speak accepts language option without throwing");
  } catch (err) {
    console.error("FAIL TTS speak accepts language option without throwing");
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }

  if (process.exitCode) process.exit(process.exitCode);
  console.log("language_detection_contract: all passed");
})();
