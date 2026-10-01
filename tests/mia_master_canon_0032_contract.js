"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const emotion = require("../shared/mia-emotion-core");
const memory = require("../shared/mia-memory-core");
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
  const docPath = path.join(MASTER, "0032-emotion-engine.md");
  const alignPath = path.join(MASTER, "0032-alignment.md");

  assert.ok(fs.existsSync(docPath), "0032-emotion-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0032-alignment.md exists");
  pass("0032 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0032 section ${i}`);
  }
  assert.ok(doc.includes("Core AI"), "0032 critical priority");
  assert.ok(doc.includes("0026"), "0032 links to 0026");
  assert.ok(doc.includes("0033"), "0032 points to 0033");
  pass("0032 structure (22 sections)");

  assert.equal(emotion.EE_COMPONENT_ORDER.length, 12);
  pass("emotion components");

  const engine = emotion.createEmotionEngine();
  const smallGift = engine.evaluate({
    eventType: "gift",
    gift: { miaPoints: 1, tier: "T1" }
  });
  assert.equal(smallGift.ok, true);
  assert.equal(smallGift.emotionState.primary, emotion.EE_EMOTION.JOY);
  assert.ok(smallGift.emotionState.intensity < 60);
  pass("small gift emotion");

  const bigGift = engine.evaluate({
    eventType: "gift",
    gift: { miaPoints: 5000, tier: "T4" }
  });
  assert.ok(bigGift.emotionState.intensity > smallGift.emotionState.intensity);
  pass("large gift intensity");

  const obsOutage = engine.evaluate({ eventType: "obs_outage", obsDown: true });
  assert.ok(obsOutage.emotionState.active.includes(emotion.EE_EMOTION.TENSION));
  pass("obs outage tension");

  const battle = engine.evaluate({ battleActive: true, gift: { miaPoints: 120 } });
  const mixed = emotion.mixEmotions(
    battle.emotionState.mixed.map((m) => ({ emotion: m.emotion, weight: m.weight }))
  );
  assert.ok(mixed.mixed.length >= 2);
  pass("emotion mixer");

  const mood = emotion.manageMood({}, { battleActive: true });
  assert.equal(mood.mood, emotion.EE_MOOD.COMPETITIVE);
  pass("mood manager");

  const personality = emotion.adaptPersonality({}, { style: emotion.EE_PERSONALITY_STYLE.WITTY });
  assert.equal(personality.style, emotion.EE_PERSONALITY_STYLE.WITTY);
  pass("personality adapter");

  const community = emotion.adaptCommunity({}, { chatVelocity: 60, giftRate: 10, battleActive: true });
  assert.equal(community.atmosphere, "competitive");
  pass("community adapter");

  const emotional = memory.createEmotionalMemoryStore();
  const updated = emotional.updateRelationship("vasa", {
    trustDelta: { positiveExperienceBoost: 20 },
    reputation: memory.REPUTATION_ROLE.SUPPORTER
  });
  const supporter = emotion.adaptRelationship(
    {},
    { userId: "vasa", trustScore: updated.profile.trustScore, reputation: updated.profile.reputation },
    emotional.snapshotForEmotionEngine()
  );
  assert.equal(supporter.greetingStyle, "personal_welcome");

  const newcomer = emotion.adaptRelationship({}, { userId: "new-1", trustScore: 10 }, {});
  assert.equal(newcomer.greetingStyle, "friendly_intro");
  pass("relationship adapter");

  const intensity = emotion.controlIntensity({}, { base: 40, giftPoints: 500, battleActive: true, personalityFactor: 1.1 });
  assert.ok(intensity.intensity > 40 && intensity.intensity <= 100);
  pass("intensity controller");

  const transition = emotion.transitionEmotion(emotion.EE_EMOTION.CALM, emotion.EE_EMOTION.JOY);
  assert.equal(transition.smooth, true);
  assert.ok(transition.path.length >= 2);
  pass("emotion transitions");

  const invalid = emotion.validateEmotionState({
    active: [emotion.EE_EMOTION.JOY, "extreme_sadness"],
    intensity: 80,
    intensities: { joy: 98, sadness: 98 }
  });
  assert.equal(invalid.ok, false);
  pass("emotion validator");

  const koj = emotion.buildKojnozoutEmotionState({ battleActive: true }, { kojEnergy: 70 });
  assert.equal(koj.primary, emotion.EE_KOJ_EMOTION.BATTLE_READY);
  assert.equal(koj.independentFromMia, true);
  pass("kojnozout emotion state");

  const memAdapter = emotion.adaptEmotionalMemoryContext({ trustScore: 88, mood: "joy" });
  assert.equal(memAdapter.readOnly, true);
  pass("emotional memory read-only");

  const decisionEngine = decision.createDecisionEngine();
  const decided = decisionEngine.decide({
    sources: {
      event: {
        type: "gift",
        gift: { tier: "T2", miaPoints: 120 },
        userId: "vasa"
      }
    },
    adapters: {
      emotion: bigGift.decisionAdapter,
      memory: { working: true, shortTerm: true }
    }
  });
  assert.equal(decided.ok, true);
  assert.equal(decided.executes, false);
  assert.equal(decided.context.mood, bigGift.emotionState.mood);
  pass("decision engine emotion adapter");

  assert.equal(emotion.assertEmotionForbiddenActivity("mutate_facts").ok, false);
  assert.equal(emotion.assertEmotionForbiddenActivity("bypass_decision_engine").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-emotion-core/emotionEngine.js"));
  pass("AI system next doc 0041");

  for (const rel of emotion.EE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0032"), "README 0032");
  pass("README registry");

  console.log("\nMaster Canon 0032 contract: ALL PASS");
}

run();
