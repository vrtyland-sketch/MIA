"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const lexicon = require(path.resolve(__dirname, "..", "scripts", "MIA_CHAT_LEXICON.js"));
const responseEngine = require(path.resolve(__dirname, "..", "scripts", "MIA_RESPONSE_ENGINE.js"));
const chatBrain = require(path.resolve(__dirname, "..", "scripts", "MIA_CHAT_BRAIN.js"));

const results = { passed: 0, failed: 0 };
const tempStorePath = path.join(os.tmpdir(), `mia-lexicon-test-${Date.now()}.json`);

function test(name, fn) {
  try {
    fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

function normalize(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function setupTempLexicon() {
  lexicon.configureLexicon({ storePath: tempStorePath });
  lexicon.resetLexicon(tempStorePath);
}

console.log("\n---- CHAT LEXICON SMOKE ----\n");

test("lexicon learns repeated catchphrase from chat", () => {
  setupTempLexicon();

  const phrase = "jedeme full gas komunito";
  for (let i = 0; i < 4; i += 1) {
    lexicon.observeChatMessage({
      message: phrase,
      userLabel: i % 2 === 0 ? "Katka" : "VasaSpinak",
      platform: "kick"
    });
  }

  const snapshot = lexicon.getLexiconSnapshot();
  assert.ok(snapshot.topPhrase, "expected learned top phrase");
  assert.ok((snapshot.topPhrase.count || 0) >= 3, "expected repeated phrase count >= 3");
});

test("lexicon tracks spicy language and raises spice level", () => {
  setupTempLexicon();

  for (let i = 0; i < 5; i += 1) {
    lexicon.observeChatMessage({
      message: "do prdele dneska to jede",
      userLabel: "Katka",
      platform: "kick"
    });
  }

  const snapshot = lexicon.getLexiconSnapshot();
  assert.ok((snapshot.tone?.spiceLevel || 0) >= 18, "expected elevated spice level");
  assert.ok(snapshot.topSpicy, "expected top spicy sample");
});

test("community voice enriches direct status reply with learned phrase", () => {
  setupTempLexicon();

  const phrase = "jedeme full gas komunito";
  for (let i = 0; i < 6; i += 1) {
    lexicon.observeChatMessage({
      message: phrase,
      userLabel: "Katka",
      platform: "kick"
    });
  }

  const outputState = { rotationIndex: {} };
  let enriched = "";

  for (let i = 0; i < 12 && !enriched.includes("full gas"); i += 1) {
    const response = responseEngine.buildDirectChatResponse(outputState, {
      message: "mijo jak se mas",
      userLabel: "Katka",
      target: "mia",
      speaker: "mia"
    });

    enriched = response?.speech_text || "";
  }

  const normalizedSpeech = normalize(enriched);
  assert.ok(
    normalizedSpeech.includes("full gas") || normalizedSpeech.includes("jedeme full gas"),
    `Expected learned catchphrase in speech, got: ${enriched}`
  );
});

test("community voice stays off for sensitive sadness intent", () => {
  setupTempLexicon();

  for (let i = 0; i < 6; i += 1) {
    lexicon.observeChatMessage({
      message: "kurva jedeme",
      userLabel: "Katka",
      platform: "kick"
    });
  }

  const intent = chatBrain.resolveChatIntent("mia je mi smutno");
  const snapshot = lexicon.getLexiconSnapshot();
  assert.equal(lexicon.shouldUseCommunityVoice(intent, snapshot), false);
});

try {
  if (fs.existsSync(tempStorePath)) {
    fs.unlinkSync(tempStorePath);
  }
} catch (_err) {
  // ignore cleanup errors in smoke test
}

lexicon.configureLexicon({ storePath: lexicon.DEFAULT_STORE_PATH });

console.log("\n---- CHAT LEXICON SUMMARY ----");
console.log(`passed: ${results.passed}`);
console.log(`failed: ${results.failed}`);

if (results.failed > 0) {
  process.exit(1);
}
