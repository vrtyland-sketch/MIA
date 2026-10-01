"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const progression = require("../shared/mia-progression-core");
const economy = require("../shared/mia-economy-core");
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
  const docPath = path.join(MASTER, "0042-quest-progression-engine.md");
  const alignPath = path.join(MASTER, "0042-alignment.md");

  assert.ok(fs.existsSync(docPath), "0042-quest-progression-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0042-alignment.md exists");
  pass("0042 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 25; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0042 section ${i}`);
  }
  assert.ok(doc.includes("Progression Core"), "0042 critical priority");
  assert.ok(doc.includes("0041"), "0042 links to 0041");
  assert.ok(doc.includes("0043"), "0042 points to 0043");
  pass("0042 structure (25 sections)");

  assert.equal(progression.QPE_COMPONENT_ORDER.length, 12);
  pass("progression components");

  assert.equal(progression.QPE_QUEST_TYPE_ORDER.length, 6);
  assert.ok(progression.QPE_QUEST_TYPE.DAILY);
  assert.ok(progression.QPE_QUEST_TYPE.COMMUNITY);
  pass("quest types");

  const xp = progression.awardXp("chat");
  assert.equal(xp.xp, 5);
  assert.equal(xp.isEconomyPoints, false);
  assert.notEqual(xp.xp, economy.EE_POINT_RATE.VALID_COMMENT_TO_POINTS);
  pass("xp separate from economy points");

  const level = progression.calculateLevel(150);
  assert.equal(level.level, 2);
  pass("level manager");

  const mission = progression.createMission({ missionId: "chat-20", target: 20, label: "20 zpráv" });
  const done = progression.checkMissionProgress(mission, 20);
  assert.equal(done.complete, true);
  pass("mission manager");

  const season = progression.manageSeason({ seasonId: progression.QPE_SEASON.HALLOWEEN });
  assert.equal(season.seasonId, "halloween");
  pass("season manager");

  const economyEngine = economy.createEconomyEngine({ initialBalance: 0 });
  const reward = progression.distributeReward(
    {
      economyEvent: { event: { type: "battle_reward", points: 25 } }
    },
    { economyEngine }
  );
  assert.equal(reward.viaEconomy, true);
  assert.equal(reward.ok, true);
  pass("reward distributor via economy");

  const blockedReward = progression.distributeReward({ createsItemDirectly: true });
  assert.equal(blockedReward.ok, false);
  pass("reject direct item creation");

  const unlock = progression.unlockFeature({ feature: "new_animation", entityType: progression.QPE_ENTITY_TYPE.KOJNOZROUT });
  assert.equal(unlock.permanent, true);
  pass("unlock manager");

  const community = progression.processCommunityGoal("new_kojnozrout", 100000);
  assert.equal(community.complete, true);
  assert.equal(community.unlock.feature, "new_kojnozrout");
  pass("community progression");

  const koj = progression.processKojProgression({ source: "quest", xp: 120, totalXp: 80 });
  assert.ok(koj.level.level >= 2);
  assert.ok(koj.unlocks.length > 0);
  pass("kojnozrout progression");

  const lifecycle = progression.buildQuestLifecycle({
    creation: true,
    activation: true,
    fulfillment: true,
    check: true,
    reward: true,
    archive: true
  });
  assert.equal(lifecycle.lifecycle.length, 6);
  pass("quest lifecycle pipeline");

  const engine = progression.createProgressionEngine();
  engine.registerMission({
    missionId: "greet-wave",
    target: 3,
    reward: {
      xp: 20,
      economyEvent: { event: { type: "battle_reward", points: 10 } }
    }
  });

  const activity = engine.processActivity(
    { type: "chat", missionId: "greet-wave", delta: 1 },
    { economyEngine }
  );
  assert.equal(activity.ok, true);
  assert.equal(activity.xp, 5);
  assert.equal(activity.economyPointsSeparate, true);
  pass("activity pipeline");

  const missionComplete = engine.processActivity(
    { type: "chat", missionId: "greet-wave", delta: 2 },
    { economyEngine }
  );
  assert.equal(missionComplete.mission.complete, true);
  assert.ok(missionComplete.reward?.viaEconomy);
  pass("mission reward via economy");

  const battleEngine = battle.createBattleEngine();
  const started = battleEngine.start({
    fromDecision: true,
    participants: ["katka", "vasa"]
  });
  assert.equal(started.ok, true);

  const battleProgress = engine.reportBattleOutcome(
    {
      battleId: started.battle.battleId,
      winner: "katka",
      economyEvent: { event: { type: "battle_reward", points: 15 } }
    },
    { economyEngine }
  );
  assert.equal(battleProgress.ok, true);
  assert.equal(battleProgress.controlsBattle, false);
  assert.equal(battleProgress.battleAnnouncedOnly, true);
  pass("battle reports to progression");

  const blocked = engine.processActivity({ type: "chat", mutatesBattleLogic: true });
  assert.equal(blocked.ok, false);
  pass("reject battle logic mutation");

  assert.equal(progression.assertProgressForbiddenActivity("mutate_economy_calculations").ok, false);
  assert.equal(progression.assertProgressForbiddenActivity("create_items_outside_economy").ok, false);
  pass("forbidden activities");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  assert.ok(gameSys.runtime.includes("shared/mia-progression-core/progressionEngine.js"));
  pass("game system next doc 0045");

  const ecoSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.ECONOMY);
  assert.equal(ecoSys.nextDocId, "0088");
  pass("economy system next doc 0045");

  for (const rel of progression.QPE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0042"), "README 0042");
  pass("README registry");

  console.log("\nMaster Canon 0042 contract: ALL PASS");
}

run();
