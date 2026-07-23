"use strict";

const assert = require("assert/strict");
const path = require("path");
const sessionMemory = require("../scripts/MIA_SESSION_MEMORY");
const responseEngine = require("../scripts/MIA_RESPONSE_ENGINE");
const { createOutputState } = require("../scripts/MIA_OUTPUT_STATE");

const TMP_STORE = path.join(__dirname, ".tmp-session-memory-response-test.json");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- SESSION MEMORY RESPONSE CONTRACT ----\n");

test("first visit greeting does not get returning ack", () => {
  sessionMemory.loadStore(TMP_STORE);
  sessionMemory.observeChatMessage({
    userLabel: "Katka",
    message: "mia ahoj",
    intentType: "greeting"
  });

  const outputState = createOutputState();
  const result = responseEngine.buildDirectChatResponse(outputState, {
    target: "mia",
    userLabel: "Katka",
    message: "mia ahoj"
  });

  const text = result.speech_text || "";
  assert.equal(sessionMemory.getUserSessionHints("Katka").isReturning, false);
  assert.doesNotMatch(text.toLowerCase(), /zase vidím|zpátky|znovu/);
  assert.notEqual(result.overlayPayload?.meta?.returning_viewer, true);
});

test("returning viewer greeting weaves ack from text bank", () => {
  sessionMemory.loadStore(TMP_STORE);
  sessionMemory.observeChatMessage({
    userLabel: "Katka",
    message: "mia ahoj",
    intentType: "greeting"
  });
  sessionMemory.observeChatMessage({
    userLabel: "Katka",
    message: "mia ahoj znovu",
    intentType: "greeting"
  });

  const hints = sessionMemory.getUserSessionHints("Katka");
  assert.equal(hints.isReturning, true);

  const outputState = createOutputState();
  const result = responseEngine.buildDirectChatResponse(outputState, {
    target: "mia",
    userLabel: "Katka",
    message: "mia ahoj"
  });

  const text = result.speech_text || "";
  assert.match(text.toLowerCase(), /katka/);
  assert.match(text.toLowerCase(), /zase|zpátky|znovu/);
});

test("returning ack is skipped for grief intents", () => {
  sessionMemory.loadStore(TMP_STORE);
  sessionMemory.observeChatMessage({
    userLabel: "Tom",
    message: "ahoj",
    intentType: "greeting"
  });
  sessionMemory.observeChatMessage({
    userLabel: "Tom",
    message: "mia mam smutek",
    intentType: "sadness_report"
  });

  const result = responseEngine.buildDirectChatResponse(createOutputState(), {
    target: "mia",
    userLabel: "Tom",
    message: "mia mam smutek, můj pes umřel"
  });

  const text = result.speech_text || "";
  assert.doesNotMatch(text.toLowerCase(), /zase vidím|zpátky v chatu/);
});

test("returning viewer status question gets session ack", () => {
  sessionMemory.loadStore(TMP_STORE);
  sessionMemory.observeChatMessage({
    userLabel: "Jana",
    message: "cau",
    intentType: "greeting"
  });
  sessionMemory.observeChatMessage({
    userLabel: "Jana",
    message: "mia jak se mas",
    intentType: "direct_status_question"
  });

  const result = responseEngine.buildDirectChatResponse(createOutputState(), {
    target: "mia",
    userLabel: "Jana",
    message: "mio jak se mas?"
  });

  const text = result.speech_text || "";
  assert.match(text.toLowerCase(), /jana/);
  assert.match(text.toLowerCase(), /zase|zpátky|znovu/);
});

test("bot reply memory stores and recalls last Koj line for user", () => {
  sessionMemory.loadStore(TMP_STORE);
  sessionMemory.observeBotReply({
    speaker: "kojnozout",
    userLabel: "Jana",
    text: "Jana, vidim te v chatu.",
    source: "voice"
  });

  const recalled = sessionMemory.getLastBotReplyToUser("Jana", "kojnozout");
  assert.equal(recalled?.speaker, "kojnozout");
  assert.match(recalled?.text.toLowerCase(), /vidim te/);
});

console.log("\n---- SESSION MEMORY RESPONSE CONTRACT SUMMARY ----\n");

if (process.exitCode) {
  process.exit(process.exitCode);
}
