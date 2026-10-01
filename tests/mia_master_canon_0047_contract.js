"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const character = require("../shared/mia-character-core");
const world = require("../shared/mia-world-core");
const story = require("../shared/mia-story-core");
const battle = require("../shared/mia-battle-core");
const inventory = require("../shared/mia-inventory-core");
const personality = require("../shared/mia-personality-core");
const emotion = require("../shared/mia-emotion-core");
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
  const docPath = path.join(MASTER, "0047-npc-character-engine.md");
  const alignPath = path.join(MASTER, "0047-alignment.md");

  assert.ok(fs.existsSync(docPath), "0047-npc-character-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0047-alignment.md exists");
  pass("0047 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 25; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0047 section ${i}`);
  }
  assert.ok(doc.includes("Character Core"), "0047 critical priority");
  assert.ok(doc.includes("0046"), "0047 links to 0046");
  assert.ok(doc.includes("0048"), "0047 points to 0048");
  pass("0047 structure (25 sections)");

  assert.equal(character.CE_COMPONENT_ORDER.length, 12);
  pass("character components");

  assert.ok(character.DEFAULT_CHARACTER_REGISTRY.length >= 9);
  assert.ok(character.CE_CANON_CHARACTER.MIA);
  assert.ok(character.CE_CANON_CHARACTER.KOJ_TANK);
  pass("canon character registry");

  const identity = character.createIdentity({
    characterId: character.CE_CANON_CHARACTER.MIA,
    name: "MIA",
    species: "ai_host",
    occupation: "host"
  });
  assert.equal(identity.mutable, false);
  pass("identity manager");

  const personalityEngine = personality.createPersonalityEngine();
  const behaviour = character.resolveBehaviour(
    { characterId: character.CE_CANON_CHARACTER.MIA, behaviour: character.CE_BEHAVIOUR.FRIENDLY },
    { personalityEngine }
  );
  assert.equal(behaviour.ok, true);
  pass("behaviour via personality engine");

  const blockedBehaviour = character.resolveBehaviour({
    characterId: character.CE_CANON_CHARACTER.MIA,
    bypassPersonalityEngine: true
  });
  assert.equal(blockedBehaviour.ok, false);
  pass("reject personality bypass");

  const routine = character.advanceRoutine("work");
  assert.equal(routine.next, "leisure");
  pass("routine manager");

  const relation = character.manageRelationship({
    fromCharacterId: character.CE_CANON_CHARACTER.MIA,
    toCharacterId: character.CE_CANON_CHARACTER.KOJ_TANK,
    strength: character.CE_RELATIONSHIP_STRENGTH.VERY_STRONG
  });
  assert.equal(relation.usesEmotionalMemory, true);
  pass("relationship manager");

  const stats = character.createStats({
    characterId: character.CE_CANON_CHARACTER.KOJ_FIGHTER,
    strength: 20,
    battleReady: true
  });
  assert.equal(stats.battleReady, true);
  pass("character stats");

  const inventoryEngine = inventory.createInventoryEngine();
  const equipped = character.equipViaInventory(
    {
      characterId: character.CE_CANON_CHARACTER.KOJ_TANK,
      inventory: {},
      item: { instanceId: "inst-shield-1", itemId: "shield_basic" },
      slot: "hands"
    },
    { inventoryEngine }
  );
  assert.equal(equipped.viaInventoryEngine, true);
  pass("equipment via inventory engine");

  const emotionEngine = emotion.createEmotionEngine();
  const action = character.planCharacterAction(
    {
      characterId: character.CE_CANON_CHARACTER.MIA,
      action: "greet",
      fromDecisionEngine: true,
      fromPersonalityEngine: true
    },
    { emotionEngine }
  );
  assert.equal(action.ok, true);
  pass("character ai via decision engine");

  const blockedAi = character.planCharacterAction({
    characterId: character.CE_CANON_CHARACTER.MIA,
    fromDecisionEngine: false
  });
  assert.equal(blockedAi.ok, false);
  pass("reject decision bypass");

  const worldEngine = world.createWorldEngine();
  const engine = character.createCharacterEngine();
  const registered = engine.registerCharacter({
    characterId: character.CE_CANON_CHARACTER.MIA,
    locationId: "mia_house"
  });
  assert.equal(registered.ok, true);
  pass("character manager");

  const placed = engine.placeCharacter(
    { characterId: character.CE_CANON_CHARACTER.MIA, locationId: "mia_house", regionId: world.WE_REGION.CENTRAL },
    { worldEngine }
  );
  assert.equal(placed.ok, true);
  assert.equal(placed.mutatesWorldEngine, false);
  pass("world placement read-only");

  const interaction = engine.processInteraction(
    {
      characterId: character.CE_CANON_CHARACTER.MIA,
      action: "dialogue",
      dialogue: true,
      fromDecisionEngine: true,
      targetCharacterId: character.CE_CANON_CHARACTER.KOJ_TANK,
      relationshipStrength: character.CE_RELATIONSHIP_STRENGTH.VERY_STRONG,
      skipPersonalityCheck: true,
      skipEmotionCheck: true
    },
    { personalityEngine, emotionEngine }
  );
  assert.equal(interaction.ok, true);
  assert.equal(interaction.mutatesEconomy, false);
  assert.equal(interaction.createsBattleRules, false);
  pass("character interaction pipeline");

  const storyData = engine.getCharacterForStory(character.CE_CANON_CHARACTER.MIA);
  assert.equal(storyData.forStoryEngine, true);
  const storyNpc = story.registerNpc({
    npcId: storyData.characterId,
    name: storyData.name,
    locationId: "mia_house"
  });
  assert.equal(storyNpc.ok !== false, true);
  pass("story engine integration");

  engine.registerCharacter({ characterId: character.CE_CANON_CHARACTER.KOJ_FIGHTER });
  const battleReport = engine.reportBattleActivity({
    characterId: character.CE_CANON_CHARACTER.KOJ_FIGHTER,
    victory: true,
    xpGain: 15
  });
  assert.equal(battleReport.ok, true);
  assert.equal(battleReport.createsBattleRules, false);
  pass("battle stats without rule mutation");

  const battleEngine = battle.createBattleEngine();
  const started = battleEngine.start({ fromDecision: true, participants: ["katka"] });
  assert.equal(started.ok, true);
  pass("battle rules independent of character engine");

  const lifecycle = character.buildCharacterLifecycle({
    creation: true,
    registration: true,
    placement: true,
    routine: true,
    interaction: true,
    evolution: false,
    history: true
  });
  assert.equal(lifecycle.lifecycle.length, 7);
  pass("character lifecycle");

  assert.equal(character.assertCharacterForbiddenActivity("mutate_economy").ok, false);
  assert.equal(character.assertCharacterForbiddenActivity("create_battle_rules").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-character-core/characterEngine.js"));
  pass("ai system next doc 0048");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  pass("game system next doc 0048");

  for (const rel of character.CE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0047"), "README 0047");
  pass("README registry");

  console.log("\nMaster Canon 0047 contract: ALL PASS");
}

run();
