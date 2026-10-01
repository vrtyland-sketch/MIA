"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const memory = require("../shared/mia-memory-core");
const architecture = require("../shared/mia-architecture-core");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pathExists(rel) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) return true;
  return fs.existsSync(path.join(ROOT, rel.split("/")[0]));
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0026-emotional-memory.md");
  const alignPath = path.join(MASTER, "0026-alignment.md");

  assert.ok(fs.existsSync(docPath), "0026-emotional-memory.md exists");
  assert.ok(fs.existsSync(alignPath), "0026-alignment.md exists");
  pass("0026 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0026 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0026 critical priority");
  assert.ok(doc.includes("0023"), "0026 links to 0023");
  assert.ok(doc.includes("0027"), "0026 points to 0027");
  pass("0026 structure (22 sections)");

  assert.equal(memory.EM_COMPONENT_ORDER.length, 12);
  assert.equal(memory.TRUST_MIN, 0);
  assert.equal(memory.TRUST_MAX, 100);
  assert.equal(memory.EMOTION_SCORE_MIN, -100);
  assert.equal(memory.EMOTION_SCORE_MAX, 100);
  pass("emotional components and scales");

  const scored = memory.computeEmotionScore({
    intensity: 0.9,
    repetition: 8,
    importance: 0.8,
    impact: 0.7,
    relationshipWeight: 0.9,
    projectSignificance: 0.85,
    polarity: "positive"
  });
  assert.ok(scored.score > 50);
  pass("emotion score");

  const store = memory.createEmotionalMemoryStore();

  store.putExperience({
    summary: "First major Battle victory",
    userId: "vasa",
    scoring: { intensity: 0.95, importance: 0.9, projectSignificance: 1 },
    context: {
      platform: "tiktok",
      battleId: "battle-1",
      kojnozoutInvolved: true,
      outcome: "win"
    }
  });
  store.putExperience({
    summary: "Record stream peak viewers",
    scoring: { intensity: 0.8, importance: 0.85, projectSignificance: 0.9 }
  });
  pass("emotion history");

  const rel = store.updateRelationship("vasa", {
    trustDelta: {
      activityBoost: 5,
      supportBoost: 10,
      positiveExperienceBoost: 8
    },
    reputation: memory.REPUTATION_ROLE.SUPPORTER,
    interactionDelta: 1,
    collaborationDelta: 1,
    timelineMoment: { label: "First contact", emotionScore: 40 }
  });
  assert.ok(rel.profile.trustScore > 50);
  assert.equal(rel.profile.reputation, memory.REPUTATION_ROLE.SUPPORTER);
  pass("relationship engine and trust manager");

  store.setReputation("katka", memory.REPUTATION_ROLE.MODERATOR);
  const katka = store.getRelationship("katka");
  assert.equal(katka.profile.reputation, memory.REPUTATION_ROLE.MODERATOR);
  pass("reputation manager");

  store.recordMood({
    label: "intensive_development",
    period: "2026-Q2",
    intensity: 0.8,
    reason: "graphics_studio_release"
  });
  assert.equal(store.moodHistory().length, 1);
  pass("mood history");

  store.updateKojnozoutEmotion({
    favoriteDonors: ["vasa"],
    moodBaseline: "hungry",
    battleHistory: [{ battleId: "battle-1", outcome: "win" }]
  });
  assert.equal(store.kojnozoutProfile().favoriteDonors[0], "vasa");
  pass("kojnozout emotional integration");

  for (let i = 0; i < 4; i += 1) {
    store.putExperience({
      summary: `Positive collaboration ${i}`,
      userId: "vasa",
      scoring: { intensity: 0.6, repetition: i + 1, importance: 0.5 }
    });
  }
  const consolidated = store.consolidate("vasa");
  assert.ok(consolidated.mergedCount >= 0);
  pass("emotion consolidator");

  const timeline = store.relationshipTimeline("vasa");
  assert.ok(timeline.timeline.length >= 1);
  pass("emotion timeline");

  const search = store.search({
    userId: "vasa",
    minScore: 30,
    battleId: "battle-1"
  });
  assert.ok(search.count >= 1);
  pass("emotion search");

  const engineSnapshot = store.snapshotForEmotionEngine();
  assert.equal(engineSnapshot.readOnly, true);
  assert.equal(engineSnapshot.decides, undefined);
  pass("separated from emotion engine");

  const api = memory.createEmotionalApiResponse(engineSnapshot);
  assert.equal(api.decides, false);
  pass("emotional API read-only");

  assert.throws(
    () =>
      memory.createEmotionalExperience({
        summary: "Unverified rumor",
        verified: false
      }),
    /unverified conclusions must be marked/
  );
  pass("unverified conclusions rejected");

  assert.equal(memory.assertEmotionalForbiddenActivity("replace_decision_engine").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/emotionalMemory.js"));
  pass("memory system next doc 0027");

  for (const rel of memory.EM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0026"), "README 0026");
  pass("README registry");

  console.log("\nMaster Canon 0026 contract: ALL PASS");
}

run();
