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
  const docPath = path.join(MASTER, "0023-episodic-memory.md");
  const alignPath = path.join(MASTER, "0023-alignment.md");

  assert.ok(fs.existsSync(docPath), "0023-episodic-memory.md exists");
  assert.ok(fs.existsSync(alignPath), "0023-alignment.md exists");
  pass("0023 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0023 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0023 critical priority");
  assert.ok(doc.includes("0022"), "0023 links to 0022");
  assert.ok(doc.includes("0024"), "0023 points to 0024");
  pass("0023 structure (21 sections)");

  assert.equal(memory.EM_COMPONENT_ORDER.length, 12);
  assert.equal(Object.keys(memory.EPISODE_TYPE).length, 6);
  pass("episodic components and types");

  const importance = memory.computeEpisodeImportanceScore(
    {
      participants: [{ id: "vasa" }, { id: "mia" }],
      tags: [memory.EPISODE_TAG.BATTLE, memory.EPISODE_TAG.GIFT],
      timeline: [{}, {}, {}],
      links: [{ to: "ep-2" }]
    },
    { economicWeight: 0.8, emotionWeight: 0.7, uniqueness: 0.9, projectImpact: 0.6 }
  );
  assert.ok(importance.score > 0.4);
  pass("importance score");

  const builder = memory.createEpisodeBuilder({ type: memory.EPISODE_TYPE.BATTLE });
  const t0 = Date.now();
  builder.appendEvent({ at: t0, kind: "battle_start", label: "Battle start" });
  builder.appendEvent({ at: t0 + 60000, kind: "gift", label: "Big gift" });
  builder.appendEvent({ at: t0 + 120000, kind: "kojnozout", label: "Kojnozout reaction" });
  builder.appendEvent({ at: t0 + 180000, kind: "battle_win", label: "Victory" });

  const built = builder.build({
    what: "First Battle victory",
    why: "significant_battle",
    outcome: "win",
    tags: [memory.EPISODE_TAG.BATTLE, memory.EPISODE_TAG.KOJNOZROUT],
    participants: [
      { id: "vasa", name: "Váša", kind: "user" },
      { id: "kojnozout", name: "Kojnožrout", kind: "entity" },
      { id: "mia", name: "MIA", kind: "ai" }
    ],
    context: {
      platform: "tiktok",
      activeBattle: "battle-1",
      moodMia: "excited",
      moodKojnozout: "hungry"
    }
  });
  assert.equal(built.ok, true);
  assert.equal(built.episode.timeline.length, 4);
  pass("episode builder");

  const store = memory.createEpisodicMemoryStore();
  store.put(built.episode);

  const streamEpisode = store.put({
    type: memory.EPISODE_TYPE.STREAM,
    what: "First public stream with Kojnožrout",
    why: "milestone_stream",
    outcome: "completed",
    startedAt: t0 - 3600000,
    endedAt: t0,
    tags: [memory.EPISODE_TAG.STREAM, memory.EPISODE_TAG.KOJNOZROUT],
    participants: [{ id: "vasa", name: "Váša" }],
    context: { platform: "tiktok", language: "cs" }
  });
  pass("episode store put");

  const battleId = built.episode.episodeId;
  const streamId = streamEpisode.episode.episodeId;
  const linked = store.link(battleId, streamId, "same_day");
  assert.equal(linked.ok, true);
  assert.ok(store.graph().edges.length >= 1);
  pass("episode links");

  const replay = store.replay(battleId);
  assert.equal(replay.ok, true);
  assert.ok(replay.replay.keyEvents.includes("battle_win"));
  pass("episode replay");

  const battleSearch = store.search({
    type: memory.EPISODE_TYPE.BATTLE,
    tags: [memory.EPISODE_TAG.BATTLE]
  });
  assert.ok(battleSearch.count >= 1);
  pass("episode search by battle tag");

  const personSearch = store.search({ participantId: "vasa" });
  assert.ok(personSearch.count >= 2);
  pass("episode search by participant");

  assert.throws(
    () =>
      memory.createEpisode({
        what: "Incomplete moment",
        why: "test"
      }),
    /incomplete episodes must be explicitly marked/
  );
  const incomplete = memory.createEpisode({
    what: "Draft episode",
    why: "test",
    incomplete: true
  });
  assert.equal(incomplete.incomplete, true);
  pass("incomplete episode marking");

  const archived = store.archive(battleId, "retention_policy");
  assert.equal(archived.ok, true);
  assert.equal(store.get(battleId).ok, false);
  pass("episode archive");

  assert.equal(memory.assertEpisodicForbiddenActivity("replace_logs").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/episodicMemory.js"));
  pass("memory system next doc 0024");

  for (const rel of memory.EM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0023"), "README 0023");
  pass("README registry");

  console.log("\nMaster Canon 0023 contract: ALL PASS");
}

run();
