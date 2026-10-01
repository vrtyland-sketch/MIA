"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const achievement = require("../shared/mia-achievement-core");
const economy = require("../shared/mia-economy-core");
const inventory = require("../shared/mia-inventory-core");
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
  const docPath = path.join(MASTER, "0043-achievement-engine.md");
  const alignPath = path.join(MASTER, "0043-alignment.md");

  assert.ok(fs.existsSync(docPath), "0043-achievement-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0043-alignment.md exists");
  pass("0043 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 25; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0043 section ${i}`);
  }
  assert.ok(doc.includes("Motivation Core"), "0043 critical priority");
  assert.ok(doc.includes("0042"), "0043 links to 0042");
  assert.ok(doc.includes("0044"), "0043 points to 0044");
  pass("0043 structure (25 sections)");

  assert.equal(achievement.AE_COMPONENT_ORDER.length, 12);
  pass("achievement components");

  assert.equal(achievement.AE_CATEGORY_ORDER.length, 9);
  assert.ok(achievement.AE_CATEGORY.LEGENDARY);
  pass("achievement categories");

  const engine = achievement.createAchievementEngine();
  assert.ok(engine.registry().length >= achievement.DEFAULT_ACHIEVEMENT_DEFINITIONS.length);
  pass("achievement registry");

  const conditions = achievement.checkUnlockConditions(
    { condition: { firstGift: true } },
    { firstGift: true }
  );
  assert.equal(conditions.met, true);
  pass("unlock manager");

  const title = achievement.grantTitle({ title: "Battle Master" });
  assert.equal(title.displayInOverlay, true);
  pass("title manager");

  const badge = achievement.assignBadge(achievement.AE_BADGE.CROWN);
  assert.equal(badge.emoji, "👑");
  pass("badge manager");

  const trophy = achievement.assignTrophy("season_master");
  assert.equal(trophy.rarity, achievement.AE_DIFFICULTY.LEGENDARY);
  pass("trophy manager");

  const display = achievement.buildDisplayPlan({
    achievementId: "first_gift",
    name: "První Gift"
  });
  assert.equal(display.speech.shouldSpeak, true);
  assert.equal(display.respectsStreamRules, true);
  pass("display manager");

  const invalid = achievement.validateAchievementUnlock({ duplicate: true, conditionsMet: true });
  assert.equal(invalid.ok, false);
  pass("achievement validator");

  const economyEngine = economy.createEconomyEngine({ initialBalance: 0 });
  const inventoryEngine = inventory.createInventoryEngine();
  inventoryEngine.registerDefinition({
    itemId: "achievement_item",
    name: "Achievement Item",
    type: inventory.IE_ITEM_TYPE.COSMETIC,
    maxStack: 1
  });

  const giftUnlock = engine.processEvent(
    { userId: "katka", stats: { firstGift: true } },
    { economyEngine, inventoryEngine }
  );
  assert.equal(giftUnlock.ok, true);
  assert.ok(giftUnlock.unlocked.some((u) => u.achievementId === achievement.AE_CANON_ACHIEVEMENT.FIRST_GIFT));
  assert.ok(giftUnlock.unlocked[0].reward.title);
  pass("first gift achievement");

  const duplicate = engine.processEvent(
    { userId: "katka", stats: { firstGift: true } },
    { economyEngine, inventoryEngine }
  );
  assert.equal(duplicate.unlocked.length, 0);
  pass("reject duplicate unlock");

  const comments = engine.processEvent({
    userId: "vasa",
    stats: { commentCount: 100 }
  });
  assert.ok(comments.unlocked.some((u) => u.achievementId === achievement.AE_CANON_ACHIEVEMENT.COMMENTS_100));
  pass("comments 100 achievement");

  const itemUnlock = engine.processEvent(
    { userId: "lukas", stats: { firstItem: true } },
    { economyEngine, inventoryEngine }
  );
  const firstItem = itemUnlock.unlocked.find((u) => u.achievementId === achievement.AE_CANON_ACHIEVEMENT.FIRST_ITEM);
  assert.ok(firstItem);
  assert.equal(firstItem.reward.viaEconomy, true);
  pass("item reward via economy");

  const battleEngine = battle.createBattleEngine();
  const started = battleEngine.start({ fromDecision: true, participants: ["katka"] });
  assert.equal(started.ok, true);

  const battleAch = engine.reportBattleEvent(
    {
      userId: "katka",
      winner: "katka",
      firstBattle: true,
      firstVictory: true,
      battleCount: 1
    },
    { economyEngine }
  );
  assert.equal(battleAch.ok, true);
  assert.ok(battleAch.unlocked.some((u) => u.achievementId === achievement.AE_CANON_ACHIEVEMENT.FIRST_BATTLE));
  pass("battle reports to achievement engine");

  const lifecycle = achievement.buildAchievementLifecycle({
    registration: true,
    tracking: true,
    fulfillment: true,
    verification: true,
    reward: true,
    history: true,
    display: true
  });
  assert.equal(lifecycle.lifecycle.length, 7);
  pass("achievement lifecycle pipeline");

  const blocked = engine.processEvent({ userId: "x", stats: {}, mutatesBattleLogic: true });
  assert.equal(blocked.ok, false);
  pass("reject battle logic mutation");

  const blockedItem = achievement.distributeAchievementReward({ createsItemDirectly: true });
  assert.equal(blockedItem.ok, false);
  pass("reject direct item creation");

  assert.equal(achievement.assertAchievementForbiddenActivity("mutate_economy_calculations").ok, false);
  assert.equal(achievement.assertAchievementForbiddenActivity("create_items_outside_economy").ok, false);
  pass("forbidden activities");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  assert.ok(gameSys.runtime.includes("shared/mia-achievement-core/achievementEngine.js"));
  pass("game system next doc 0045");

  const ecoSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.ECONOMY);
  assert.equal(ecoSys.nextDocId, "0088");
  pass("economy system next doc 0045");

  for (const rel of achievement.AE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0043"), "README 0043");
  pass("README registry");

  console.log("\nMaster Canon 0043 contract: ALL PASS");
}

run();
