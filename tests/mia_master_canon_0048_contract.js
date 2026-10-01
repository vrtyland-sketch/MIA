"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const creature = require("../shared/mia-creature-core");
const battle = require("../shared/mia-battle-core");
const world = require("../shared/mia-world-core");
const community = require("../shared/mia-community-core");
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
  const docPath = path.join(MASTER, "0048-creature-evolution-engine.md");
  const alignPath = path.join(MASTER, "0048-alignment.md");

  assert.ok(fs.existsSync(docPath), "0048-creature-evolution-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0048-alignment.md exists");
  pass("0048 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 14; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0048 section ${i}`);
  }
  assert.ok(doc.includes("Creature Core"), "0048 critical priority");
  assert.ok(doc.includes("0047"), "0048 links to 0047");
  assert.ok(doc.includes("0049"), "0048 points to 0049");
  pass("0048 structure (14 sections)");

  assert.equal(creature.CVE_COMPONENT_ORDER.length, 12);
  pass("creature components");

  assert.equal(creature.CVE_PLATFORM_ORDER.length, 5);
  assert.ok(creature.CVE_PLATFORM.FACEBOOK);
  pass("platform kojnozout registry");

  assert.ok(creature.DEFAULT_PLATFORM_CREATURES.length === 5);
  const tiktok = creature.registerPlatformCreature({ platformId: creature.CVE_PLATFORM.TIKTOK });
  assert.equal(tiktok.isolatedHistory, true);
  assert.equal(tiktok.isolatedProgress, true);
  pass("per-platform creature isolation");

  const genetics = creature.createGeneticProfile({
    creatureId: "kojnozout.tiktok",
    strength: 15,
    rarity: 3
  });
  assert.equal(genetics.profile.strength, 15);
  assert.equal(genetics.profile.luck, 10);
  pass("genetics manager");

  assert.ok(creature.DEFAULT_GAME_MODULES.length >= 10);
  const mod = creature.registerGameModule({
    moduleId: "racing",
    name: "Racing Module",
    version: "0.1.0"
  });
  assert.equal(mod.state, creature.CVE_MODULE_STATE.REGISTERED);
  pass("game module registry");

  const lifecycle = creature.manageModuleLifecycle(mod, "activate");
  assert.equal(lifecycle.requiresCoreRestart, false);
  pass("module lifecycle without core restart");

  const blockedEvolution = creature.evolveCreature(
    { creatureId: "kojnozout.kick", level: 1, experience: 0 },
    { xpGain: 50, mutateBattleRules: true }
  );
  assert.equal(blockedEvolution.ok, false);
  pass("evolution separate from battle rules");

  const evolution = creature.evolveCreature(
    { creatureId: "kojnozout.kick", level: 1, experience: 0 },
    { xpGain: 150, unlockAttack: true, unlockAnimation: true }
  );
  assert.equal(evolution.toLevel, 2);
  assert.equal(evolution.mutatesBattleRules, false);
  pass("creature evolution");

  const battleEngine = battle.createBattleEngine();
  const platformBattle = creature.coordinatePlatformBattle(
    {
      platforms: [creature.CVE_PLATFORM.TIKTOK, creature.CVE_PLATFORM.KICK],
      fromDecisionEngine: true
    },
    { battleEngine }
  );
  assert.equal(platformBattle.ok, true);
  assert.equal(platformBattle.mutatesBattleRules, false);
  pass("platform battle via battle engine");

  const engine = creature.createCreatureEvolutionEngine();
  assert.equal(engine.listPlatformCreatures().length, 5);
  pass("creature manager bootstrap");

  const attached = engine.attachModule(creature.CVE_PLATFORM.TIKTOK, "fishing");
  assert.equal(attached.viaModuleApi, true);
  pass("attach game module to creature");

  const developed = engine.developFromCommunity(
    creature.CVE_PLATFORM.TIKTOK,
    { xpGain: 120, activity: true },
    { communityEngine: community.createCommunityEngine() }
  );
  assert.equal(developed.ok, true);
  assert.equal(developed.mutatesBattleRules, false);
  pass("community development pipeline");

  const worldEngine = world.createWorldEngine();
  const home = engine.placeHome(
    creature.CVE_PLATFORM.YOUTUBE,
    { homeId: "youtube_home", arenaId: "youtube_arena" },
    { worldEngine }
  );
  assert.equal(home.ok, true);
  assert.equal(home.mutatesWorldEngine, false);
  pass("world home placement read-only");

  const battleStart = battleEngine.start({ fromDecision: true, participants: ["katka"] });
  assert.equal(battleStart.ok, true);
  pass("battle rules independent of creature engine");

  const histories = engine.history();
  const tiktokHistory = histories.filter((h) => h.platformId === creature.CVE_PLATFORM.TIKTOK);
  assert.ok(tiktokHistory.length > 0);
  pass("isolated platform history");

  assert.equal(creature.assertCreatureForbiddenActivity("mutate_battle_rules").ok, false);
  assert.equal(creature.assertCreatureForbiddenActivity("hardcode_game_into_core").ok, false);
  pass("forbidden activities");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  assert.ok(gameSys.runtime.includes("shared/mia-creature-core/creatureEvolutionEngine.js"));
  pass("game system next doc 0049");

  const streamSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.STREAM);
  assert.equal(streamSys.nextDocId, "0088");
  pass("stream system next doc 0049");

  for (const rel of creature.CVE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0048"), "README 0048");
  pass("README registry");

  console.log("\nMaster Canon 0048 contract: ALL PASS");
}

run();
