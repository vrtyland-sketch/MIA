"use strict";

const assert = require("assert/strict");
const path = require("path");
const streamerAccess = require(path.resolve(__dirname, "..", "scripts", "MIA_STREAMER_ACCESS"));
const responseEngine = require(path.resolve(__dirname, "..", "scripts", "MIA_RESPONSE_ENGINE"));
const chatBrain = require(path.resolve(__dirname, "..", "scripts", "MIA_CHAT_BRAIN"));
const { loadTextBank } = require(path.resolve(__dirname, "..", "scripts", "MIA_TEXT_BANK_LOADER"));

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

console.log("\n---- STORY REQUEST CONTRACT ----\n");

test("VasaSpinak resolves as streamer boss", () => {
  const access = streamerAccess.resolveStreamerAccess("VasaSpinak", {
    stream: { streamerUserLabels: "VasaSpinak,Spinak" }
  });
  assert.equal(access.isStreamerBoss, true);
  assert.equal(access.bypassLlmRateLimit, true);
});

test("regular viewer is not streamer boss", () => {
  const access = streamerAccess.resolveStreamerAccess("Katka", {
    stream: { streamerUserLabels: "VasaSpinak,Spinak" }
  });
  assert.equal(access.isStreamerBoss, false);
});

test("story intent uses no-gift seed for regular viewer", () => {
  const intent = chatBrain.resolveChatIntent("mia povez mi pohadku");
  assert.equal(intent.type, "story_request");

  const response = responseEngine.buildDirectChatResponse({}, {
    message: "mia povez mi pohadku",
    userLabel: "Katka",
    target: "mia"
  });

  assert.match(response.speech_text.toLowerCase(), /gift|deset|moment|hned/);
  assert.equal(response.overlayPayload?.meta?.storyNoGiftRequired, true);
});

test("story intent uses boss seed for VasaSpinak", () => {
  const response = responseEngine.buildDirectChatResponse({}, {
    message: "mia povez mi pohadku",
    userLabel: "VasaSpinak",
    target: "mia",
    runtimeConfig: {
      stream: { streamerUserLabels: "VasaSpinak,Spinak" }
    }
  });

  assert.equal(response.overlayPayload?.meta?.isStreamerBoss, true);
  assert.match(response.speech_text.toLowerCase(), /boss|plnit|gift|event/);
});

test("story fallback bank is loaded", () => {
  const bank = loadTextBank();
  assert.ok(Array.isArray(bank.TEXT_BANK.mia_story_fallback));
  assert.ok(bank.TEXT_BANK.mia_story_fallback.length >= 1);
});

test("story fallback delivers full tale when LLM path would fail", () => {
  const fallback = responseEngine.buildStoryFallbackResponse({}, "Katka");
  assert.ok(fallback.length > 120);
  assert.match(fallback.toLowerCase(), /katka|pohad|kojnoz|mia/);
});

console.log("\n---- STORY REQUEST CONTRACT SUMMARY ----\n");

if (process.exitCode) {
  process.exit(process.exitCode);
}
