"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

const chatLexicon = require("../scripts/MIA_CHAT_LEXICON");
const responseEngine = require("../scripts/MIA_RESPONSE_ENGINE");
const textBankModule = require("../scripts/MIA_TEXT_BANK");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-chat-variety-"));
const lexiconPath = path.join(tmpDir, "lexicon.json");

chatLexicon.configureLexicon({ storePath: lexiconPath });

function makeOutputState() {
  return {
    rotationIndex: {},
    rotationLastText: {},
    rotationRecentByKey: {}
  };
}

function testMetaTestPhraseFilter() {
  assert.strictEqual(chatLexicon.isMetaTestPhrase("This is a Test"), true);
  assert.strictEqual(chatLexicon.isMetaTestPhrase("it works"), true);
  assert.strictEqual(chatLexicon.isMetaTestPhrase("Ahoj MIA, jak se máš?"), false);
  assert.strictEqual(chatLexicon.isUsableCatchphrase("This is a Test"), false);
  assert.strictEqual(chatLexicon.isUsableCatchphrase("dneska je super večer"), true);
}

function testLexiconIgnoresTestMessages() {
  chatLexicon.resetLexicon(lexiconPath);

  for (let i = 0; i < 8; i += 1) {
    chatLexicon.observeChatMessage({
      message: "This is a Test",
      userLabel: "TestUser",
      platform: "tikfinity"
    });
  }

  const snapshot = chatLexicon.getLexiconSnapshot();
  assert.strictEqual(snapshot.topPhrase, null);
  assert.ok(snapshot.stats.messagesSeen >= 0);
}

function testFallbackVariety() {
  const reloaded = textBankModule.loadTextBank();
  if (reloaded?.TEXT_BANK) {
    Object.assign(textBankModule.TEXT_BANK, reloaded.TEXT_BANK);
  }

  const outputState = makeOutputState();
  const replies = new Set();

  for (let i = 0; i < 12; i += 1) {
    const text = responseEngine.buildDirectChatResponse(outputState, {
      userLabel: `Viewer${i}`,
      message: "jo hele",
      target: "mia"
    }).speech_text;

    assert.ok(text, "reply should not be empty");
    assert.ok(!/this is a test/i.test(text), "reply should not echo test phrase");
    replies.add(text.toLowerCase());
  }

  assert.ok(replies.size >= 4, `expected varied replies, got ${replies.size}`);
}

function testStaleRegisterDetection() {
  assert.strictEqual(
    responseEngine.isStaleRegisterResponse("Jan, registruju tě. Klidně pokračuj."),
    true
  );
  assert.strictEqual(
    responseEngine.isStaleRegisterResponse("Jan, dobrý timing — právě jsem u chatu."),
    false
  );
  assert.strictEqual(
    responseEngine.isGenericResponse("Jan, registruju tě. Klidně pokračuj."),
    true
  );
}

function testCommunityVoiceNotAlwaysApplied() {
  chatLexicon.resetLexicon(lexiconPath);

  for (let i = 0; i < 20; i += 1) {
    chatLexicon.observeChatMessage({
      message: "dneska jedeme mega stream",
      userLabel: "Fan",
      platform: "kick"
    });
  }

  const outputState = makeOutputState();
  let enrichedCount = 0;

  for (let i = 0; i < 16; i += 1) {
    const base = responseEngine.buildDirectChatResponse(outputState, {
      userLabel: `Fan${i}`,
      message: "co je nového",
      target: "mia"
    }).speech_text;

    if (/mimochodem|už jsem si všimla|chat dneska má svoje tempo|společný rytmus/i.test(base)) {
      enrichedCount += 1;
    }
  }

  assert.ok(enrichedCount < 8, `community voice applied too often: ${enrichedCount}/16`);
}

function run() {
  testMetaTestPhraseFilter();
  testLexiconIgnoresTestMessages();
  testFallbackVariety();
  testStaleRegisterDetection();
  testCommunityVoiceNotAlwaysApplied();
  console.log("chat_variety_contract: ok");
}

run();
