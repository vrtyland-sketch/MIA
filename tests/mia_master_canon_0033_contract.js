"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
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
  const docPath = path.join(MASTER, "0033-personality-engine.md");
  const alignPath = path.join(MASTER, "0033-alignment.md");

  assert.ok(fs.existsSync(docPath), "0033-personality-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0033-alignment.md exists");
  pass("0033 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0033 section ${i}`);
  }
  assert.ok(doc.includes("Core AI"), "0033 critical priority");
  assert.ok(doc.includes("0032"), "0033 links to 0032");
  assert.ok(doc.includes("0034"), "0033 points to 0034");
  pass("0033 structure (23 sections)");

  assert.equal(personality.PE_COMPONENT_ORDER.length, 12);
  pass("personality components");

  const engine = personality.createPersonalityEngine();
  const miaIdentity = personality.buildIdentityCore(personality.PE_ENTITY.MIA);
  assert.equal(miaIdentity.name, "MIA");
  assert.equal(miaIdentity.stable, true);
  pass("identity core");

  const miaProfile = personality.buildPersonalityProfile(personality.PE_ENTITY.MIA);
  assert.ok(miaProfile.traits.includes(personality.PE_TRAIT.EMPATHETIC));
  pass("personality profile");

  const values = personality.buildValueSystem(personality.PE_ENTITY.MIA);
  assert.ok(values.values.includes(personality.PE_VALUE.SAFETY));
  pass("value system");

  const style = personality.buildCommunicationStyle(miaProfile);
  assert.ok(style.humorLevel > 0);
  pass("communication style");

  const humorBlocked = personality.applyHumor({ battleActive: true }, { blocked: true });
  assert.equal(humorBlocked.allowed, false);
  const humorOk = personality.applyHumor({ gift: { miaPoints: 100 } }, {});
  assert.equal(humorOk.allowed, true);
  pass("humor engine");

  const behaviour = personality.adaptBehaviour({}, style, { intensity: 80, primary: "joy" });
  assert.equal(behaviour.tone, personality.PE_BEHAVIOUR_TONE.PLAYFUL);
  pass("behaviour adapter");

  const invalidIdentity = personality.validateIdentity(
    { archetype: "caretaker_guide", traits: [personality.PE_TRAIT.CALM] },
    { archetype: "aggressive_host", traits: ["aggressive"] }
  );
  assert.equal(invalidIdentity.ok, false);
  pass("identity validator");

  const evolved = engine.evolve(personality.PE_ENTITY.MIA, {
    communityGrowth: true,
    reason: "community_milestone"
  });
  assert.equal(evolved.ok, true);
  assert.ok(evolved.evolved.version >= 2);
  pass("personality evolution");

  const memory = personality.recordPersonalityVersion(miaProfile, { reason: "test" });
  assert.ok(memory.auditId);
  pass("personality memory");

  const consistency = engine.ensureConsistency();
  assert.equal(consistency.consistent, true);
  pass("consistency manager");

  const emotionEngine = emotion.createEmotionEngine();
  const emotionResult = emotionEngine.evaluate({
    eventType: "gift",
    gift: { miaPoints: 500, tier: "T3" }
  });

  const miaResolved = engine.resolve(
    personality.PE_ENTITY.MIA,
    { gift: { miaPoints: 500 } },
    emotionResult.emotionState
  );
  assert.equal(miaResolved.ok, true);
  assert.equal(miaResolved.decides, false);
  assert.equal(miaResolved.executes, false);
  assert.ok(miaResolved.combined.tone);
  pass("personality plus emotion");

  const kojResolved = engine.resolve(personality.PE_ENTITY.KOJNOZROUT, { battleActive: true }, {});
  assert.equal(kojResolved.profile.archetype, "hungry_trickster");
  assert.notEqual(kojResolved.profile.archetype, miaResolved.profile.archetype);
  pass("kojnozout personality");

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
      emotion: emotionResult.decisionAdapter,
      personality: miaResolved.decisionContext,
      memory: { working: true, shortTerm: true }
    }
  });
  assert.equal(decided.ok, true);
  assert.equal(decided.executes, false);
  pass("decision engine personality context");

  assert.equal(personality.assertPersonalityForbiddenActivity("mutate_facts").ok, false);
  assert.equal(personality.assertPersonalityForbiddenActivity("bypass_decision_engine").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-personality-core/personalityEngine.js"));
  pass("AI system next doc 0041");

  for (const rel of personality.PE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0033"), "README 0033");
  pass("README registry");

  console.log("\nMaster Canon 0033 contract: ALL PASS");
}

run();
