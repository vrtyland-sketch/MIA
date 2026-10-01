"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const story = require("../shared/mia-story-core");
const world = require("../shared/mia-world-core");
const community = require("../shared/mia-community-core");
const battle = require("../shared/mia-battle-core");
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
  const docPath = path.join(MASTER, "0046-story-engine.md");
  const alignPath = path.join(MASTER, "0046-alignment.md");

  assert.ok(fs.existsSync(docPath), "0046-story-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0046-alignment.md exists");
  pass("0046 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 25; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0046 section ${i}`);
  }
  assert.ok(doc.includes("Narrative Core"), "0046 critical priority");
  assert.ok(doc.includes("0045"), "0046 links to 0045");
  assert.ok(doc.includes("0047"), "0046 points to 0047");
  pass("0046 structure (25 sections)");

  assert.equal(story.SE_COMPONENT_ORDER.length, 12);
  pass("story components");

  assert.ok(story.DEFAULT_STORY_DEFINITIONS.length >= 4);
  assert.ok(story.SE_CANON_STORY.FIRST_BOWL);
  pass("canon stories");

  const chapter = story.advanceChapter(
    { chapters: story.SE_CHAPTER_ORDER },
    "chapter_I"
  );
  assert.equal(chapter.next, "chapter_II");
  pass("chapter manager");

  const dialogue = story.createDialogue({
    speaker: "mia",
    text: "Vítej ve světě Kojnožroutů.",
    fromConversationEngine: true
  });
  assert.equal(dialogue.fromConversationEngine, true);
  pass("dialogue manager");

  const npc = story.registerNpc({ npcId: "elder_koj", name: "Starý Koj", locationId: "community_square" });
  assert.equal(npc.persistent, true);
  pass("npc manager");

  const choice = story.presentCommunityChoice({
    prompt: "Pomoci vesnici nebo zachránit Kojnožrouta?",
    options: [{ id: "help_village" }, { id: "save_koj" }]
  });
  const resolved = story.resolveCommunityChoice(choice, { optionId: "help_village" });
  assert.equal(resolved.ok, true);
  pass("choice manager");

  const worldEngine = world.createWorldEngine();
  const communityEngine = community.createCommunityEngine();
  const consequence = story.applyConsequence(
    { type: story.SE_CONSEQUENCE_TYPE.REGION_CHANGE, regionId: world.WE_REGION.ADVENTURE },
    { worldEngine, communityEngine }
  );
  assert.equal(consequence.ok, true);
  pass("consequence via world engine");

  const engine = story.createStoryEngine();
  const beat = engine.processStoryBeat(
    {
      storyId: story.SE_CANON_STORY.FIRST_BOWL,
      text: "První miska je připravena.",
      fromConversationEngine: true,
      fromDecisionEngine: true,
      choice: {
        prompt: "Komu pomoci?",
        options: [{ id: "village" }, { id: "koj" }]
      },
      selection: { optionId: "village" },
      consequences: {
        type: story.SE_CONSEQUENCE_TYPE.REPUTATION_CHANGE,
        reputationDelta: 5
      },
      approved: true
    },
    { worldEngine, communityEngine }
  );
  assert.equal(beat.ok, true);
  assert.equal(beat.mutatesEconomy, false);
  assert.equal(beat.mutatesBattleRules, false);
  pass("story beat pipeline");

  const battleStory = engine.reportBattleOutcome(
    { storyId: story.SE_CANON_STORY.LEGENDARY_BATTLE, victory: true },
    { worldEngine }
  );
  assert.equal(battleStory.ok, true);
  pass("battle outcome to story");

  const battleEngine = battle.createBattleEngine();
  const started = battleEngine.start({ fromDecision: true, participants: ["katka"] });
  assert.equal(started.ok, true);
  pass("battle rules independent of story");

  const timeline = engine.getTimeline();
  assert.ok(timeline.entries.length > 0);
  pass("timeline manager");

  const lifecycle = story.buildStoryLifecycle({
    design: true,
    approval: true,
    prolog: true,
    chapters: true,
    finale: true,
    archive: false
  });
  assert.equal(lifecycle.lifecycle.length, 6);
  pass("story lifecycle");

  const blocked = engine.processStoryBeat({ requiresDecision: true });
  assert.equal(blocked.ok, false);
  pass("reject decision bypass");

  assert.equal(story.assertStoryForbiddenActivity("mutate_economy").ok, false);
  assert.equal(story.assertStoryForbiddenActivity("decide_outside_decision_engine").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-story-core/storyEngine.js"));
  pass("ai system next doc 0047");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  pass("game system next doc 0047");

  for (const rel of story.SE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0046"), "README 0046");
  pass("README registry");

  console.log("\nMaster Canon 0046 contract: ALL PASS");
}

run();
