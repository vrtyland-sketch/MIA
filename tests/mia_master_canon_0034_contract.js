"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const conversation = require("../shared/mia-conversation-core");
const personality = require("../shared/mia-personality-core");
const emotion = require("../shared/mia-emotion-core");
const decision = require("../shared/mia-decision-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0034-conversation-engine.md");
  const alignPath = path.join(MASTER, "0034-alignment.md");

  assert.ok(fs.existsSync(docPath), "0034-conversation-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0034-alignment.md exists");
  pass("0034 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 24; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0034 section ${i}`);
  }
  assert.ok(doc.includes("Core AI"), "0034 critical priority");
  assert.ok(doc.includes("0033"), "0034 links to 0033");
  assert.ok(doc.includes("0035"), "0034 points to 0035");
  pass("0034 structure (24 sections)");

  assert.equal(conversation.CE_COMPONENT_ORDER.length, 12);
  pass("conversation components");

  const engine = conversation.createConversationEngine();
  const opened = engine.openConversation({
    threadId: conversation.CE_THREAD.TIKTOK,
    participants: ["viewer", conversation.CE_SPEAKER.MIA]
  });
  assert.ok(opened.conversation.conversationId);
  pass("conversation manager");

  const context = conversation.buildConversationContext({
    message: "Ahoj MIA, jak funguje Battle?",
    userId: "vasa",
    battleActive: true
  });
  assert.equal(context.context.workingMemory, true);
  pass("context manager");

  const intent = conversation.analyzeIntent({ text: "Jak funguje Battle?" }, { battleActive: true });
  assert.equal(intent.intent, conversation.CE_INTENT.QUESTION);
  pass("intent analyzer");

  const topic = conversation.trackTopic({ text: "pojďme do battle" }, { battleActive: true }, {});
  assert.equal(topic.topic, conversation.CE_TOPIC.BATTLE);
  pass("topic tracker");

  const giftSpeaker = conversation.selectSpeaker({ intent: conversation.CE_INTENT.GIFT }, {});
  assert.equal(giftSpeaker.speaker, conversation.CE_SPEAKER.KOJNOZROUT);
  const battleSpeaker = conversation.selectSpeaker({ intent: conversation.CE_INTENT.BATTLE }, { battleActive: true });
  assert.equal(battleSpeaker.speaker, conversation.CE_SPEAKER.BOTH);
  pass("speaker manager");

  const turn = conversation.manageTurn(opened.conversation, conversation.CE_SPEAKER.MIA);
  assert.equal(turn.nextSpeaker, conversation.CE_SPEAKER.MIA);
  pass("turn manager");

  const dialogue = conversation.planDialogue({ intent: conversation.CE_INTENT.QUESTION }, { topic: conversation.CE_TOPIC.AI });
  assert.ok(dialogue.steps.length >= 3);
  pass("dialogue planner");

  const language = conversation.manageLanguage({ text: "Hello, what is MIA?" });
  assert.equal(language.detected, conversation.CE_LANGUAGE.EN);
  pass("language manager");

  const emotionEngine = emotion.createEmotionEngine();
  const personalityEngine = personality.createPersonalityEngine();
  const decisionEngine = decision.createDecisionEngine();

  const chatResult = engine.handleMessage(
    {
      text: "Díky MIA, super stream!",
      userId: "vasa",
      threadId: conversation.CE_THREAD.TIKTOK
    },
    {
      emotionEngine,
      personalityEngine,
      decisionEngine,
      memory: { working: true, shortTerm: true, previousMessages: [] }
    }
  );

  assert.equal(chatResult.ok, true);
  assert.equal(chatResult.decides, false);
  assert.equal(chatResult.executes, false);
  assert.ok(chatResult.response.text);
  assert.equal(chatResult.response.forSpeechEngine, true);
  pass("full chat pipeline");

  const giftResult = engine.handleMessage(
    {
      text: "gift!",
      userId: "donor-1",
      gift: { miaPoints: 200, tier: "T2" },
      threadId: conversation.CE_THREAD.TIKTOK
    },
    { emotionEngine, personalityEngine, decisionEngine, memory: { working: true, shortTerm: true } }
  );
  assert.equal(giftResult.ok, true);
  assert.equal(giftResult.speaker.speaker, conversation.CE_SPEAKER.KOJNOZROUT);
  pass("gift speaker routing");

  const parallelEngine = conversation.createConversationEngine();
  const kickThread = parallelEngine.openConversation({ threadId: conversation.CE_THREAD.KICK });
  const battleThread = parallelEngine.openConversation({ threadId: conversation.CE_THREAD.BATTLE });
  assert.equal(parallelEngine.conversations().length, 2);
  assert.equal(kickThread.conversation.threadId, conversation.CE_THREAD.KICK);
  assert.equal(battleThread.conversation.threadId, conversation.CE_THREAD.BATTLE);
  pass("parallel conversation threads");

  const history = giftResult.history;
  assert.ok(history.historyId);
  assert.equal(history.memoryLinked, true);
  pass("conversation history");

  const metrics = giftResult.metrics;
  assert.ok(metrics.messageCount >= 1);
  pass("conversation metrics");

  const memory = conversation.adaptMemoryContext({ working: true, previousMessages: [{ text: "hi" }] });
  assert.equal(memory.readOnly, true);
  pass("memory adapter read-only");

  const noContext = engine.handleMessage({}, { emotionEngine, personalityEngine, decisionEngine });
  assert.equal(noContext.ok, false);
  pass("reject response without context");

  assert.equal(conversation.assertConversationForbiddenActivity("mutate_memory").ok, false);
  assert.equal(conversation.assertConversationForbiddenActivity("respond_without_context").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-conversation-core/conversationEngine.js"));
  pass("AI system next doc 0041");

  for (const rel of conversation.CE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0034"), "README 0034");
  pass("README registry");

  console.log("\nMaster Canon 0034 contract: ALL PASS");
}

run();
